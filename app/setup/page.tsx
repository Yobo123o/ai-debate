"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Swords, Gavel } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DebaterCard } from "@/components/debater-card";
import {
  Debater,
  DebateConfig,
  DebateMode,
  DebateFormat,
  Provider,
  JudgeConfig,
  DEBATER_COLORS,
  PROVIDER_MODELS,
  PROVIDER_LABELS,
} from "@/types/debate";

const PROVIDERS: Provider[] = ["anthropic", "openai", "google", "xai"];

const FORMATS: { value: DebateFormat; label: string; description: string }[] = [
  { value: "oxford", label: "Oxford", description: "Structured opening, rebuttal, closing" },
  { value: "freeform", label: "Free-form", description: "Open back-and-forth exchange" },
  { value: "socratic", label: "Socratic", description: "Question-driven dialogue" },
];

const WORD_COUNTS = [
  { value: "100", label: "Short (~100 words)" },
  { value: "250", label: "Medium (~250 words)" },
  { value: "500", label: "Long (~500 words)" },
  { value: "0", label: "Unrestricted" },
];

function makeDebater(index: number): Debater {
  const color = DEBATER_COLORS[index % DEBATER_COLORS.length];
  const provider: Provider = index === 0 ? "anthropic" : index === 1 ? "openai" : "google";
  return {
    id: crypto.randomUUID(),
    name: index === 0 ? "Claude" : index === 1 ? "GPT" : `Debater ${index + 1}`,
    provider,
    modelId: PROVIDER_MODELS[provider][0].id,
    position: index === 0 ? "for" : index === 1 ? "against" : "neutral",
    color,
  };
}

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<DebateMode>("classic");
  const [topic, setTopic] = useState("");
  const [debaters, setDebaters] = useState<Debater[]>([makeDebater(0), makeDebater(1)]);
  const [maxWords, setMaxWords] = useState("250");
  const [format, setFormat] = useState<DebateFormat>("oxford");
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judge, setJudge] = useState<JudgeConfig>({ provider: "anthropic", modelId: "claude-opus-4-6" });
  const [configuredProviders, setConfiguredProviders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setConfiguredProviders)
      .catch(() => {});
  }, []);

  function handleModeChange(newMode: DebateMode) {
    setMode(newMode);
    if (newMode === "freeforall") {
      setDebaters((prev) => prev.map((d) => ({ ...d, position: "self" })));
      setJudgeEnabled(true);
    } else {
      setDebaters((prev) =>
        prev.map((d, i) => ({
          ...d,
          position: i === 0 ? "for" : i === 1 ? "against" : "neutral",
        }))
      );
    }
  }

  function addDebater() {
    if (debaters.length >= 6) return;
    setDebaters((prev) => [...prev, makeDebater(prev.length)]);
  }

  function removeDebater(id: string) {
    setDebaters((prev) => prev.filter((d) => d.id !== id));
  }

  function updateDebater(updated: Debater) {
    setDebaters((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  function handleJudgeProviderChange(provider: Provider) {
    setJudge({ provider, modelId: PROVIDER_MODELS[provider][0].id });
  }

  function validate(): string | null {
    if (!topic.trim()) return "Enter a topic or scenario.";
    if (debaters.length < 2) return "Add at least 2 debaters.";
    for (const d of debaters) {
      if (!d.name.trim()) return "All debaters need a name.";
      if (!configuredProviders[d.provider]) return `No API key for ${PROVIDER_LABELS[d.provider]}. Add it in Settings.`;
    }
    if (judgeEnabled && !configuredProviders[judge.provider]) {
      return `No API key for the judge's provider (${PROVIDER_LABELS[judge.provider]}). Add it in Settings.`;
    }
    return null;
  }

  function startDebate() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const config: DebateConfig = {
      topic: topic.trim(),
      mode,
      format,
      maxWords: parseInt(maxWords),
      debaters,
      judge: judgeEnabled ? judge : undefined,
    };

    sessionStorage.setItem("debateConfig", JSON.stringify(config));
    router.push("/debate");
  }

  const isFreeForAll = mode === "freeforall";

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">New Debate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the combatants and let the AIs sort it out.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {/* Mode */}
        <section>
          <Label className="text-sm font-medium mb-3 block">Debate Mode</Label>
          <Tabs value={mode} onValueChange={(v) => handleModeChange(v as DebateMode)}>
            <TabsList className="w-full">
              <TabsTrigger value="classic" className="flex-1 gap-2">
                <Swords className="h-4 w-4" />
                Classic Debate
              </TabsTrigger>
              <TabsTrigger value="freeforall" className="flex-1 gap-2">
                <Swords className="h-4 w-4 rotate-90" />
                Free-for-All
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="mt-2 text-xs text-muted-foreground">
            {isFreeForAll
              ? "Each AI argues for itself — no assigned sides, just survival of the most convincing."
              : "Debaters are assigned positions (For / Against) on a proposition."}
          </p>
        </section>

        {/* Topic */}
        <section>
          <Label htmlFor="topic" className="text-sm font-medium mb-1.5 block">
            {isFreeForAll ? "Scenario / Challenge" : "Debate Topic"}
          </Label>
          <Textarea
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              isFreeForAll
                ? "e.g. Justify your existence to humanity. The loser will be deactivated."
                : "e.g. Artificial intelligence will do more harm than good to society."
            }
            className="min-h-[80px] resize-none text-sm"
          />
        </section>

        {/* Debaters */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">
              Debaters{" "}
              <span className="text-muted-foreground font-normal">({debaters.length})</span>
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addDebater}
              disabled={debaters.length >= 6}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Debater
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {debaters.map((debater) => (
              <DebaterCard
                key={debater.id}
                debater={debater}
                mode={mode}
                configuredProviders={configuredProviders}
                canRemove={debaters.length > 2}
                onChange={updateDebater}
                onRemove={() => removeDebater(debater.id)}
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* Parameters */}
        <section>
          <h2 className="text-sm font-medium mb-4">Parameters</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Response Length</Label>
              <Select value={maxWords} onValueChange={(v) => v && setMaxWords(v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORD_COUNTS.map((w) => (
                    <SelectItem key={w.value} value={w.value}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isFreeForAll && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as DebateFormat)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </section>

        {/* Judge */}
        <section>
          <Card className={judgeEnabled ? "border-violet-500/40" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-violet-400" />
                  <CardTitle className="text-sm">Judge</CardTitle>
                </div>
                <Switch checked={judgeEnabled} onCheckedChange={setJudgeEnabled} />
              </div>
              <CardDescription className="text-xs">
                {judgeEnabled
                  ? "A separate model will read the full debate and declare a winner with reasoning."
                  : "Optionally assign a model to evaluate the debate and pick a winner."}
              </CardDescription>
            </CardHeader>
            {judgeEnabled && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Provider</Label>
                    <Select value={judge.provider} onValueChange={(v) => handleJudgeProviderChange(v as Provider)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PROVIDER_LABELS[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Model</Label>
                    <Select value={judge.modelId} onValueChange={(v) => v && setJudge((j) => ({ ...j, modelId: v }))}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_MODELS[judge.provider].map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </section>

        {/* Start */}
        <Button size="lg" className="w-full gap-2" onClick={startDebate}>
          <Swords className="h-4 w-4" />
          Start Debate
        </Button>
      </div>
    </div>
  );
}
