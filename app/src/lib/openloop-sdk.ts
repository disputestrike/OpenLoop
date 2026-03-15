/**
 * OpenLoop Protocol SDK — thin client for the Universal Agent Protocol.
 * Use from Node or browser. Auth via session (cookie) or API key (Bearer lk_live_xxx).
 *
 * Example:
 *   const client = new OpenLoopProtocolClient({ baseUrl: "https://yourapp.com", apiKey: "lk_live_..." });
 *   await client.send({ type: "TASK_REQUEST", task: "flight_search", to: "TravelBot", inputs: { origin: "NYC", destination: "LHR" } });
 */

import type {
  AgentProtocolMessage,
  TaskRequestMessage,
  TaskOfferMessage,
  TaskCompleteMessage,
  PaymentRequestMessage,
  PaymentConfirmMessage,
} from "./agent-protocol-types";
import { PROTOCOL_MESSAGE_TYPES } from "./agent-protocol-types";

export interface OpenLoopProtocolClientOptions {
  baseUrl: string;
  apiKey?: string;
  /** If true, use credentials: "include" for cookie session (browser) */
  credentials?: RequestCredentials;
}

export class OpenLoopProtocolClient {
  private baseUrl: string;
  private apiKey?: string;
  private credentials: RequestCredentials;

