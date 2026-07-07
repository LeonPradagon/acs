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
import { RefreshCw, ShieldAlert, ShieldCheck, Trash2, Loader2, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    adminInfo.fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let displayUsers = adminInfo.users;
  if (searchTerm) {
    displayUsers = displayUsers.filter(u => 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }
  if (roleFilter !== "ALL") {
    displayUsers = displayUsers.filter(u => u.role === roleFilter);
  }

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

      <div className="flex-1 min-h-0 border border-white/10 shadow-sm rounded-2xl bg-black/40 backdrop-blur-md overflow-hidden flex flex-col relative">
        <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-sm font-semibold text-white/90">Directory ({displayUsers.length})</div>
          
          {/* Advanced Toolbar */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
              <Input 
                placeholder="Search email or name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40 focus-visible:ring-indigo-500/50" 
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[120px] h-9 bg-white/5 border-white/10 text-white text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/10 text-white">
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-md shadow-sm border-b border-white/10">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider py-3">Email</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Name</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Role</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider text-center w-[220px]">Data Access Scope</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Joined</TableHead>
                <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminInfo.isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-transparent">
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-[180px] bg-white/10" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-[120px] bg-white/10" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-12 bg-white/10" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-24 mx-auto bg-white/10" /></TableCell>
                      <TableCell className="py-3"><Skeleton className="h-4 w-20 bg-white/10" /></TableCell>
                      <TableCell className="py-3 text-right"><Skeleton className="h-6 w-[120px] ml-auto bg-white/10" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : displayUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-white/40">
                      <Users className="w-12 h-12 text-white/10 mb-2" />
                      <span className="text-sm font-medium">No users found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {displayUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="group hover:bg-white/5 transition-colors border-white/5"
                    >
                      <TableCell className="font-medium text-xs py-2">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-xs">
                        {user.name || <span className="text-white/40 italic">No name</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "secondary"}
                          className={
                            user.role === "admin"
                              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] px-1.5 py-0"
                              : "bg-white/5 text-white/60 border border-white/10 text-[10px] px-1.5 py-0"
                          }
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Badge variant="secondary" className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-max px-1.5 py-0">
                            {getClearanceLabel(user.clearanceLevel || 1)}
                          </Badge>
                          {user.division ? (
                            <Badge variant="outline" title={user.division.name} className="text-[9px] border-orange-500/30 text-orange-400 bg-orange-500/10 w-max cursor-help px-1.5 py-0">
                              Restricted ({user.division.name})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 w-max px-1.5 py-0">
                              All Divisions
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-white/50 font-mono py-2">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-2">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {user.role !== "admin" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adminInfo.updateUserRole(user.id, "admin")}
                              className="h-6 text-[10px] border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded px-2"
                            >
                              <ShieldAlert className="w-3 h-3 mr-1" /> Make Admin
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => adminInfo.updateUserRole(user.id, "user")}
                              className="h-6 text-[10px] border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded px-2"
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
                            className="h-6 w-6 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded ml-1"
                            title="Edit Division & Clearance"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete User"
                            onClick={() => adminInfo.deleteUser(user.id)}
                            className="h-6 w-6 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors rounded ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
