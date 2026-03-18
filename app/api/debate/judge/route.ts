import { NextRequest, NextResponse } from "next/server";
import { streamTurn } from "@/lib/providers/stream";
import { buildJudgeSystemPrompt, buildJudgeUserMessage } from "@/lib/debate/prompts";
import type { DebateConfig, DebateMessage, JudgeConfig } from "@/types/debate";

export const dynamic = "force-dynamic";

interface JudgeRequest {
  judge: JudgeConfig;
  config: DebateConfig;
  history: DebateMessage[];
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
  const { judge, config, history } = (await req.json()) as JudgeRequest;

  const systemPrompt = buildJudgeSystemPrompt();
  const userMessage = buildJudgeUserMessage(config, history);

  try {
    const stream = await streamTurn({
      provider: judge.provider,
      modelId: judge.modelId,
      systemPrompt,
      userMessage,
      maxTokens: 1024,
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
