import React, { useState } from "react";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApprovalCardProps {
  actionId: string;
  summary: string;
  initialStatus: "PENDING" | "APPROVED" | "REJECTED";
}

export const ApprovalActionCard = ({ actionId, summary, initialStatus }: ApprovalCardProps) => {
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(initialStatus);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (decision: "approve" | "reject") => {
    setIsProcessing(true);
    try {
      // In a real app, this would call the API
      // const res = await fetch(`/api/approval/${actionId}/${decision}`, { method: 'POST' });
      await new Promise(r => setTimeout(r, 1000)); // simulate network delay
      setStatus(decision === "approve" ? "APPROVED" : "REJECTED");
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="my-4 border-2 border-orange-500/20 bg-orange-500/5 rounded-xl p-4 w-full max-w-md shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">Approval Required</h4>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {summary}
          </p>
          
          <div className="mt-4 flex items-center gap-2">
            {status === "PENDING" ? (
              <>
                <Button 
                  onClick={() => handleAction("approve")}
                  disabled={isProcessing}
                  className="flex-1 h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                  Approve
                </Button>
                <Button 
                  onClick={() => handleAction("reject")}
                  disabled={isProcessing}
                  variant="outline"
                  className="flex-1 h-8 text-xs border-orange-200 hover:bg-orange-100 dark:hover:bg-orange-950 text-orange-700"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <X className="w-3.5 h-3.5 mr-1" />}
                  Reject
                </Button>
              </>
            ) : status === "APPROVED" ? (
              <div className="w-full py-1.5 flex justify-center items-center gap-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-semibold">
                <Check className="w-4 h-4" /> Action Approved
              </div>
            ) : (
              <div className="w-full py-1.5 flex justify-center items-center gap-1.5 bg-red-500/10 text-red-600 rounded-lg text-xs font-semibold">
                <X className="w-4 h-4" /> Action Rejected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
