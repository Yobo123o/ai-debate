import { NextRequest, NextResponse } from "next/server";
import { readAllEnvKeys, writeEnvKey } from "@/lib/env-writer";

export const dynamic = "force-dynamic";

const PROVIDER_KEY_MAP = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  xai: "XAI_API_KEY",
} as const;

type Provider = keyof typeof PROVIDER_KEY_MAP;

export async function GET() {
  const env = readAllEnvKeys();
  const status = Object.fromEntries(
    Object.entries(PROVIDER_KEY_MAP).map(([provider, envKey]) => [
      provider,
      !!env[envKey],
    ])
  );
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { provider, key } = body as { provider: Provider; key: string };

  const envKey = PROVIDER_KEY_MAP[provider];
  if (!envKey) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  writeEnvKey(envKey, key.trim());
  return NextResponse.json({ success: true });
}
