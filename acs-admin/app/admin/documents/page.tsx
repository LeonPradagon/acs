"use client";

import React, { useEffect, useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminUploadModal } from "@/components/admin/admin-upload-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, FileText, UploadCloud, Trash2, Loader2, RotateCcw, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsManagementPage() {
  const adminInfo = useAdmin();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  
  // Advanced Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  useEffect(() => {
    adminInfo.fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDocs = adminInfo.documents.filter(d => !d.deletedAt);
  const trashDocs = adminInfo.documents.filter(d => !!d.deletedAt);

  let displayDocs = activeTab === "active" ? activeDocs : trashDocs;
  
  // Apply Search & Filter
  if (searchTerm) {
    displayDocs = displayDocs.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }
  if (statusFilter !== "ALL") {
    displayDocs = displayDocs.filter(d => d.status === statusFilter);
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocs(displayDocs.map(d => d.id));
    } else {
      setSelectedDocs([]);
    }
  };

  const handleSelectDoc = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs(prev => [...prev, id]);
    } else {
      setSelectedDocs(prev => prev.filter(docId => docId !== id));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to move ${selectedDocs.length} documents to trash?`)) return;
    setIsDeletingBulk(true);
    try {
      await Promise.all(selectedDocs.map(id => adminInfo.deleteDocument(id)));
      setSelectedDocs([]);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
            Manage vector embeddings, document versions, and view both Public and Private datasets across the enterprise.
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

      <div className="flex-1 min-h-0 border border-white/10 shadow-sm rounded-2xl bg-black/40 backdrop-blur-md flex flex-col relative overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedDocs([]); }} className="flex flex-col h-full">
          <div className="px-4 pt-4 pb-2 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="active" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">Active Documents ({activeDocs.length})</TabsTrigger>
              <TabsTrigger value="trash" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400">Trash ({trashDocs.length})</TabsTrigger>
            </TabsList>
            
            {/* Advanced Toolbar */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
                <Input 
                  placeholder="Search title..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-white/5 border-white/10 text-white text-xs placeholder:text-white/40 focus-visible:ring-indigo-500/50" 
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 bg-white/5 border-white/10 text-white text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10 text-white">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
              {selectedDocs.length > 0 && activeTab === "active" && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  className="h-9 px-3 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                >
                  {isDeletingBulk ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                  Delete ({selectedDocs.length})
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-md shadow-sm border-b border-white/10">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[40px] px-4">
                    <Checkbox 
                      checked={displayDocs.length > 0 && selectedDocs.length === displayDocs.length}
                      onCheckedChange={handleSelectAll}
                      className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                    />
                  </TableHead>
                  <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider py-3 w-[35%]">Title / Filename</TableHead>
                  <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Version</TableHead>
                  <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Visibility & Access</TableHead>
                  <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Upload Date</TableHead>
                  <TableHead className="font-bold text-[10px] text-white/50 uppercase tracking-wider text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminInfo.isLoading ? (
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i} className="border-white/5 hover:bg-transparent">
                        <TableCell className="px-4 py-3"><Skeleton className="h-4 w-4 bg-white/10" /></TableCell>
                        <TableCell className="py-3"><Skeleton className="h-4 w-[250px] bg-white/10" /></TableCell>
                        <TableCell className="py-3"><Skeleton className="h-4 w-12 bg-white/10" /></TableCell>
                        <TableCell className="py-3"><Skeleton className="h-4 w-20 bg-white/10" /></TableCell>
                        <TableCell className="py-3"><Skeleton className="h-4 w-24 bg-white/10" /></TableCell>
                        <TableCell className="py-3"><Skeleton className="h-4 w-20 bg-white/10" /></TableCell>
                        <TableCell className="py-3 text-right"><Skeleton className="h-6 w-16 ml-auto bg-white/10" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : displayDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-60 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-white/40">
                        <FileText className="w-12 h-12 text-white/10 mb-2" />
                        <span className="text-sm font-medium">No documents found in this view.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {displayDocs.map((doc) => {
                      // Check if any embedding jobs are in progress
                      const isReindexing = doc.embeddingJobs?.some(job => job.status === "PROCESSING" || job.status === "PENDING");
                      
                      return (
                        <TableRow
                          key={doc.id}
                          className="group hover:bg-white/5 transition-colors border-white/5"
                        >
                          <TableCell className="px-4">
                            <Checkbox 
                              checked={selectedDocs.includes(doc.id)}
                              onCheckedChange={(c) => handleSelectDoc(doc.id, c as boolean)}
                              className="border-white/30 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                            />
                          </TableCell>
                          <TableCell
                            className="font-medium text-xs py-2 max-w-[300px] truncate"
                            title={doc.title}
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-400 shrink-0 border border-indigo-500/30">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <span className="truncate text-white/90">{doc.title}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px] bg-black/40 border-white/10 text-white/70">
                              v{doc.version || 1}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                doc.visibility.includes("Global")
                                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0"
                                  : "border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0"
                              }
                            >
                              {doc.visibility}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isReindexing ? (
                              <div className="flex items-center gap-1.5 text-indigo-400">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span className="text-[9px] uppercase font-bold tracking-wider">Re-indexing</span>
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-[9px] tracking-wider uppercase font-bold bg-white/5 text-white/60 border border-white/10"
                              >
                                {doc.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-white/50 font-mono py-2">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right pr-6 py-2">
                            {activeTab === "trash" ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Restore Document"
                                  onClick={() => adminInfo.restoreDocument(doc.id)}
                                  className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors rounded-md opacity-50 group-hover:opacity-100"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Permanently Delete Document"
                                  onClick={() => {
                                    if(confirm("Are you sure you want to permanently delete this document and its vectors?")) {
                                      adminInfo.deleteDocument(doc.id);
                                    }
                                  }}
                                  className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-md opacity-50 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Move to Trash"
                                onClick={() => adminInfo.deleteDocument(doc.id)}
                                className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-md opacity-50 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {displayDocs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground text-sm">
                          {activeTab === "active" ? "Knowledge Base is currently empty." : "Trash is empty."}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
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
