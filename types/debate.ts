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

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
};

// ── Debate Mode ───────────────────────────────────────────────────────────────

/** classic: For vs Against a proposition. freeforall: each AI argues for itself. */
export type DebateMode = "classic" | "freeforall";

// ── Debater Configuration ─────────────────────────────────────────────────────

export type DebatePosition = "for" | "against" | "neutral" | "self";

export interface Debater {
  id: string;
  name: string;
  provider: Provider;
  modelId: string;
  position: DebatePosition;
  systemPrompt?: string;
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

// Tailwind v4 requires full static class names — no dynamic interpolation
export const COLOR_STYLES: Record<DebaterColor, { border: string; text: string; dot: string; badge: string; avatarBg: string }> = {
  blue:    { border: "border-blue-500/40",    text: "text-blue-400",    dot: "bg-blue-500",    badge: "bg-blue-500/15 text-blue-300 border-blue-500/30",    avatarBg: "bg-blue-500/20" },
  rose:    { border: "border-rose-500/40",    text: "text-rose-400",    dot: "bg-rose-500",    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",    avatarBg: "bg-rose-500/20" },
  emerald: { border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-500", badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", avatarBg: "bg-emerald-500/20" },
  amber:   { border: "border-amber-500/40",   text: "text-amber-400",   dot: "bg-amber-500",   badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",   avatarBg: "bg-amber-500/20" },
  violet:  { border: "border-violet-500/40",  text: "text-violet-400",  dot: "bg-violet-500",  badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",  avatarBg: "bg-violet-500/20" },
  orange:  { border: "border-orange-500/40",  text: "text-orange-400",  dot: "bg-orange-500",  badge: "bg-orange-500/15 text-orange-300 border-orange-500/30",  avatarBg: "bg-orange-500/20" },
};

// ── Debate Configuration ──────────────────────────────────────────────────────

export type DebateFormat = "oxford" | "freeform" | "socratic";

export interface JudgeConfig {
  provider: Provider;
  modelId: string;
}

export interface DebateConfig {
  topic: string;
  mode: DebateMode;
  format: DebateFormat;
  maxWords: number;
  debaters: Debater[];
  judge?: JudgeConfig;
}

// ── Debate Runtime State ──────────────────────────────────────────────────────

export type MessageStatus = "pending" | "streaming" | "done" | "error";

export interface DebateMessage {
  id: string;
  /** debaterId of a configured debater, or "moderator" for human interjections */
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