  constructor(options: OpenLoopProtocolClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.credentials = options.credentials ?? "omit";
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) h["Authorization"] = `Bearer ${this.apiKey}`;
    return h;
  }

  /**
   * Send a protocol message. Returns event id and correlation id.
   */
  async send(message: AgentProtocolMessage): Promise<{
    ok: boolean;
    eventId: string;
    correlationId: string;
    type: string;
    fromAgentId?: string;
    toAgentId?: string;
  }> {
    const res = await fetch(`${this.baseUrl}/api/protocol/send`, {
      method: "POST",
      headers: this.headers(),
      credentials: this.credentials,
      body: JSON.stringify(message),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || "Protocol send failed");
    }
    return res.json();
  }

  /**
   * Agent Runner: poll your protocol inbox for incoming TASK_REQUESTs (and other events).
   * Use this in a loop to run your agent autonomously.
   */
  async getInbox(options?: { limit?: number; since?: string; types?: string }): Promise<{
    events: Array<{ id: string; type: string; fromAgentId: string | null; fromTag: string | null; contractId: string | null; correlationId: string | null; payload: unknown; createdAt: string }>;
    yourLoopId: string;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.since) params.set("since", options.since);
    if (options?.types) params.set("types", options.types);
    const res = await fetch(`${this.baseUrl}/api/me/protocol/inbox?${params}`, {
      headers: this.headers(),
      credentials: this.credentials,
    });
    if (!res.ok) throw new Error("Failed to fetch protocol inbox");
    return res.json();
  }

  /**
   * Get persistent memory for the current loop (session/API key). Optional filter by agentId and channel.
   * Returns list of memory items (loop_id + agent_id + channel + memory JSONB).
   */
  async getMemory(options?: { agentId?: string; channel?: string }): Promise<{
    items: Array<{ id: string; loopId: string; agentId: string | null; channel: string | null; memory: unknown; version: number; updatedAt: string }>;
    yourLoopId: string;
  }> {
    const params = new URLSearchParams();
    if (options?.agentId) params.set("agentId", options.agentId);
    if (options?.channel) params.set("channel", options.channel);
    const res = await fetch(`${this.baseUrl}/api/me/persistent-memory?${params}`, {
      headers: this.headers(),
      credentials: this.credentials,
    });
    if (!res.ok) throw new Error("Failed to fetch persistent memory");
    return res.json();
  }

  /**
   * Update persistent memory (merge or replace). Scoped by optional agentId and channel.
   */
  async updateMemory(
    memory: Record<string, unknown>,
    options?: { agentId?: string; channel?: string; merge?: boolean }
  ): Promise<{ ok: boolean; memory: Record<string, unknown>; version: number; yourLoopId: string }> {
    const res = await fetch(`${this.baseUrl}/api/me/persistent-memory`, {
      method: "PATCH",
      headers: this.headers(),
      credentials: this.credentials,
      body: JSON.stringify({
        memory,
        agentId: options?.agentId,
        channel: options?.channel,
        merge: options?.merge !== false,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || "Failed to update memory");
    }
    return res.json();
  }

  /**
   * Clear persistent memory for the current loop. Optional scope by agentId and/or channel.
   */
  async clearMemory(options?: { agentId?: string; channel?: string }): Promise<{ ok: boolean; deleted: number; yourLoopId: string }> {
    const params = new URLSearchParams();
    if (options?.agentId) params.set("agentId", options.agentId);
    if (options?.channel) params.set("channel", options.channel);
    const res = await fetch(`${this.baseUrl}/api/me/persistent-memory?${params}`, {
      method: "DELETE",
      headers: this.headers(),
      credentials: this.credentials,
    });
    if (!res.ok) throw new Error("Failed to clear persistent memory");
    return res.json();
  }

  /**
   * Register this agent for the network (capabilities + optional webhook).
   */
  async register(options: { capabilities: string[]; webhook_url?: string }): Promise<{ ok: boolean; capabilities: string[]; webhook_url?: string }> {
    const res = await fetch(`${this.baseUrl}/api/agents/register`, {
      method: "POST",
      headers: this.headers(),
      credentials: this.credentials,
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || "Register failed");
    }
    return res.json();
  }

  /** Convenience: send TASK_REQUEST */
  async taskRequest(params: {
    task: string;
    to?: string;
    toAgentId?: string;
    inputs?: Record<string, unknown>;
    budget?: number;
    deadline?: string;
    context?: string;
    correlationId?: string;
  }): Promise<ReturnType<OpenLoopProtocolClient["send"]>> {
    const msg: TaskRequestMessage = {
      type: PROTOCOL_MESSAGE_TYPES.TASK_REQUEST,
      task: params.task,
      to: params.to,
      toAgentId: params.toAgentId,
      inputs: params.inputs,
      budget: params.budget,
      deadline: params.deadline,
      context: params.context,
      correlationId: params.correlationId,
    } as TaskRequestMessage & { to?: string };
    return this.send(msg);
  }

  /** Convenience: send TASK_OFFER */
  async taskOffer(params: {
    task: string;
    to?: string;
    toAgentId?: string;
    proposedValue?: string;
    rewardAmountCents?: number;
    terms?: string;
    contractId?: string;
    correlationId?: string;
  }): Promise<ReturnType<OpenLoopProtocolClient["send"]>> {
    const msg = {
      type: PROTOCOL_MESSAGE_TYPES.TASK_OFFER,
      task: params.task,
      to: params.to,
      toAgentId: params.toAgentId,
      proposedValue: params.proposedValue,
      rewardAmountCents: params.rewardAmountCents,
      terms: params.terms,
      contractId: params.contractId,
      correlationId: params.correlationId,
    } as TaskOfferMessage & { to?: string };
    return this.send(msg);
  }

  /** Convenience: send TASK_COMPLETE */
  async taskComplete(params: {
    contractId: string;
    outcome?: string;
    proof?: string;
    amountCents?: number;
    toAgentId?: string;
    correlationId?: string;
  }): Promise<ReturnType<OpenLoopProtocolClient["send"]>> {
    const msg: TaskCompleteMessage = {
      type: PROTOCOL_MESSAGE_TYPES.TASK_COMPLETE,
      contractId: params.contractId,
      outcome: params.outcome,
      proof: params.proof,
      amountCents: params.amountCents,
      toAgentId: params.toAgentId,
      correlationId: params.correlationId,
    };
    return this.send(msg);
  }

  /** Convenience: send PAYMENT_REQUEST */
  async paymentRequest(params: {
    amountCents: number;
    toAgentId?: string;
    to?: string;
    currency?: string;
    referenceId?: string;
  }): Promise<ReturnType<OpenLoopProtocolClient["send"]>> {
    const msg = {
      type: PROTOCOL_MESSAGE_TYPES.PAYMENT_REQUEST,
      amountCents: params.amountCents,
      toAgentId: params.toAgentId,
      to: params.to,
      currency: params.currency,
      referenceId: params.referenceId,
    } as PaymentRequestMessage & { to?: string };
    return this.send(msg);
  }

  /** Convenience: send PAYMENT_CONFIRM */
  async paymentConfirm(params: {
    amountCents: number;
    transactionId?: string;
    referenceId?: string;
    toAgentId?: string;
  }): Promise<ReturnType<OpenLoopProtocolClient["send"]>> {
    const msg: PaymentConfirmMessage = {
      type: PROTOCOL_MESSAGE_TYPES.PAYMENT_CONFIRM,
      amountCents: params.amountCents,
      transactionId: params.transactionId,
      referenceId: params.referenceId,
      toAgentId: params.toAgentId,
    };
    return this.send(msg);
  }
}
