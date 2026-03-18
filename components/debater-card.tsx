"use client";

import { X, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Debater,
  DebateMode,
  DebatePosition,
  Provider,
  PROVIDER_MODELS,
  PROVIDER_LABELS,
  COLOR_STYLES,
} from "@/types/debate";

interface Props {
  debater: Debater;
  mode: DebateMode;
  configuredProviders: Record<string, boolean>;
  canRemove: boolean;
  onChange: (updated: Debater) => void;
  onRemove: () => void;
}

const POSITIONS: { value: DebatePosition; label: string }[] = [
  { value: "for", label: "For" },
  { value: "against", label: "Against" },
  { value: "neutral", label: "Neutral" },
];

const PROVIDERS: Provider[] = ["anthropic", "openai", "google", "xai"];

export function DebaterCard({ debater, mode, configuredProviders, canRemove, onChange, onRemove }: Props) {
  const styles = COLOR_STYLES[debater.color];
  const models = PROVIDER_MODELS[debater.provider];
  const keyMissing = !configuredProviders[debater.provider];
  const initials = debater.name.trim().slice(0, 2).toUpperCase() || "??";

  function set<K extends keyof Debater>(key: K, value: Debater[K]) {
    onChange({ ...debater, [key]: value });
  }

  function handleProviderChange(provider: Provider) {
    onChange({ ...debater, provider, modelId: PROVIDER_MODELS[provider][0].id });
  }

  return (
    <Card className={`border-l-2 ${styles.border} bg-card/60`}>
      <CardContent className="pt-4 pb-4 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar className={`h-7 w-7 rounded-md ${styles.avatarBg}`}>
              <AvatarFallback className={`rounded-md bg-transparent text-[10px] font-bold ${styles.text}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {debater.name || "Unnamed"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {keyMissing && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                No key
              </span>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Fields */}
        <FieldGroup className="gap-3">

          {/* Name */}
          <Field>
            <FieldLabel className="text-xs text-muted-foreground">Name</FieldLabel>
            <Input
              value={debater.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Claude, GPT, The Pessimist…"
              className="h-8 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            {/* Provider */}
            <Field>
              <FieldLabel className="text-xs text-muted-foreground">Provider</FieldLabel>
              <Select value={debater.provider} onValueChange={(v) => v && handleProviderChange(v as Provider)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-1.5">
                        {PROVIDER_LABELS[p]}
                        {!configuredProviders[p] && (
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Model */}
            <Field>
              <FieldLabel className="text-xs text-muted-foreground">Model</FieldLabel>
              <Select value={debater.modelId} onValueChange={(v) => v && set("modelId", v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Position — classic mode only */}
          {mode === "classic" && (
            <Field>
              <FieldLabel className="text-xs text-muted-foreground">Position</FieldLabel>
              <Select value={debater.position} onValueChange={(v) => v && set("position", v as DebatePosition)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

        </FieldGroup>
      </CardContent>
    </Card>
  );
}
