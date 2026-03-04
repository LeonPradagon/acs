"use client";

import React from "react";
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRAG } from "@/hooks/useRAG";
import { cn } from "@/lib/utils";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
}: DocumentUploadModalProps) {
  const {
    uploadedFiles,
    isUploading,
    uploadProgress,
    uploadError,
    uploadSuccess,
    showUploadSuccess,
    fileInputRef,
    handleFileSelect,
    removeFile,
    uploadDocuments,
  } = useRAG();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Upload className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Upload Dokumen</h2>
                <p className="text-sm text-muted-foreground">
                  Unggah file PDF atau TXT untuk dianalisis
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* File Dropzone / Selection */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]",
                isUploading && "pointer-events-none opacity-50",
              )}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept=".pdf,.txt"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-muted rounded-full">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium">Klik untuk memilih file</p>
                <p className="text-xs text-muted-foreground">
                  PDF atau TXT (Maks. 10MB per file)
                </p>
              </div>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Success Message */}
            {showUploadSuccess && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  File Terpilih ({uploadedFiles.length})
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {uploadedFiles.map((file, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-sm truncate font-medium">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        disabled={isUploading}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mengupload...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-muted/20 flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={uploadDocuments}
              disabled={isUploading || uploadedFiles.length === 0}
              className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 min-w-[140px]"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Mulai Upload
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
