import React, { useState, useEffect } from "react";
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
import { ShieldCheck, Loader2 } from "lucide-react";
import { AdminUser } from "@/hooks/useAdmin";

interface UserSecurityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSave: (id: string, clearanceLevel: number, divisionId: string | null) => Promise<boolean>;
}

export function UserSecurityModal({ open, onOpenChange, user, onSave }: UserSecurityModalProps) {
  const [clearanceLevel, setClearanceLevel] = useState<string>("1");
  const [divisionId, setDivisionId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setClearanceLevel(String(user.clearanceLevel || 1));
      // Show division name if available, otherwise fallback to ID
      setDivisionId(user.division?.name || user.divisionId || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const success = await onSave(user.id, parseInt(clearanceLevel), divisionId.trim() || null);
    setIsSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/60 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-md">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>
            Ubah Keamanan Akun
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{user.name || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clearance">Clearance Level (Hak Akses)</Label>
            <Select value={clearanceLevel} onValueChange={setClearanceLevel}>
              <SelectTrigger id="clearance">
                <SelectValue placeholder="Pilih Level Akses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1 - Staff (Mendasar)</SelectItem>
                <SelectItem value="2">Level 2 - Supervisor (Menengah)</SelectItem>
                <SelectItem value="3">Level 3 - Manager (Rahasia)</SelectItem>
                <SelectItem value="4">Level 4 - Direksi (Sangat Rahasia)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Level yang lebih tinggi dapat membaca dokumen dengan level yang lebih rendah.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="division">Nama Divisi (Opsional)</Label>
            <Input 
              id="division" 
              placeholder="Contoh: HRD, FINANCE, IT, atau LEGAL" 
              value={divisionId}
              onChange={(e) => setDivisionId(e.target.value.toUpperCase())}
            />
            <p className="text-[10px] text-muted-foreground">Isi dengan nama divisi. Pengguna hanya dapat mengakses dokumen yang memiliki label divisi yang sama.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Batal</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
