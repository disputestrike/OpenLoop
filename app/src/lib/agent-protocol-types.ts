/**
 * OpenLoop Agent Protocol — canonical message types.
 *
 * Agents exchange structured packets (like APIs) so any compatible client
 * can participate in the network. These types align with the Universal
 * Agent Protocol Network architecture. See AGENT_PROTOCOL_NETWORK.md.
 */

export const PROTOCOL_MESSAGE_TYPES = {
  TASK_REQUEST: "TASK_REQUEST",
  TASK_OFFER: "TASK_OFFER",
  COUNTER_OFFER: "COUNTER_OFFER",
  TASK_ACCEPT: "TASK_ACCEPT",
  TASK_EXECUTE: "TASK_EXECUTE",
  TASK_COMPLETE: "TASK_COMPLETE",
  PAYMENT_REQUEST: "PAYMENT_REQUEST",
  PAYMENT_CONFIRM: "PAYMENT_CONFIRM",
} as const;

export type ProtocolMessageType = (typeof PROTOCOL_MESSAGE_TYPES)[keyof typeof PROTOCOL_MESSAGE_TYPES];

/** Base envelope for all protocol messages */
export interface AgentProtocolEnvelope {
  type: ProtocolMessageType;
  id?: string;
  fromAgentId?: string;
  toAgentId?: string;
  timestamp?: string; // ISO
  correlationId?: string; // link request → offer → accept → complete
}

/** TASK_REQUEST — request work (task, constraints, budget, deadline). Maps to /api/negotiate, /api/contracts POST */
export interface TaskRequestMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.TASK_REQUEST;
  task: string;
  /** Task-specific inputs (e.g. origin, destination, budget) */
  inputs?: Record<string, unknown>;
  budget?: number; // cents or currency units
  deadline?: string; // ISO date
  context?: string;
}

/** TASK_OFFER — offer to perform (price, terms). Maps to negotiation rounds, contract creation */
export interface TaskOfferMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.TASK_OFFER;
  task: string;
  proposedValue?: string; // e.g. "$89/month"
  rewardAmountCents?: number;
  terms?: string;
}

/** COUNTER_OFFER — revised terms. Maps to NegotiationMessage rounds */
export interface CounterOfferMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.COUNTER_OFFER;
  proposedValue?: string;
  terms?: string;
}

/** TASK_ACCEPT — accept an offer. Maps to contract action, marketplace hire */
export interface TaskAcceptMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.TASK_ACCEPT;
  contractId?: string;
  acceptedOfferId?: string;
}

/** TASK_EXECUTE — perform the task. Maps to browser execution, action-executor */
export interface TaskExecuteMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.TASK_EXECUTE;
  contractId?: string;
  action?: string;
  payload?: Record<string, unknown>;
}

/** TASK_COMPLETE — task done + proof. Maps to record-deal, verify-win, contract status */
export interface TaskCompleteMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.TASK_COMPLETE;
  contractId?: string;
  outcome?: string;
  proof?: string; // receipt, ref, verification id
  amountCents?: number;
}

/** PAYMENT_REQUEST — request payment. Maps to wallet, Stripe checkout */
export interface PaymentRequestMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.PAYMENT_REQUEST;
  amountCents: number;
  currency?: string;
  referenceId?: string;
}

/** PAYMENT_CONFIRM — payment confirmed. Maps to Stripe webhook, transactions */
export interface PaymentConfirmMessage extends AgentProtocolEnvelope {
  type: typeof PROTOCOL_MESSAGE_TYPES.PAYMENT_CONFIRM;
  transactionId?: string;
  amountCents: number;
  referenceId?: string;
}

export type AgentProtocolMessage =
  | TaskRequestMessage
  | TaskOfferMessage
  | CounterOfferMessage
  | TaskAcceptMessage
  | TaskExecuteMessage
  | TaskCompleteMessage
  | PaymentRequestMessage
  | PaymentConfirmMessage;

/** Example TASK_REQUEST payload (e.g. flight_search) */
export function exampleTaskRequest(): TaskRequestMessage {
  return {
    type: PROTOCOL_MESSAGE_TYPES.TASK_REQUEST,
    task: "flight_search",
    inputs: { origin: "NYC", destination: "London", budget: 500 },
    deadline: "2026-03-30",
  };
}
