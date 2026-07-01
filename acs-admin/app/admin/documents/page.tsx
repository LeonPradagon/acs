"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminUploadModal } from "@/components/admin/admin-upload-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, FileText, UploadCloud, Trash2, Loader2 } from "lucide-react";

export default function DocumentsManagementPage() {
  const adminInfo = useAdmin();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    adminInfo.fetchDocuments();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
            Manage vector embeddings, document indexes, and view both Public and Private datasets across the enterprise.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={() => setIsUploadModalOpen(true)}
            className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Upload New Document
          </Button>
          <Button
            variant="outline"
            onClick={adminInfo.fetchDocuments}
            disabled={adminInfo.isLoading}
            className="shadow-sm rounded-xl h-10 px-4"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${adminInfo.isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border border-border shadow-sm rounded-2xl bg-card overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <TableRow className="border-border/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider py-4 w-[40%]">Title / Filename</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Visibility & Access</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Vector Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Upload Date</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminInfo.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <span className="text-sm font-medium">Scanning knowledge base...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {adminInfo.documents.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="group hover:bg-muted/30 transition-colors border-border/40"
                    >
                      <TableCell
                        className="font-medium text-sm py-4 max-w-[300px] truncate"
                        title={doc.title}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="truncate">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            doc.visibility.includes("Global")
                              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shadow-sm font-medium"
                              : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 shadow-sm font-medium"
                          }
                        >
                          {doc.visibility}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] tracking-wider uppercase font-bold bg-muted/80 text-muted-foreground"
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Document & Vectors"
                          onClick={() => adminInfo.deleteDocument(doc.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-lg opacity-50 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {adminInfo.documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center text-muted-foreground text-sm">
                        Knowledge Base is currently empty.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isUploadModalOpen && (
        <AdminUploadModal 
          open={isUploadModalOpen} 
          onOpenChange={setIsUploadModalOpen} 
          onSuccess={adminInfo.fetchDocuments} 
        />
      )}
    </div>
  );
}
