"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pause, Play, Square, ArrowLeft, Gavel, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  DebateConfig,
  DebateMessage,
  Debater,
  COLOR_STYLES,
  PROVIDER_LABELS,
} from "@/types/debate";

type DebateStatus = "running" | "paused" | "checkpoint" | "judging" | "done";

interface Checkpoint {
  round: number;
  resolve: (action: "continue" | "end", comment?: string) => void;
}

export default function DebatePage() {
  const router = useRouter();
  const [config, setConfig] = useState<DebateConfig | null>(null);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [status, setStatus] = useState<DebateStatus>("running");
  const [currentRound, setCurrentRound] = useState(1);
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [moderatorInput, setModeratorInput] = useState("");
  const [judgeVerdict, setJudgeVerdict] = useState("");
  const [judgeStreaming, setJudgeStreaming] = useState(false);

  const messagesRef = useRef<DebateMessage[]>([]);
  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false); // guard against React strict-mode double-invoke
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, judgeVerdict, checkpoint]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const raw = sessionStorage.getItem("debateConfig");
    if (!raw) { router.replace("/setup"); return; }
    try {
      const cfg = JSON.parse(raw) as DebateConfig;
      setConfig(cfg);
      startDebate(cfg);
    } catch {
      router.replace("/setup");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Message helpers ──────────────────────────────────────────────────────────

  function addMessage(msg: DebateMessage) {
    messagesRef.current = [...messagesRef.current, msg];
    setMessages([...messagesRef.current]);
  }

  function finalizeMessage(id: string, msgStatus: DebateMessage["status"]) {
    messagesRef.current = messagesRef.current.map((m) =>
      m.id === id ? { ...m, status: msgStatus } : m
    );
    setMessages([...messagesRef.current]);
  }

  function appendChunk(id: string, chunk: string) {
    messagesRef.current = messagesRef.current.map((m) =>
      m.id === id ? { ...m, content: m.content + chunk } : m
    );
    setMessages([...messagesRef.current]);
  }

  // ── Streaming ────────────────────────────────────────────────────────────────

  async function streamTurn(debater: Debater, round: number, cfg: DebateConfig) {
    const messageId = crypto.randomUUID();
    addMessage({ id: messageId, debaterId: debater.id, round, content: "", status: "streaming", timestamp: Date.now() });

    const controller = new AbortController();
    abortRef.current = controller;

    let res: Response;
    try {
      res = await fetch("/api/debate/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          debater,
          config: cfg,
          history: messagesRef.current.filter((m) => m.status === "done" || m.debaterId === "moderator"),
          currentRound: round,
        }),
      });
    } catch (err) {
      const isAbort = (err as Error).name === "AbortError";
      finalizeMessage(messageId, "error");
      if (!isAbort) toast.error(`${debater.name} failed to respond`);
      throw err;
    }

    if (!res.ok || !res.body) {
      finalizeMessage(messageId, "error");
      toast.error(`${debater.name} failed to respond`);
      throw new Error("Stream failed");
    }

    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendChunk(messageId, decoder.decode(value, { stream: true }));
      }
      finalizeMessage(messageId, "done");
    } catch (err) {
      const isAbort = (err as Error).name === "AbortError";
      finalizeMessage(messageId, "error");
      if (!isAbort) toast.error(`${debater.name} failed to respond`);
      throw err;
    }
  }

  async function streamJudge(cfg: DebateConfig) {
    setStatus("judging");
    setJudgeStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/debate/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          judge: cfg.judge,
          config: cfg,
          history: messagesRef.current.filter((m) => m.status === "done" || m.debaterId === "moderator"),
        }),
      });

      if (!res.ok || !res.body) {
        toast.error("Judge failed to respond");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setJudgeVerdict((v) => v + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Judge failed to respond");
    } finally {
      setJudgeStreaming(false);
    }
  }

  // ── Checkpoint (human moderation pause) ─────────────────────────────────────

  function waitForCheckpoint(round: number): Promise<{ action: "continue" | "end"; comment?: string }> {
    return new Promise((resolve) => {
      setCheckpoint({
        round,
        resolve: (action, comment) => resolve({ action, comment }),
      });
      setStatus("checkpoint");
    });
  }

  function handleCheckpointAction(action: "continue" | "end") {
    if (!checkpoint) return;
    const comment = moderatorInput.trim() || undefined;
    setModeratorInput("");
    checkpoint.resolve(action, comment);
    setCheckpoint(null);
  }

  // ── Pause / resume ───────────────────────────────────────────────────────────

  async function waitIfPaused() {
    while (isPausedRef.current && !isStoppedRef.current) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  function handlePause() {
    isPausedRef.current = true;
    setStatus("paused");
  }

  function handleResume() {
    isPausedRef.current = false;
    setStatus("running");
  }

  function handleStop() {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    abortRef.current?.abort();
    setCheckpoint(null);
    setStatus("done");
  }

  // ── Main debate loop ─────────────────────────────────────────────────────────

  async function startDebate(cfg: DebateConfig) {
    let round = 1;

    try {
      while (!isStoppedRef.current) {
        setCurrentRound(round);
        setStatus("running");

        // Run all debaters for this round
        for (const debater of cfg.debaters) {
          if (isStoppedRef.current) break;
          await waitIfPaused();
          await streamTurn(debater, round, cfg);
        }

        if (isStoppedRef.current) break;

        // Human checkpoint after every round
        const { action, comment } = await waitForCheckpoint(round);

        if (comment) {
          // Add moderator message to history
          addMessage({
            id: crypto.randomUUID(),
            debaterId: "moderator",
            round,
            content: comment,
            status: "done",
            timestamp: Date.now(),
          });
        }

        if (action === "end") break;

        round++;
      }
    } catch {
      // handled per-turn
    }

    if (!isStoppedRef.current && cfg.judge) {
      await streamJudge(cfg);
    }

    setStatus("done");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (!config) return null;

  const debaterMap = Object.fromEntries(config.debaters.map((d) => [d.id, d]));

  const statusLabel: Record<DebateStatus, string> = {
    running: "Live",
    paused: "Paused",
    checkpoint: "Paused",
    judging: "Judging",
    done: "Done",
  };

  const isActive = status === "running" || status === "paused";

  // Group messages by round
  const rounds = Array.from(
    new Set(messages.filter((m) => m.debaterId !== "moderator").map((m) => m.round))
  );

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <Badge variant={status === "running" ? "default" : "secondary"} className="text-[11px]">
                {statusLabel[status]}
              </Badge>
              <span className="text-xs text-muted-foreground">Round {currentRound}</span>
              <div className="flex -space-x-1.5">
                {config.debaters.map((d) => {
                  const s = COLOR_STYLES[d.color];
                  return (
                    <Avatar key={d.id} className={`h-5 w-5 rounded-md ring-1 ring-background ${s.avatarBg}`}>
                      <AvatarFallback className={`rounded-md bg-transparent text-[8px] font-bold ${s.text}`}>
                        {d.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  );
                })}
              </div>
            </div>
            <p className="truncate text-sm font-medium leading-snug">{config.topic}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {status === "running" && (
              <Button variant="outline" size="sm" onClick={handlePause} className="h-8 gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
            )}
            {status === "paused" && (
              <Button variant="outline" size="sm" onClick={handleResume} className="h-8 gap-1.5">
                <Play className="h-3.5 w-3.5" /> Resume
              </Button>
            )}
            {isActive && (
              <Button variant="destructive" size="sm" onClick={handleStop} className="h-8 gap-1.5">
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            )}
            {status === "done" && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" render={<Link href="/setup" />}>
                <ArrowLeft className="h-3.5 w-3.5" /> New Debate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-6">

          {rounds.map((round) => {
            // All messages (including moderator) for this round's section
            const roundMessages = messages.filter((m) => m.round === round);

            return (
              <div key={round} className="flex flex-col gap-2">
                {/* Round divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-xs font-medium text-muted-foreground">Round {round}</span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                {roundMessages.map((msg) => {
                  // Moderator message
                  if (msg.debaterId === "moderator") {
                    return (
                      <div key={msg.id} className="flex items-center gap-3 py-1">
                        <div className="h-px flex-1 bg-amber-500/20" />
                        <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-medium">Moderator:</span>
                          <span>{msg.content}</span>
                        </div>
                        <div className="h-px flex-1 bg-amber-500/20" />
                      </div>
                    );
                  }

                  // Debater message
                  const debater = debaterMap[msg.debaterId];
                  if (!debater) return null;
                  const s = COLOR_STYLES[debater.color];
                  const isStreaming = msg.status === "streaming";
                  const isError = msg.status === "error";

                  return (
                    <div key={msg.id} className={`flex gap-3 rounded-lg border-l-2 bg-card/40 p-4 ${s.border}`}>
                      <Avatar className={`h-7 w-7 shrink-0 rounded-md ${s.avatarBg}`}>
                        <AvatarFallback className={`rounded-md bg-transparent text-[10px] font-bold ${s.text}`}>
                          {debater.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`text-sm font-semibold ${s.text}`}>{debater.name}</span>
                          <span className="text-xs text-muted-foreground">{PROVIDER_LABELS[debater.provider]}</span>
                          {debater.position !== "self" && (
                            <Badge variant="outline" className={`border px-1.5 py-0 text-[10px] ${s.badge}`}>
                              {debater.position}
                            </Badge>
                          )}
                          {isStreaming && <Spinner className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isError ? "text-destructive" : "text-foreground/90"}`}>
                          {msg.content}
                          {isStreaming && (
                            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground/50 align-middle" />
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* ── Round checkpoint ── */}
          {checkpoint && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="shrink-0 text-sm font-semibold">Round {checkpoint.round} Complete</span>
                <Separator className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                Steer the next round with a moderator comment, or end the debate and call the judge.
              </p>
              <Textarea
                placeholder="Add a moderator comment to redirect or challenge the debaters… (optional)"
                value={moderatorInput}
                onChange={(e) => setModeratorInput(e.target.value)}
                className="min-h-[72px] resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCheckpointAction("end")}>
                  {config.judge ? "End & Call Judge" : "End Debate"}
                </Button>
                <Button size="sm" onClick={() => handleCheckpointAction("continue")}>
                  Continue to Round {checkpoint.round + 1} →
                </Button>
              </div>
            </div>
          )}

          {/* ── Judge verdict ── */}
          {(judgeVerdict || judgeStreaming) && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border/40" />
                <span className="flex items-center gap-1.5 text-xs font-medium text-violet-400">
                  <Gavel className="h-3 w-3" /> Verdict
                </span>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="flex gap-3 rounded-lg border-l-2 border-violet-500/40 bg-card/40 p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/20">
                  <Gavel className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-violet-400">Judge</span>
                    {config.judge && (
                      <span className="text-xs text-muted-foreground">{PROVIDER_LABELS[config.judge.provider]}</span>
                    )}
                    {judgeStreaming && <Spinner className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {judgeVerdict}
                    {judgeStreaming && (
                      <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground/50 align-middle" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
