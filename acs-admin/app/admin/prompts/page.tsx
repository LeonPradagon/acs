"use client";

import React, { useEffect, useState } from "react";
import { useAdmin, PromptVersion } from "@/hooks/useAdmin";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, Settings, Save, CheckCircle2, History, Loader2, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PromptsManagementPage() {
  const adminInfo = useAdmin();
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    adminInfo.fetchPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set the active SYSTEM_PROMPT as the default selected prompt when loaded
  useEffect(() => {
    if (adminInfo.prompts.length > 0 && !selectedPrompt) {
      const activeSystem = adminInfo.prompts.find(p => p.name === "SYSTEM_PROMPT" && p.isActive);
      if (activeSystem) {
        setSelectedPrompt(activeSystem);
        setEditContent(activeSystem.content);
      } else {
        const first = adminInfo.prompts[0];
        setSelectedPrompt(first);
        setEditContent(first.content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminInfo.prompts]);

  const handleSave = async () => {
    if (!selectedPrompt) return;
    setIsSaving(true);
    const success = await adminInfo.savePrompt(selectedPrompt.name, editContent);
    if (success) {
      // It will create a new version. We wait for the list to update and select it.
      // fetchPrompts is called inside savePrompt partially, but let's refresh to be sure.
      adminInfo.fetchPrompts();
    }
    setIsSaving(false);
  };

  const handleActivate = async (id: string) => {
    await adminInfo.activatePrompt(id);
    adminInfo.fetchPrompts(); // Refresh to ensure UI consistency
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Prompt Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
            Manage, version, and edit the AI&apos;s core cognitive directives and system prompts dynamically.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={adminInfo.fetchPrompts}
          disabled={adminInfo.isLoading}
          className="shadow-sm rounded-xl h-10 px-4"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${adminInfo.isLoading ? "animate-spin" : ""}`}
          />
          Refresh Prompts
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3 flex-1 min-h-[500px]">
        {/* Editor Area */}
        <Card className="md:col-span-2 border-white/5 bg-black/40 shadow-sm flex flex-col backdrop-blur-md">
          <CardHeader className="border-b border-white/5 bg-white/5 py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  {selectedPrompt ? selectedPrompt.name : "System Prompt Editor"}
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-white/50">
                  {selectedPrompt ? `Currently viewing v${selectedPrompt.version}` : "Select a prompt to edit"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedPrompt && !selectedPrompt.isActive && (
                  <Button
                    variant="outline"
                    className="h-8 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3"
                    onClick={() => handleActivate(selectedPrompt.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Activate Version
                  </Button>
                )}
                <Button
                  variant="default"
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3"
                  onClick={handleSave}
                  disabled={isSaving || !selectedPrompt || editContent === selectedPrompt.content}
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  Save New Version
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            <textarea
              className="flex-1 w-full p-4 bg-black/60 text-emerald-400 font-mono text-xs leading-relaxed outline-none resize-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Enter system prompt here..."
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* History Area */}
        <Card className="md:col-span-1 border-white/5 bg-black/40 shadow-sm flex flex-col backdrop-blur-md">
          <CardHeader className="border-b border-white/5 bg-white/5 py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-white/50" />
              Version History
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs text-white/50">
              Select previous versions to restore or compare.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="divide-y divide-white/5">
                {adminInfo.prompts.filter(p => p.name === selectedPrompt?.name).map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPrompt(p);
                      setEditContent(p.content);
                    }}
                    className={`p-3 cursor-pointer transition-colors hover:bg-white/5 ${
                      selectedPrompt?.id === p.id ? "bg-indigo-500/10 border-l-2 border-l-indigo-500" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white/90">v{p.version}</span>
                        {p.isActive && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] px-1 py-0 uppercase">
                            Active
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-white/40 font-mono">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                      {p.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
