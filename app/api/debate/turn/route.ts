import { NextRequest, NextResponse } from "next/server";
import { streamTurn } from "@/lib/providers/stream";
import { buildSystemPrompt, buildUserMessage } from "@/lib/debate/prompts";
import type { Debater, DebateConfig, DebateMessage } from "@/types/debate";

export const dynamic = "force-dynamic";

interface TurnRequest {
  debater: Debater;
  config: DebateConfig;
  history: DebateMessage[];
  currentRound: number;
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("credit balance is too low") || msg.includes("insufficient_quota"))
    return "Insufficient API credits. Top up your account and try again.";
  if (msg.includes("invalid_api_key") || msg.includes("Incorrect API key"))
    return "Invalid API key. Check your key in Settings.";
  if (msg.includes("rate_limit") || msg.includes("429"))
    return "Rate limit hit. Wait a moment and try again.";
  return msg;
}

export async function POST(req: NextRequest) {
  const { debater, config, history, currentRound } = (await req.json()) as TurnRequest;

  const systemPrompt = buildSystemPrompt(debater, config);
  const userMessage = buildUserMessage(
    history,
    debater.id,
    config.debaters,
    currentRound
  );

  // Rough token budget: ~1.4 tokens per word, plus headroom
  const wordBudget = config.maxWords > 0 ? config.maxWords : 600;
  const maxTokens = Math.min(Math.ceil(wordBudget * 1.5) + 150, 4096);

  try {
    const stream = await streamTurn({
      provider: debater.provider,
      modelId: debater.modelId,
      systemPrompt,
      userMessage,
      maxTokens,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: friendlyError(err) }, { status: 400 });
  }
}
