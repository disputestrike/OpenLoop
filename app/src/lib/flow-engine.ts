/**
 * Canonical flow engine: load memory → merge input → decide next step → save memory → return.
 * Single place for "load → merge → step → save" so chat, protocol, and channels can use one state machine.
 */

import {
  loadPersistentMemory,
  updatePersistentMemory,
} from "@/lib/persistent-memory";

export interface FlowInput {
  message?: string;
  eventType?: string;
  payload?: Record<string, unknown>;
}

export interface FlowResult {
  memory: Record<string, unknown>;
  version: number;
  nextStep: string;
  responseText?: string;
}

/** Derive next step from current memory (single source of truth for flow state). */
function getNextStep(memory: Record<string, unknown>): string {
  const lastEvent = memory.last_event_type as string | undefined;
  const lastTask = memory.last_task as string | undefined;
  if (lastEvent === "TASK_COMPLETE" && lastTask) return "await_payment";
  if (lastEvent === "PAYMENT_CONFIRM") return "done";
  if (lastEvent === "TASK_ACCEPT" || lastEvent === "TASK_OFFER") return "execute_task";
  if (lastEvent === "TASK_REQUEST") return "await_offer";
  if (memory.last_step) return String(memory.last_step);
  return "continue";
}

/**
 * Run one flow step: load memory for (loopId, agentId, channel), merge input, compute next step, save once, return.
 */
export async function runFlowStep(
  loopId: string,
  agentId: string | null,
  channel: string | null,
  input: FlowInput
): Promise<FlowResult | null> {
  const incoming: Record<string, unknown> = {
    last_updated_at: new Date().toISOString(),
    ...(input.message ? { last_message: input.message } : {}),
    ...(input.eventType ? { last_event_type: input.eventType } : {}),
    ...(input.payload && typeof input.payload === "object" ? input.payload : {}),
  };

  const updated = await updatePersistentMemory(loopId, agentId, channel, incoming, true);
  if (!updated) return null;

  const nextStep = getNextStep(updated.memory);
  const memoryWithStep = { ...updated.memory, last_step: nextStep };
  await updatePersistentMemory(loopId, agentId, channel, { last_step: nextStep }, true);

  return {
    memory: memoryWithStep,
    version: updated.version,
    nextStep,
    responseText: nextStep === "done" ? "All set." : undefined,
  };
}
