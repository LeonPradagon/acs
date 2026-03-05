"use client";

import React, { useState } from "react";
import { AIQueryInput } from "./ai-model";

// Custom Hooks
import { useSession } from "@/hooks/useSession";

// sub-components
import { WorkspaceHeader } from "./workspace/workspace-header";

/**
 * Main Analyst Workspace — Full-screen chat with header
 */
export function AnalystWorkspace() {
  const session = useSession();

  const currentTime = new Date().toLocaleString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
