// ── Providers & Models ────────────────────────────────────────────────────────

export type Provider = "anthropic" | "openai" | "google" | "xai";

export interface ModelOption {
  id: string;
  name: string;
  provider: Provider;
}

export const PROVIDER_MODELS: Record<Provider, ModelOption[]> = {
  anthropic: [
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
    { id: "o1", name: "o1", provider: "openai" },
    { id: "o3-mini", name: "o3-mini", provider: "openai" },
  ],
  google: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google" },
    { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro", provider: "google" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google" },
  ],
  xai: [
    { id: "grok-3", name: "Grok 3", provider: "xai" },
    { id: "grok-3-mini", name: "Grok 3 Mini", provider: "xai" },
  ],
};

// ── Debater Configuration ─────────────────────────────────────────────────────

export type DebatePosition = "for" | "against" | "neutral";

export interface Debater {
  id: string;
  name: string;
  provider: Provider;
  modelId: string;
  position: DebatePosition;
  /** Optional custom system prompt; falls back to a generated one if empty */
  systemPrompt?: string;
  /** UI color for this debater (tailwind color token e.g. "blue", "rose") */
  color: DebaterColor;
}

export type DebaterColor = "blue" | "rose" | "emerald" | "amber" | "violet" | "orange";

export const DEBATER_COLORS: DebaterColor[] = [
  "blue",
  "rose",
  "emerald",
  "amber",
  "violet",
  "orange",
];

// ── Debate Configuration ──────────────────────────────────────────────────────

export type DebateFormat = "oxford" | "freeform" | "socratic";

export interface DebateConfig {
  topic: string;
  format: DebateFormat;
  rounds: number;
  /** Approximate max words per response */
  maxWords: number;
  debaters: Debater[];
}

// ── Debate Runtime State ──────────────────────────────────────────────────────

export type MessageStatus = "pending" | "streaming" | "done" | "error";

export interface DebateMessage {
  id: string;
  debaterId: string;
  round: number;
  content: string;
  status: MessageStatus;
  timestamp: number;
}

export type DebateStatus = "idle" | "running" | "paused" | "finished" | "error";

export interface DebateState {
  config: DebateConfig;
  messages: DebateMessage[];
  currentRound: number;
  currentDebaterIndex: number;
  status: DebateStatus;
  startedAt?: number;
  finishedAt?: number;
}

// ── API Key Config ────────────────────────────────────────────────────────────

export interface ApiKeyStatus {
  provider: Provider;
  configured: boolean;
}
