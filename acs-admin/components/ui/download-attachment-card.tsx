import React from "react";
import { Download, FileText, FileSpreadsheet, Presentation, LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface DownloadAttachmentCardProps {
  format: "pdf" | "docx" | "xlsx" | "pptx" | "md" | "csv" | string;
  filename: string;
  base64Payload: string;
}

export function DownloadAttachmentCard({
  format,
  filename,
  base64Payload,
}: DownloadAttachmentCardProps) {
  const handleDownload = () => {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      csv: "text/csv;charset=utf-8",
      md: "text/markdown;charset=utf-8",
    };
    const mimeType = mimeTypes[format.toLowerCase()] || "application/octet-stream";

    try {
      // Properly decode base64 to binary bytes
      const binaryString = atob(base64Payload);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create Blob from binary data (not from data URI)
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[Download Error]", err);
      // Fallback: try data URI if Blob fails
      const dataUri = `data:${mimeType};base64,${base64Payload}`;
      const link = document.createElement("a");
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getIcon = () => {
    switch (format.toLowerCase()) {
      case "pdf":
        return <FileText className="w-8 h-8 text-red-500" />;
      case "docx":
        return <LayoutTemplate className="w-8 h-8 text-blue-500" />;
      case "xlsx":
      case "csv":
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case "pptx":
        return <Presentation className="w-8 h-8 text-orange-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <Card className="flex items-center gap-4 p-4 mt-4 w-fit border border-[#D97757]/20 bg-[#D97757]/5 shadow-sm rounded-xl">
      <div className="bg-white p-2 rounded-lg shadow-sm border">{getIcon()}</div>
      <div className="flex flex-col">
        <span className="font-medium text-sm text-foreground truncate max-w-[200px] mb-1">
          {filename}
        </span>
        <span className="text-xs text-muted-foreground uppercase">{format} Document</span>
      </div>
      <Button
        onClick={handleDownload}
        size="sm"
        className="ml-4 bg-[#D97757] hover:bg-[#C2674A] text-white transition-all shadow-md group"
      >
        <Download className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
        Download
      </Button>
    </Card>
  );
}
