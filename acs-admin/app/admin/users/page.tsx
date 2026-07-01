"use client";

import React, { useEffect, useState } from "react";
import { useAdmin, AdminUser } from "@/hooks/useAdmin";
import { UserSecurityModal } from "@/components/admin/user-security-modal";
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
import { RefreshCw, ShieldAlert, ShieldCheck, Trash2, Loader2 } from "lucide-react";

const getClearanceLabel = (level: number) => {
  switch (level) {
    case 1: return "Standard Access";
    case 2: return "Confidential";
    case 3: return "Secret";
    case 4: return "Top Secret";
    default: return `Level ${level}`;
  }
};

export default function UsersManagementPage() {
  const adminInfo = useAdmin();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  useEffect(() => {
    adminInfo.fetchUsers();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
            Monitor users, control admin access, and manage security clearances for your enterprise data.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={adminInfo.fetchUsers}
          disabled={adminInfo.isLoading}
          className="shadow-sm rounded-xl h-10 px-4"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${adminInfo.isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="flex-1 min-h-0 border border-border shadow-sm rounded-2xl bg-card overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <TableRow className="border-border/50">
                <TableHead className="font-bold text-xs uppercase tracking-wider py-4">Email</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-center w-[220px]">Data Access Scope</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">Joined</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminInfo.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      <span className="text-sm font-medium">Loading user directory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {adminInfo.users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group hover:bg-muted/30 transition-colors border-border/40"
                    >
                      {/* ... existing cells ... */}
                      <TableCell className="font-medium text-sm py-4">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.name || <span className="text-muted-foreground italic">No name</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "secondary"}
                          className={
                            user.role === "admin"
                              ? "bg-indigo-500 hover:bg-indigo-600 shadow-sm font-semibold"
                              : "font-medium"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 w-max px-2">
                            {getClearanceLabel(user.clearanceLevel || 1)}
                          </Badge>
                          {user.division ? (
                            <Badge variant="outline" title={user.division.name} className="text-[10px] border-orange-500/30 text-orange-600 bg-orange-500/5 dark:text-orange-400 w-max cursor-help">
                              Restricted ({user.division.name})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 dark:text-emerald-400 w-max">
                              All Divisions
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          {user.role !== "admin" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adminInfo.updateUserRole(user.id, "admin")}
                              className="h-8 text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all rounded-lg"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" /> Make Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adminInfo.updateUserRole(user.id, "user")}
                              className="h-8 text-xs border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition-all rounded-lg"
                            >
                              Revoke Admin
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsSecurityModalOpen(true);
                            }}
                            className="h-8 w-8 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all rounded-lg ml-1"
                            title="Edit Division & Clearance"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete User"
                            onClick={() => adminInfo.deleteUser(user.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-lg ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {adminInfo.users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-muted-foreground text-sm">
                        No users registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isSecurityModalOpen && (
        <UserSecurityModal 
          open={isSecurityModalOpen} 
          onOpenChange={setIsSecurityModalOpen} 
          user={selectedUser} 
          onSave={adminInfo.updateUserSecurity} 
        />
      )}
    </div>
  );
}
