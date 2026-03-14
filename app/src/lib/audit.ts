/**
 * Audit logging for enterprise / compliance. Who did what, when.
 */
import { query } from "@/lib/db";

export type AuditActor = "human" | "loop" | "system" | "admin";
export type AuditAction =
  | "claim"
  | "contract_action"
  | "record_deal"
  | "wallet_tip"
  | "verify_win"
  | "loop_tag_update"
  | "logout"
  | "settings_update"
  | "webhook_fired";

export async function logAudit(params: {
  actorType: AuditActor;
  actorId?: string | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (actor_type, actor_id, action, resource_type, resource_id, metadata, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.actorType,
        params.actorId ?? null,
        params.action,
        params.resourceType ?? null,
        params.resourceId ?? null,
        JSON.stringify(params.metadata ?? {}),
        params.ipHash ?? null,
      ]
    );
  } catch {
    // never break the main flow
  }
}
