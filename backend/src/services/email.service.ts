import { ImapFlow } from "imapflow";
import { simpleParser, ParsedMail } from "mailparser";
import crypto from "crypto";
import { env } from "../common/env";
import { prisma } from "../config/db";
import { documentQueue } from "../config/queue";

// ============================================================
// Token Encryption (AES-256-GCM)
// ============================================================

interface ImapCredentials {
  email: string;
  password: string; // App password for Outlook
  host: string;
  port: number;
}

interface EmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

type StoredCredentials =
  | { type: "imap"; imap: ImapCredentials }
  | { type: "oauth"; oauth: EmailTokens };

function encrypt(plaintext: string): string {
  if (!env.EMAIL_ENCRYPTION_KEY) {
    throw new Error("EMAIL_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(env.EMAIL_ENCRYPTION_KEY, "hex");
  if (key.length !== 32) {
    throw new Error("EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  if (!env.EMAIL_ENCRYPTION_KEY) {
    throw new Error("EMAIL_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(env.EMAIL_ENCRYPTION_KEY, "hex");
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted token format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ============================================================
// IMAP Provider Presets
// ============================================================

const IMAP_PRESETS: Record<string, { host: string; port: number }> = {
  "outlook.com":  { host: "outlook.office365.com", port: 993 },
  "hotmail.com":  { host: "outlook.office365.com", port: 993 },
  "live.com":     { host: "outlook.office365.com", port: 993 },
  "office365.com":{ host: "outlook.office365.com", port: 993 },
  "gmail.com":    { host: "imap.gmail.com",        port: 993 },
  "yahoo.com":    { host: "imap.mail.yahoo.com",   port: 993 },
};

function getImapConfig(email: string): { host: string; port: number } {
  const domain = email.split("@")[1]?.toLowerCase();
  return IMAP_PRESETS[domain] || { host: `imap.${domain}`, port: 993 };
}

// ============================================================
// Microsoft OAuth2 (kept for future use)
// ============================================================

const MICROSOFT_AUTHORITY = `https://login.microsoftonline.com/${env.MICROSOFT_TENANT_ID}`;
const MICROSOFT_SCOPES = ["openid", "profile", "email", "offline_access", "Mail.Read"];

// ============================================================
// Email Service — Unified (IMAP + OAuth)
// ============================================================

export class EmailService {

  /** Check if OAuth integration is configured */
  static get isOAuthConfigured(): boolean {
    return !!(env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET && env.EMAIL_ENCRYPTION_KEY);
  }

  /** Check if IMAP (basic) integration is possible */
  static get isImapConfigured(): boolean {
    return !!env.EMAIL_ENCRYPTION_KEY;
  }

  // ============================================================
  // IMAP Connection (No Azure AD needed!)
  // ============================================================

  /**
   * Connect via IMAP using email + app password.
   * Works immediately without any Azure or cloud setup.
   */
  static async connectImap(
    userId: string,
    email: string,
    password: string,
  ): Promise<{ email: string }> {
    if (!env.EMAIL_ENCRYPTION_KEY) {
      throw new Error("EMAIL_ENCRYPTION_KEY is not configured on the server");
    }

    const imapConfig = getImapConfig(email);

    // Test connection first
    const client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
    });

    try {
      await client.connect();
      await client.logout();
    } catch (err: any) {
      console.error("[Email IMAP] Connection test failed:", err.message);
      if (err.message?.includes("AUTHENTICATE")) {
        throw new Error("Login gagal. Untuk Outlook, gunakan App Password (bukan password biasa). Aktifkan 2FA dulu di account.microsoft.com, lalu buat App Password.");
      }
      throw new Error(`Gagal terhubung ke ${imapConfig.host}: ${err.message}`);
    }

    // Encrypt and store credentials
    const credentials: StoredCredentials = {
      type: "imap",
      imap: { email, password, host: imapConfig.host, port: imapConfig.port },
    };

    const encryptedTokens = encrypt(JSON.stringify(credentials));

    await prisma.emailConnection.upsert({
      where: { userId },
      create: {
        userId,
        provider: "imap",
        encryptedTokens,
        email,
        scopes: ["INBOX"],
        status: "active",
      },
      update: {
        provider: "imap",
        encryptedTokens,
        email,
        scopes: ["INBOX"],
        status: "active",
        connectedAt: new Date(),
      },
    });

    console.log(`[Email IMAP] Connected ${email} for user ${userId}`);
    return { email };
  }

  /**
   * Create an ImapFlow client from stored credentials.
   */
  private static async getImapClient(userId: string): Promise<{ client: ImapFlow; email: string }> {
    const connection = await prisma.emailConnection.findUnique({ where: { userId } });
    if (!connection || connection.status === "revoked") {
      throw new Error("Email not connected. Please connect your email first.");
    }

    const stored: StoredCredentials = JSON.parse(decrypt(connection.encryptedTokens));
    if (stored.type !== "imap") {
      throw new Error("This connection uses OAuth. Please use the OAuth flow.");
    }

    const client = new ImapFlow({
      host: stored.imap.host,
      port: stored.imap.port,
      secure: true,
      auth: { user: stored.imap.email, pass: stored.imap.password },
      logger: false,
    });

    return { client, email: stored.imap.email };
  }

  // ============================================================
  // OAuth Flow (Azure AD — future use)
  // ============================================================

  static generateAuthUrl(userId: string): string {
    if (!this.isOAuthConfigured) {
      throw new Error("OAuth is not configured. Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and EMAIL_ENCRYPTION_KEY.");
    }
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      response_mode: "query",
      scope: MICROSOFT_SCOPES.join(" "),
      state: userId,
      prompt: "consent",
    });
    return `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(code: string, userId: string): Promise<{ email: string }> {
    const tokenUrl = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code,
      redirect_uri: env.MICROSOFT_REDIRECT_URI,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES.join(" "),
    });
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Email OAuth] Token exchange failed:", errorData);
      throw new Error(`Microsoft token exchange failed: ${response.statusText}`);
    }
    const data = await response.json();
    const userEmail = await this.fetchUserEmailOAuth(data.access_token);
    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
    const credentials: StoredCredentials = {
      type: "oauth",
      oauth: { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt },
    };
    const encryptedTokens = encrypt(JSON.stringify(credentials));
    await prisma.emailConnection.upsert({
      where: { userId },
      create: { userId, provider: "microsoft", encryptedTokens, email: userEmail, scopes: MICROSOFT_SCOPES, status: "active" },
      update: { provider: "microsoft", encryptedTokens, email: userEmail, scopes: MICROSOFT_SCOPES, status: "active", connectedAt: new Date() },
    });
    console.log(`[Email OAuth] Connected ${userEmail} for user ${userId}`);
    return { email: userEmail };
  }

  private static async fetchUserEmailOAuth(accessToken: string): Promise<string> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error("Failed to fetch user profile from Microsoft Graph");
    const profile = await response.json();
    return profile.mail || profile.userPrincipalName || "unknown@outlook.com";
  }

  // ============================================================
  // Unified Email Operations (auto-detect IMAP vs OAuth)
  // ============================================================

  /**
   * Fetch inbox — works for both IMAP and OAuth connections.
   */
  static async getInbox(userId: string, page: number = 1, limit: number = 20) {
    const connection = await prisma.emailConnection.findUnique({ where: { userId } });
    if (!connection) throw new Error("Email not connected");

    const stored: StoredCredentials = JSON.parse(decrypt(connection.encryptedTokens));

    if (stored.type === "imap") {
      return this.getInboxImap(userId, page, limit);
    } else {
      return this.getInboxOAuth(userId, page, limit);
    }
  }

  /**
   * Read specific message — works for both IMAP and OAuth.
   */
  static async getMessage(userId: string, messageId: string) {
    const connection = await prisma.emailConnection.findUnique({ where: { userId } });
    if (!connection) throw new Error("Email not connected");

    const stored: StoredCredentials = JSON.parse(decrypt(connection.encryptedTokens));

    if (stored.type === "imap") {
      return this.getMessageImap(userId, parseInt(messageId));
    } else {
      return this.getMessageOAuth(userId, messageId);
    }
  }

  // ============================================================
  // IMAP Email Operations
  // ============================================================

  private static async getInboxImap(userId: string, page: number, limit: number) {
    const { client } = await this.getImapClient(userId);

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        const totalMessages = (client.mailbox && typeof client.mailbox === "object") ? client.mailbox.exists : 0;
        const start = Math.max(1, totalMessages - (page * limit) + 1);
        const end = Math.max(1, totalMessages - ((page - 1) * limit));

        if (start > end || totalMessages === 0) {
          return { messages: [], hasMore: false };
        }

        const range = `${start}:${end}`;
        const messages: any[] = [];

        for await (const msg of client.fetch(range, {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
        })) {
          messages.push({
            id: String(msg.uid),
            subject: msg.envelope?.subject || "(No Subject)",
            from: msg.envelope?.from?.[0]?.name || msg.envelope?.from?.[0]?.address || "Unknown",
            fromEmail: msg.envelope?.from?.[0]?.address || "",
            receivedAt: msg.envelope?.date?.toISOString() || new Date().toISOString(),
            preview: "", // IMAP doesn't give preview without fetching body
            isRead: msg.flags?.has("\\Seen") || false,
            hasAttachments: !!(msg.bodyStructure as any)?.childNodes?.length,
          });
        }

        // Reverse to show newest first
        messages.reverse();

        // Update lastSyncAt
        await prisma.emailConnection.update({
          where: { userId },
          data: { lastSyncAt: new Date() },
        });

        return {
          messages,
          hasMore: start > 1,
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  private static async getMessageImap(userId: string, uid: number) {
    const { client } = await this.getImapClient(userId);

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        const rawMessage = await client.download(String(uid), undefined, { uid: true });
        
        if (!rawMessage || !rawMessage.content) {
          throw new Error("Email message not found");
        }

        const parsed: ParsedMail = await simpleParser(rawMessage.content);

        return {
          id: String(uid),
          subject: parsed.subject || "(No Subject)",
          from: parsed.from?.text || "Unknown",
          fromEmail: parsed.from?.value?.[0]?.address || "",
          to: (parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : []).flatMap(
            (addr) => addr.value.map((v) => ({ name: v.name || "", email: v.address || "" }))
          ),
          receivedAt: parsed.date?.toISOString() || new Date().toISOString(),
          body: parsed.html || parsed.textAsHtml || parsed.text || "",
          bodyType: parsed.html ? "html" : "text",
          isRead: true,
          hasAttachments: (parsed.attachments?.length || 0) > 0,
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  // ============================================================
  // OAuth Email Operations (Microsoft Graph API)
  // ============================================================

  private static async getValidOAuthToken(userId: string): Promise<string> {
    const connection = await prisma.emailConnection.findUnique({ where: { userId } });
    if (!connection || connection.status === "revoked") throw new Error("Email not connected");
    const stored: StoredCredentials = JSON.parse(decrypt(connection.encryptedTokens));
    if (stored.type !== "oauth") throw new Error("Not an OAuth connection");

    const expiresAt = new Date(stored.oauth.expiresAt);
    if (expiresAt.getTime() - 5 * 60 * 1000 > Date.now()) return stored.oauth.accessToken;

    // Refresh
    const tokenUrl = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      refresh_token: stored.oauth.refreshToken,
      grant_type: "refresh_token",
      scope: MICROSOFT_SCOPES.join(" "),
    });
    const response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
    if (!response.ok) {
      await prisma.emailConnection.update({ where: { userId }, data: { status: "expired" } });
      throw new Error("Email session expired. Please reconnect.");
    }
    const data = await response.json();
    const newCreds: StoredCredentials = {
      type: "oauth",
      oauth: { accessToken: data.access_token, refreshToken: data.refresh_token || stored.oauth.refreshToken, expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString() },
    };
    await prisma.emailConnection.update({ where: { userId }, data: { encryptedTokens: encrypt(JSON.stringify(newCreds)), status: "active" } });
    return data.access_token;
  }

  private static async getInboxOAuth(userId: string, page: number, limit: number) {
    const accessToken = await this.getValidOAuthToken(userId);
    const skip = (page - 1) * limit;
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$skip=${skip}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error("Failed to fetch inbox");
    const data = await response.json();
    await prisma.emailConnection.update({ where: { userId }, data: { lastSyncAt: new Date() } });
    return {
      messages: (data.value || []).map((msg: any) => ({
        id: msg.id,
        subject: msg.subject,
        from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || "Unknown",
        fromEmail: msg.from?.emailAddress?.address || "",
        receivedAt: msg.receivedDateTime,
        preview: msg.bodyPreview,
        isRead: msg.isRead,
        hasAttachments: msg.hasAttachments,
      })),
      hasMore: !!data["@odata.nextLink"],
    };
  }

  private static async getMessageOAuth(userId: string, messageId: string) {
    const accessToken = await this.getValidOAuthToken(userId);
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=id,subject,from,toRecipients,receivedDateTime,body,isRead,hasAttachments`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error("Failed to read email message");
    const msg = await response.json();
    return {
      id: msg.id, subject: msg.subject,
      from: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || "Unknown",
      fromEmail: msg.from?.emailAddress?.address || "",
      to: (msg.toRecipients || []).map((r: any) => ({ name: r.emailAddress?.name || "", email: r.emailAddress?.address || "" })),
      receivedAt: msg.receivedDateTime,
      body: msg.body?.content || "", bodyType: msg.body?.contentType || "text",
      isRead: msg.isRead, hasAttachments: msg.hasAttachments,
    };
  }

  // ============================================================
  // Status & Disconnect (shared)
  // ============================================================

  static async getStatus(userId: string) {
    const connection = await prisma.emailConnection.findUnique({
      where: { userId },
      select: { email: true, provider: true, status: true, connectedAt: true, lastSyncAt: true, scopes: true },
    });
    if (!connection) return { connected: false };
    return {
      connected: connection.status === "active",
      email: connection.email,
      provider: connection.provider,
      status: connection.status,
      connectedAt: connection.connectedAt,
      lastSyncAt: connection.lastSyncAt,
      scopes: connection.scopes,
    };
  }

  static async disconnect(userId: string) {
    const connection = await prisma.emailConnection.findUnique({ where: { userId } });
    if (!connection) throw new Error("No email connection found");
    await prisma.emailConnection.delete({ where: { userId } });
    console.log(`[Email] Disconnected for user ${userId}`);
    return { disconnected: true };
  }

  // ============================================================
  // Email → RAG Import (Privacy-Isolated, works for both modes)
  // ============================================================

  static async importEmailToRAG(userId: string, messageIds: string[]): Promise<{ imported: number }> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { divisionId: true }});
    let imported = 0;
    for (const messageId of messageIds) {
      try {
        const msg = await this.getMessage(userId, messageId);

        let bodyText = msg.body;
        if (msg.bodyType === "html") {
          bodyText = bodyText.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
        }

        const title = `📧 ${msg.subject || "No Subject"} — ${msg.fromEmail || "Unknown"}`;
        const content = [
          `Subject: ${msg.subject}`,
          `From: ${msg.from} <${msg.fromEmail}>`,
          `Date: ${msg.receivedAt}`,
          "",
          bodyText,
        ].join("\n");

        const doc = await prisma.document.create({
          data: {
            title, content,
            category: "email",
            classification: "private",
            tags: ["email", "imported"],
            metadata: { emailMessageId: messageId, source: "email", importedAt: new Date().toISOString() },
            userId,
            divisionId: user?.divisionId || null,
            clearanceLevel: 1,
            status: "PENDING",
          },
        });
        
        // Push to embedding worker
        await documentQueue.add("extract-document", {
          documentId: doc.id,
          skipExtraction: true,
          originalname: `Email: ${msg.subject || messageId}`,
        });
        
        imported++;
      } catch (err: any) {
        console.warn(`[Email→RAG] Failed to import ${messageId}:`, err.message);
      }
    }
    console.log(`[Email→RAG] Imported ${imported}/${messageIds.length} for user ${userId}`);
    return { imported };
  }
}
