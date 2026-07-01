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

  return (
    <div className="h-screen bg-background overflow-hidden font-sans">
      <AIQueryInput
        className="h-full w-full"
        handleLogout={session.handleLogout}
        workspaceHeader={<WorkspaceHeader />}
      />
    </div>
  );
}
