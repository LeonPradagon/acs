"use client";

import React, { useState, useEffect } from "react";
import { AIQueryInput } from "@/components/ai-model";

// Custom Hooks
import { useSession } from "@/hooks/useSession";

// sub-components
import { WorkspaceHeader } from "@/components/workspace/workspace-header";

/**
 * Main Analyst Workspace — Full-screen chat with header
 */
export function AnalystWorkspace() {
  const session = useSession();
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date().toLocaleString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setCurrentTime(now);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen bg-background overflow-hidden font-sans">
      <AIQueryInput
        className="h-full w-full"
        workspaceHeader={
          <WorkspaceHeader
            handleLogout={session.handleLogout}
            currentTime={currentTime}
          />
        }
      />
    </div>
  );
}
