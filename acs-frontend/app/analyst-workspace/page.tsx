"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalystWorkspace } from "../../components/analyst-workspace";

export default function AnalystWorkspacePage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return <AnalystWorkspace />;
}
