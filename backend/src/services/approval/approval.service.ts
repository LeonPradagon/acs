import { prisma } from "../../config/db";

export interface PendingAction {
  id: string;
  userId: string;
  actionType: string;
  payload: any;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export class ApprovalService {
  private static mockDb: Map<string, PendingAction> = new Map();

  /**
   * Request approval for a sensitive action
   */
  static async requestApproval(userId: string, actionType: string, payload: any): Promise<string> {
    const actionId = `action-${Date.now()}`;
    const action: PendingAction = {
      id: actionId,
      userId,
      actionType,
      payload,
      status: "PENDING"
    };
    
    // In real implementation, save to DB
    this.mockDb.set(actionId, action);
    console.log(`[ApprovalService] Requested approval for action ${actionId} (${actionType})`);
    
    return actionId;
  }

  /**
   * Approve a pending action
   */
  static async approve(actionId: string, approverId: string): Promise<boolean> {
    const action = this.mockDb.get(actionId);
    if (!action) return false;
    
    action.status = "APPROVED";
    this.mockDb.set(actionId, action);
    console.log(`[ApprovalService] Action ${actionId} APPROVED by ${approverId}`);
    
    // Trigger actual action execution here via event or callback
    return true;
  }

  /**
   * Reject a pending action
   */
  static async reject(actionId: string, approverId: string): Promise<boolean> {
    const action = this.mockDb.get(actionId);
    if (!action) return false;
    
    action.status = "REJECTED";
    this.mockDb.set(actionId, action);
    console.log(`[ApprovalService] Action ${actionId} REJECTED by ${approverId}`);
    
    return true;
  }
}
