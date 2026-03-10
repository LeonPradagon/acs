import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { env } from "../common/env";
const PDFParser = require("pdf2json");

/**
 * Service to handle intelligent document extraction.
 * Implements a Hybrid Strategy: LlamaParse (Primary) -> Tika (Secondary) -> Local Libraries (Fallback).
 */
export class DocumentExtractorService {
  /**
   * Primary Extractor: LlamaParse API
   * Highly accurate for tables and complex layouts. Converts directly to Markdown.
   */
  static async extractWithLlamaParse(filePath: string): Promise<string> {
    const apiKey = process.env.LLAMAPARSE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "LLAMAPARSE_API_KEY is not defined in environment variables.",
      );
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    try {
      console.log(`[LlamaParse] Sending ${filePath} for extraction...`);
      const response = await axios.post(
        "https://api.cloud.llamaindex.ai/api/parsing/upload",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );

      // LlamaParse returns a job ID. We have to poll for the result.
      const jobId = response.data.id;

      let status = "PENDING";
      let retries = 0;
      const maxRetries = 60; // 2 minutes max (60 * 2000ms)

      while (status !== "SUCCESS" && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const statusRes = await axios.get(
          `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );

        status = statusRes.data.status;
        if (status === "ERROR") {
          throw new Error("LlamaParse job failed with status ERROR");
        }
        retries++;
      }

      if (status !== "SUCCESS") {
        throw new Error("LlamaParse timed out waiting for result.");
      }

      // Fetch the markdown result
      const resultRes = await axios.get(
        `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );

      console.log(`[LlamaParse] Extraction successful for ${filePath}`);
      return resultRes.data.markdown;
    } catch (error: any) {
      console.error(
        "[LlamaParse] API Error:",
        error.response?.data || error.message,
      );
      throw new Error(`LlamaParse extraction failed: ${error.message}`);
    }
  }

