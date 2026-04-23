import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2, X, FileText } from "lucide-react";
import apiClient from "@/lib/api-client";
import { AxiosProgressEvent } from "axios";

interface AdminUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdminUploadModal({ open, onOpenChange, onSuccess }: AdminUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [clearanceLevel, setClearanceLevel] = useState<string>("1");
  const [divisionId, setDivisionId] = useState<string>("");
  const [category, setCategory] = useState<string>("Knowledge Base");
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Pilih minimal 1 file");
      return;
    }

    setIsUploading(true);
    setProgress(10);
    setError("");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      
      formData.append(
        "metadata",
        JSON.stringify({
          category,
          classification: "Internal",
          tags: ["admin-upload"],
          divisionId: divisionId.trim() || null,
          clearanceLevel: parseInt(clearanceLevel),
        })
      );

      const res = await apiClient.post("/api/rag/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        },
      });

      if (res.data.success) {
        setFiles([]);
        setDivisionId("");
        setClearanceLevel("1");
        onSuccess();
        onOpenChange(false);
      } else {
        setError(res.data.error || "Gagal mengupload dokumen");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Gagal mengupload dokumen");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-card border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-md">
              <UploadCloud className="w-5 h-5 text-green-500" />
            </div>
            Upload Dokumen Central
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Pilih Dokumen</Label>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Klik untuk memilih file PDF / TXT / DOCX</p>
              <p className="text-xs text-muted-foreground mt-1">Bisa pilih beberapa file sekaligus</p>
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                className="hidden" 
                accept=".pdf,.txt,.docx,.csv,.xlsx"
                onChange={handleFileChange}
              />
            </div>
            
            {files.length > 0 && (
              <div className="flex flex-col gap-2 mt-2 max-h-32 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex flex-row items-center justify-between text-xs bg-muted/50 p-2 rounded-md border border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                      <span className="truncate max-w-[280px]">{f.name}</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clearanceDoc">Clearance Level Minimum</Label>
            <Select value={clearanceLevel} onValueChange={setClearanceLevel}>
              <SelectTrigger id="clearanceDoc">
                <SelectValue placeholder="Pilih Level Akses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 - Staff (Publik Internal)</SelectItem>
                <SelectItem value="2">Level 2 - Supervisor (Menengah)</SelectItem>
                <SelectItem value="3">Level 3 - Manager (Rahasia)</SelectItem>
                <SelectItem value="4">Level 4 - Direksi (Sangat Rahasia)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Siapa yang boleh membaca dokumen ini?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="divisionDoc">Khusus Divisi (Opsional)</Label>
            <Input 
              id="divisionDoc" 
              placeholder="Misal: HRD, FINANCE, IT" 
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value.toUpperCase())}
            />
            <p className="text-[10px] text-muted-foreground">Kosongkan jika dokumen ini berlaku global (lintas divisi).</p>
          </div>

          {error && <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2 rounded">{error}</p>}
          
          {isUploading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-wider">Uploading... {progress}%</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>Batal</Button>
          <Button onClick={handleUpload} disabled={isUploading || files.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
            Mulai Upload & Indexing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
