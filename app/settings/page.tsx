"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, CheckCircle2, Circle, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldDescription, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";

type Provider = "anthropic" | "openai" | "google" | "xai";

interface ProviderConfig {
  id: Provider;
  name: string;
  description: string;
  models: string;
  keyPlaceholder: string;
  accentColor: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "ANTHROPIC_API_KEY",
    models: "Claude Opus 4.6 · Sonnet 4.6 · Haiku 4.5",
    keyPlaceholder: "sk-ant-api03-…",
    accentColor: "text-orange-400",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "OPENAI_API_KEY",
    models: "GPT-4o · o1 · o3-mini",
    keyPlaceholder: "sk-proj-…",
    accentColor: "text-emerald-400",
  },
  {
    id: "google",
    name: "Google",
    description: "GOOGLE_API_KEY",
    models: "Gemini 2.0 Flash · Gemini 2.0 Pro · Gemini 1.5 Flash",
    keyPlaceholder: "AIzaSy…",
    accentColor: "text-blue-400",
  },
  {
    id: "xai",
    name: "xAI",
    description: "XAI_API_KEY",
    models: "Grok 3 · Grok 3 Mini",
    keyPlaceholder: "xai-…",
    accentColor: "text-violet-400",
  },
];

export default function SettingsPage() {
  const [configured, setConfigured] = useState<Record<Provider, boolean>>({
    anthropic: false, openai: false, google: false, xai: false,
  });
  const [keys, setKeys] = useState<Record<Provider, string>>({
    anthropic: "", openai: "", google: "", xai: "",
  });
  const [visible, setVisible] = useState<Record<Provider, boolean>>({
    anthropic: false, openai: false, google: false, xai: false,
  });
  const [saving, setSaving] = useState<Record<Provider, boolean>>({
    anthropic: false, openai: false, google: false, xai: false,
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setConfigured)
      .catch(() => toast.error("Failed to load settings"));
  }, []);

  async function saveKey(provider: Provider) {
    setSaving((s) => ({ ...s, [provider]: true }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: keys[provider] }),
      });
      if (!res.ok) throw new Error();
      const name = PROVIDERS.find((p) => p.id === provider)!.name;
      setConfigured((c) => ({ ...c, [provider]: !!keys[provider] }));
      setKeys((k) => ({ ...k, [provider]: "" }));
      toast.success(keys[provider] ? `${name} key saved` : `${name} key removed`);
    } catch {
      toast.error("Failed to save key");
    } finally {
      setSaving((s) => ({ ...s, [provider]: false }));
    }
  }

  const configuredCount = Object.values(configured).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Keys are saved to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code>{" "}
          and never leave your machine.
        </p>
        <div className="mt-3">
          <Badge variant={configuredCount > 0 ? "default" : "secondary"} className="text-xs">
            {configuredCount} of {PROVIDERS.length} providers configured
          </Badge>
        </div>
      </div>

      <FieldGroup>
        {PROVIDERS.map((provider) => (
          <Card key={provider.id} className="bg-card/60">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {configured[provider.id]
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <CardTitle className={`text-sm font-semibold ${provider.accentColor}`}>
                    {provider.name}
                  </CardTitle>
                </div>
                <Badge
                  variant={configured[provider.id] ? "default" : "outline"}
                  className="text-[11px]"
                >
                  {configured[provider.id] ? "Configured" : "Not configured"}
                </Badge>
              </div>
              <CardDescription className="text-xs pl-6">{provider.models}</CardDescription>
            </CardHeader>

            <CardContent>
              <Field>
                <FieldLabel className="text-xs text-muted-foreground font-mono">
                  {provider.description}
                </FieldLabel>
                {configured[provider.id] && (
                  <FieldDescription>
                    A key is already saved. Enter a new one to replace it.
                  </FieldDescription>
                )}
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={visible[provider.id] ? "text" : "password"}
                      placeholder={provider.keyPlaceholder}
                      value={keys[provider.id]}
                      onChange={(e) => setKeys((k) => ({ ...k, [provider.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && saveKey(provider.id)}
                      className="pr-9 font-mono text-sm h-9"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible((v) => ({ ...v, [provider.id]: !v[provider.id] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {visible[provider.id]
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => saveKey(provider.id)}
                    disabled={saving[provider.id] || !keys[provider.id]}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving[provider.id] ? "Saving…" : "Save"}
                  </Button>
                </div>
              </Field>
            </CardContent>
          </Card>
        ))}
      </FieldGroup>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        You only need keys for providers you plan to use.
      </p>
    </div>
  );
}
