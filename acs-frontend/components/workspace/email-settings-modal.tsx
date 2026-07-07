"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Link2,
  Unlink,
  Inbox,
  RefreshCw,
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  Shield,
  Clock,
  Paperclip,
  MailOpen,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmail, EmailMessage } from "@/hooks/useEmail";

interface EmailSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailSettingsModal({ open, onOpenChange }: EmailSettingsModalProps) {
  const email = useEmail();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      email.fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (email.status.connected && open) {
      email.fetchInbox(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email.status.connected, open]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === email.inbox.length
      ? new Set()
      : new Set(email.inbox.map((m) => m.id)));
  };

  const handleImportToRAG = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const result = await email.importToRAG(ids);
    if (result) {
      setImportSuccess(`✅ ${result.imported} email berhasil diimpor ke Knowledge Base`);
      setSelectedIds(new Set());
      setTimeout(() => setImportSuccess(null), 5000);
    }
  };

  const handleImapConnect = async () => {
    if (!loginEmail || !loginPassword) return;
    email.setError(null);
    await email.connectImap(loginEmail, loginPassword);
    if (email.status.connected) {
      setLoginPassword(""); // Clear password from memory
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return `${Math.round(diffMs / 60000)} menit lalu`;
    if (diffHrs < 24) return `${Math.round(diffHrs)} jam lalu`;
    if (diffHrs < 48) return "Kemarin";
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] w-[95vw] md:w-full max-h-[90vh] flex flex-col p-6 bg-card border-border/60 shadow-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-foreground tracking-tight">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            Email Integration
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
          {!email.status.connected ? (
            /* ============================================================
               NOT CONNECTED — Email + Password Login Form
               ============================================================ */
            <div className="h-full flex flex-col items-center justify-center px-8">
              <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-blue-500/70" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Hubungkan Email</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                      Masukkan email dan <strong>App Password</strong> untuk membaca inbox dari ACS.
                    </p>
                  </div>
                </div>

                {/* Login Form */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-input" className="text-xs font-semibold">Email Address</Label>
                    <Input
                      id="email-input"
                      type="email"
                      placeholder="nama@outlook.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-11 rounded-xl border-border/80 focus-visible:ring-blue-500/50"
                      disabled={email.isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-input" className="text-xs font-semibold">App Password</Label>
                    <div className="relative">
                      <Input
                        id="password-input"
                        type={showPassword ? "text" : "password"}
                        placeholder="App password dari akun email"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleImapConnect()}
                        className="h-11 rounded-xl border-border/80 pr-10 focus-visible:ring-blue-500/50"
                        disabled={email.isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleImapConnect}
                    disabled={email.isLoading || !loginEmail || !loginPassword}
                    className="w-full h-11 bg-[#33345c] hover:bg-[#33345c]/90 text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#33345c]/20 transition-all hover:scale-[1.01] active:scale-[0.99] gap-2"
                  >
                    {email.isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    {email.isLoading ? "Menghubungkan..." : "Hubungkan Email"}
                  </Button>
                </div>

                {email.error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-3 leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{email.error}</span>
                  </div>
                )}

                {/* How to get App Password */}
                <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                    Cara Mendapatkan App Password
                  </div>
                  <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                    <p><strong>Outlook/Hotmail:</strong></p>
                    <ol className="list-decimal ml-4 space-y-0.5">
                      <li>Buka <a href="https://account.microsoft.com/security" target="_blank" className="text-blue-500 hover:underline">account.microsoft.com/security</a></li>
                      <li>Aktifkan <strong>Two-factor Authentication</strong></li>
                      <li>Klik <strong>App passwords</strong> → Generate</li>
                      <li>Copy password-nya dan paste di atas</li>
                    </ol>
                    <p className="mt-2"><strong>Gmail:</strong> Buka <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-blue-500 hover:underline">App Passwords</a> (perlu 2FA aktif)</p>
                  </div>
                  <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/70 pt-1 border-t border-border/30">
                    <Shield className="w-3 h-3 shrink-0 mt-0.5" />
                    Password dienkripsi AES-256-GCM · Email di-fetch realtime · Bisa disconnect kapan saja
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================
               CONNECTED — Inbox View with Tabs
               ============================================================ */
            <Tabs defaultValue="inbox" className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <TabsList className="grid grid-cols-2 w-[240px] bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger value="inbox" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs">
                    <Inbox className="w-3.5 h-3.5" /> Inbox
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs">
                    <Link2 className="w-3.5 h-3.5" /> Koneksi
                  </TabsTrigger>
                </TabsList>
                <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/5 text-[10px] font-semibold gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {email.status.email}
                </Badge>
              </div>

              {/* === INBOX TAB === */}
              <TabsContent value="inbox" className="m-0 flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
                {email.selectedMessage ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Button variant="ghost" size="sm" onClick={() => email.setSelectedMessage(null)} className="gap-1.5 text-xs h-8">
                        <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                      </Button>
                    </div>
                    <div className="border border-border/50 rounded-xl bg-background/50 p-5 flex-1 overflow-auto custom-scrollbar">
                      <h3 className="font-bold text-lg text-foreground leading-tight">
                        {email.selectedMessage.subject || "(No Subject)"}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{email.selectedMessage.from}</span>
                        <span>·</span>
                        <span>{formatDate(email.selectedMessage.receivedAt)}</span>
                      </div>
                      <div className="h-px bg-border my-4" />
                      <div
                        className="prose prose-sm max-w-none text-foreground/90 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: email.selectedMessage.bodyType === "html"
                            ? email.selectedMessage.body
                            : `<pre style="white-space:pre-wrap;font-family:inherit">${email.selectedMessage.body}</pre>`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIds.size > 0 && selectedIds.size === email.inbox.length}
                          onCheckedChange={toggleSelectAll}
                          className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                        />
                        <span className="text-xs text-muted-foreground">
                          {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : `${email.inbox.length} email`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                          <Button size="sm" onClick={handleImportToRAG} disabled={email.isLoading}
                            className="h-7 text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white gap-1.5 rounded-lg shadow-sm">
                            <Download className="w-3 h-3" /> Import ke Knowledge Base ({selectedIds.size})
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => email.fetchInbox(1)} disabled={email.isLoading}
                          className="h-7 text-[10px] gap-1.5 rounded-lg">
                          <RefreshCw className={cn("w-3 h-3", email.isLoading && "animate-spin")} /> Refresh
                        </Button>
                      </div>
                    </div>

                    {importSuccess && (
                      <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/5 border border-green-500/20 rounded-lg p-2.5 mb-2 animate-in fade-in duration-300">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {importSuccess}
                      </div>
                    )}

                    {email.error && (
                      <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-2.5 mb-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {email.error}
                        <button onClick={() => email.setError(null)} className="ml-auto text-muted-foreground hover:text-foreground">✕</button>
                      </div>
                    )}

                    <ScrollArea className="flex-1 border border-border/50 rounded-xl bg-background/50">
                      <div className="divide-y divide-border/30">
                        {email.inbox.map((msg) => (
                          <div key={msg.id} className={cn(
                            "flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer group",
                            !msg.isRead && "bg-blue-500/[0.02]",
                          )}>
                            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                              <Checkbox checked={selectedIds.has(msg.id)} onCheckedChange={() => toggleSelect(msg.id)}
                                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => email.readMessage(msg.id)}>
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn("text-xs truncate", !msg.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                                  {msg.from}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {msg.hasAttachments && <Paperclip className="w-3 h-3 text-muted-foreground/50" />}
                                  <span className="text-[10px] text-muted-foreground/60 font-mono">{formatDate(msg.receivedAt)}</span>
                                </div>
                              </div>
                              <div className={cn("text-xs mt-0.5 truncate", !msg.isRead ? "font-semibold text-foreground/90" : "text-foreground/70")}>
                                {msg.subject || "(No Subject)"}
                              </div>
                              {msg.preview && (
                                <div className="text-[11px] text-muted-foreground/60 mt-0.5 truncate leading-relaxed">{msg.preview}</div>
                              )}
                            </div>
                            {!msg.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                          </div>
                        ))}

                        {email.inbox.length === 0 && !email.isLoading && (
                          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                            <MailOpen className="w-10 h-10 mb-3 opacity-30" />
                            <p className="text-sm font-medium">Inbox kosong</p>
                          </div>
                        )}

                        {email.isLoading && email.inbox.length === 0 && (
                          <div className="flex items-center justify-center py-16">
                            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                          </div>
                        )}
                      </div>

                      {email.hasMore && (
                        <div className="p-3 flex justify-center">
                          <Button variant="ghost" size="sm" onClick={() => email.fetchInbox(email.currentPage + 1)} disabled={email.isLoading} className="text-xs text-muted-foreground">
                            Muat lebih banyak
                          </Button>
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </TabsContent>

              {/* === CONNECTION SETTINGS TAB === */}
              <TabsContent value="settings" className="m-0 flex-1 flex flex-col animate-in fade-in duration-300">
                <div className="space-y-5">
                  <div className="border border-border/50 rounded-xl bg-background/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-500/70" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground capitalize">
                            {email.status.provider === "imap" ? "IMAP Connection" : "Microsoft OAuth"}
                          </p>
                          <p className="text-xs text-muted-foreground">{email.status.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/5 text-[10px]">Connected</Badge>
                    </div>

                    <div className="h-px bg-border/50" />

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Terhubung sejak</span>
                        <p className="font-medium text-foreground mt-0.5">
                          {email.status.connectedAt ? new Date(email.status.connectedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sinkronisasi terakhir</span>
                        <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {email.status.lastSyncAt ? formatDate(email.status.lastSyncAt) : "Belum pernah"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/20 border border-border/40 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
                    <Shield className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <span>Kredensial dienkripsi dengan <strong>AES-256-GCM</strong>. Email hanya diambil secara realtime — tidak disimpan kecuali Anda mengimpornya ke Knowledge Base.</span>
                  </div>

                  <div className="border border-destructive/20 rounded-xl p-4 flex items-center justify-between bg-destructive/[0.02]">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Putuskan Koneksi</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Semua kredensial tersimpan akan dihapus.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={email.disconnectEmail} disabled={email.isLoading}
                      className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground gap-1.5 rounded-lg">
                      <Unlink className="w-3.5 h-3.5" /> Disconnect
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
