import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  FileText,
  Settings,
  ShieldAlert,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/hooks/useAdmin";

interface AdminSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminSettingsModal({
  open,
  onOpenChange,
}: AdminSettingsModalProps) {
  const adminInfo = useAdmin();

  // Memuat data secara otomatis saat Modal Panel berstatus 'terbuka'
  useEffect(() => {
    if (open) {
      adminInfo.fetchUsers();
      adminInfo.fetchDocuments();
    }
  }, [open, adminInfo.fetchUsers, adminInfo.fetchDocuments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] h-[85vh] flex flex-col p-6 bg-card border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-foreground tracking-tight">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-500" />
            </div>
            Admin Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-2">
          <Tabs defaultValue="users" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-muted/60 p-1 rounded-xl">
              <TabsTrigger
                value="users"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                <Users className="w-4 h-4" /> Users
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                <FileText className="w-4 h-4" /> Documents
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                <Settings className="w-4 h-4" /> System
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-5 flex flex-col">
              {/* === TAB MANAJEMEN PENGGUNA === */}
              <TabsContent
                value="users"
                className="m-0 h-full flex flex-col animate-in fade-in duration-300"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground tracking-tight">
                      User Management
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pantau pengguna dan kendalikan hak akses admin.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={adminInfo.fetchUsers}
                    disabled={adminInfo.isLoading}
                    className="shadow-sm"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 mr-2 ${adminInfo.isLoading ? "animate-spin" : ""}`}
                    />{" "}
                    Refresh
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border border-border/50 rounded-xl bg-background/50 shadow-inner custom-scrollbar relative">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">
                          Email
                        </TableHead>
                        <TableHead className="font-semibold text-xs">
                          Name
                        </TableHead>
                        <TableHead className="font-semibold text-xs">
                          Role
                        </TableHead>
                        <TableHead className="font-semibold text-xs">
                          Joined
                        </TableHead>
                        <TableHead className="text-right font-semibold text-xs">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminInfo.users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="group hover:bg-muted/20 transition-colors"
                        >
                          <TableCell className="font-medium text-xs">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-xs">
                            {user.name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "admin" ? "default" : "secondary"
                              }
                              className={
                                user.role === "admin"
                                  ? "bg-indigo-500 hover:bg-indigo-600 shadow-sm"
                                  : ""
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            {user.role !== "admin" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  adminInfo.updateUserRole(user.id, "admin")
                                }
                                className="h-7 text-[10px] border-indigo-500/30 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all"
                              >
                                <ShieldAlert className="w-3 h-3 mr-1" /> Jadi
                                Admin
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  adminInfo.updateUserRole(user.id, "user")
                                }
                                className="h-7 text-[10px] border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-white transition-all"
                              >
                                Cabut Akses
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hapus Akun"
                              onClick={() => adminInfo.deleteUser(user.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {adminInfo.users.length === 0 && !adminInfo.isLoading && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="h-32 text-center text-muted-foreground"
                          >
                            Tidak ada pengguna yang terdaftar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* === TAB MANAJEMEN DOKUMEN === */}
              <TabsContent
                value="documents"
                className="m-0 h-full flex flex-col animate-in fade-in duration-300"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground tracking-tight">
                      Knowledge Base
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Kelola seluruh indeks dokumen, baik Publik maupun Privat
                      (Email).
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={adminInfo.fetchDocuments}
                    disabled={adminInfo.isLoading}
                    className="shadow-sm"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 mr-2 ${adminInfo.isLoading ? "animate-spin" : ""}`}
                    />{" "}
                    Refresh
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border border-border/50 rounded-xl bg-background/50 shadow-inner custom-scrollbar relative">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                      <TableRow>
                        <TableHead className="font-semibold text-xs w-[35%]">
                          Title
                        </TableHead>
                        <TableHead className="font-semibold text-xs">
                          Visibilitas
                        </TableHead>
                        <TableHead className="font-semibold text-xs">
                          Status Rektor
                        </TableHead>
                        <TableHead className="font-semibold text-xs">
                          Tanggal Unggah
                        </TableHead>
                        <TableHead className="text-right font-semibold text-xs">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminInfo.documents.map((doc) => (
                        <TableRow
                          key={doc.id}
                          className="group hover:bg-muted/20 transition-colors"
                        >
                          <TableCell
                            className="font-medium text-xs max-w-[200px] truncate"
                            title={doc.title}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-blue-500/70 shrink-0" />
                              <span className="truncate">{doc.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                doc.visibility.includes("Global")
                                  ? "border-green-500 text-green-600 bg-green-500/5 shadow-sm"
                                  : "border-amber-500 text-amber-600 bg-amber-500/5 shadow-sm"
                              }
                            >
                              {doc.visibility}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-[9px] tracking-wider uppercase font-semibold"
                            >
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hapus Dokumen (Sistem & Vektor)"
                              onClick={() => adminInfo.deleteDocument(doc.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-md opacity-50 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {adminInfo.documents.length === 0 &&
                        !adminInfo.isLoading && (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-32 text-center text-muted-foreground"
                            >
                              Pangkalan Data masih kosong.
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* === TAB PENGATURAN SISTEM (Masa Depan) === */}
              <TabsContent
                value="system"
                className="m-0 h-full flex flex-col animate-in fade-in duration-300"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground tracking-tight">
                      System Behavior
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Konfigurasi batas LLM & Integrasi Eksternal (Placeholder).
                    </p>
                  </div>

                  <div className="flex items-center justify-center flex-1 border-2 border-dashed border-border/60 rounded-xl bg-muted/10 text-muted-foreground/60 text-sm flex-col gap-4 min-h-[300px]">
                    <Settings className="w-12 h-12 opacity-20 animate-[spin_10s_linear_infinite]" />
                    <p className="font-medium">
                      Tahap Integrasi Database & Email Eksternal Belum Aktif
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