  /**
   * Fallback for Word Documents (.docx) using Mammoth.
   */
  static async extractWithMammoth(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error: any) {
      console.error("[Mammoth] Extraction Error:", error.message);
      throw new Error(`Mammoth extraction failed: ${error.message}`);
    }
  }

  /**
   * Fallback for Excel and CSV using XLSX library.
   */
  static async extractWithXlsx(filePath: string): Promise<string> {
    try {
      const workbook = XLSX.readFile(filePath);
      let fullContent = "";

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const markdown = XLSX.utils.sheet_to_csv(worksheet);
        fullContent += `### Sheet: ${sheetName}\n\n${markdown}\n\n`;
      });

      return fullContent;
    } catch (error: any) {
      console.error("[XLSX] Extraction Error:", error.message);
      throw new Error(`XLSX extraction failed: ${error.message}`);
    }
  }

  /**
   * Fallback Extractor: pdf2json (Local)
   * Heuristic row-stitching algorithm to preserve basic table structure.
   */
  static async extractWithPdf2Json(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();

      pdfParser.on("pdfParser_dataError", (errData: any) =>
        reject(new Error(errData.parserError)),
      );

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        try {
          let fullText = "";

          pdfData.formImage.Pages.forEach((page: any, pageIndex: number) => {
            // Group texts by their Y coordinate (row)
            const rows: { [y: string]: any[] } = {};

            page.Texts.forEach((text: any) => {
              // Round Y to nearest 0.5 to group slightly misaligned text on same line
              const y = Math.round(text.y * 2) / 2;
              if (!rows[y]) rows[y] = [];
              rows[y].push(text);
            });

            // Iterate over sorted rows
            const sortedY = Object.keys(rows)
              .map(Number)
              .sort((a, b) => a - b);

            sortedY.forEach((y) => {
              const rowTexts = rows[y];
              // Sort texts in a row by X coordinate (column left-to-right)
              rowTexts.sort((a, b) => a.x - b.x);

              let rowString = "";
              let lastX = 0;

              rowTexts.forEach((rt) => {
                // Decode URI component (pdf2json encodes text)
                const decodedText = decodeURIComponent(rt.R[0].T);

                // If there is a significant gap between X coordinates, treat as column boundary
                if (lastX > 0 && rt.x - lastX > 3) {
                  rowString += " | ";
                } else if (lastX > 0 && rt.x - lastX > 0.5) {
                  rowString += " "; // Normal space
                }

                rowString += decodedText;
                // Update lastX to the end of this text block approximately
                lastX = rt.x + (rt.w || 0); // w is width, might not always perfectly align but close enough
              });

              // Apply basic markdown formatting if it looks like a table row (contains |)
              if (rowString.includes(" | ")) {
                fullText += `| ${rowString} |\n`;
              } else {
                fullText += `${rowString}\n`;
              }
            });

            fullText += `\n--- [Page ${pageIndex + 1}] ---\n\n`;
          });

          console.log(`[PDF2JSON] Local extraction successful for ${filePath}`);
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      });

      pdfParser.loadPDF(filePath);
    });
  }

  /**
   * Secondary Extractor: Apache Tika (Local API)
   * Excellent for almost all document types. Self-hosted and unlimited.
   */
  static async extractWithTika(
    filePath: string,
    mimetype: string,
  ): Promise<string> {
    const tikaUrl = env.TIKA_URL;

    try {
      console.log(`[Tika] Sending ${filePath} for extraction...`);
      const fileStream = fs.createReadStream(filePath);

      const response = await axios.put(`${tikaUrl}/tika`, fileStream, {
        headers: {
          Accept: "text/plain",
          "Content-Type": mimetype || "application/octet-stream",
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log(`[Tika] Extraction successful for ${filePath}`);
      // Remove empty lines and normalize whitespace slightly
      return response.data.replace(/\n\s*\n/g, "\n\n").trim();
    } catch (error: any) {
      console.error("[Tika] API Error:", error.message);
      throw new Error(`Tika extraction failed: ${error.message}`);
    }
  }

  /**
   * Ultimate Hybrid Extractor
   * Tries LlamaParse -> Tika -> local fallback -> raw text format
   */
  static async extractHybrid(
    filePath: string,
    mimetype: string,
  ): Promise<string> {
    // 1. Always try LlamaParse first for high quality markdown (supports PDF, Docx, Xlsx, CSV etc)
    const apiKey = process.env.LLAMAPARSE_API_KEY;
    if (apiKey) {
      try {
        return await this.extractWithLlamaParse(filePath);
      } catch (err: any) {
        console.warn(
          `[Extractor] LlamaParse failed: ${err.message}. Switching to local fallback...`,
        );
      }
    }

    // 2. Try Apache Tika (if available) before local NodeJS fallbacks
    try {
      // Check if Tika is up quickly
      await axios.get(env.TIKA_URL, { timeout: 1000 }).catch(() => {
        throw new Error("Tika service not reachable");
      });
      return await this.extractWithTika(filePath, mimetype);
    } catch (tikaErr: any) {
      console.warn(
        `[Extractor] Tika fallback failed or unavailable: ${tikaErr.message}. Switching to local NodeJS fallback...`,
      );
    }

    // 3. Local NodeJS Fallbacks based on MIME type
    try {
      if (mimetype === "application/pdf") {
        return await this.extractWithPdf2Json(filePath);
      } else if (
        mimetype ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimetype === "application/msword" ||
        filePath.endsWith(".docx")
      ) {
        return await this.extractWithMammoth(filePath);
      } else if (
        mimetype === "application/vnd.ms-excel" ||
        mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimetype === "text/csv" ||
        filePath.endsWith(".csv") ||
        filePath.endsWith(".xlsx") ||
        filePath.endsWith(".xls")
      ) {
        return await this.extractWithXlsx(filePath);
      } else {
        // For .txt or other formats, just read as UTF-8
        let content = await fs.promises.readFile(filePath, "utf-8");
        return content.replace(/\0/g, ""); // remove null bytes
      }
    } catch (fallbackError: any) {
      console.error(
        `[Extractor] Local fallback failed for ${filePath}:`,
        fallbackError.message,
      );
      return `[Content extraction failed for ${filePath}]`;
    }
  }
}
