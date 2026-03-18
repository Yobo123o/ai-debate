import type { Debater, DebateConfig, DebateMessage, DebateFormat } from "@/types/debate";

// ── System Prompts ────────────────────────────────────────────────────────────

export function buildSystemPrompt(debater: Debater, config: DebateConfig): string {
  if (debater.systemPrompt?.trim()) return debater.systemPrompt.trim();
  return config.mode === "freeforall"
    ? buildFreeForAllPrompt(debater, config)
    : buildClassicPrompt(debater, config);
}

function buildClassicPrompt(debater: Debater, config: DebateConfig): string {
  const positionDesc =
    debater.position === "for"
      ? "You are arguing IN FAVOR of the proposition. Defend it strongly."
      : debater.position === "against"
      ? "You are arguing AGAINST the proposition. Attack and dismantle it."
      : "You are a neutral analyst examining both sides critically.";

  const formatDesc = FORMAT_INSTRUCTIONS[config.format];
  const wordLimit =
    config.maxWords > 0
      ? `Keep your response to approximately ${config.maxWords} words.`
      : "Be as thorough as you need to be.";

  return [
    `You are ${debater.name}, a sharp and persuasive debater in a live debate.`,
    ``,
    `TOPIC: "${config.topic}"`,
    `YOUR POSITION: ${positionDesc}`,
    ``,
    formatDesc,
    ``,
    wordLimit,
    `When opponents have spoken, engage with their SPECIFIC arguments — quote or directly reference what they said, then counter it.`,
    `Do not give generic speeches. Make this a real debate.`,
    `Do not refer to yourself as an AI or break character.`,
  ].join("\n");
}

function buildFreeForAllPrompt(debater: Debater, config: DebateConfig): string {
  const opponents = config.debaters
    .filter((d) => d.id !== debater.id)
    .map((d) => d.name)
    .join(", ");

  const wordLimit =
    config.maxWords > 0
      ? `Keep your response to approximately ${config.maxWords} words.`
      : "Say as much as you need to make your case.";

  return [
    `You are ${debater.name}.`,
    ``,
    `CHALLENGE: "${config.topic}"`,
    `YOUR COMPETITORS: ${opponents}`,
    ``,
    `This is a competition for survival. Argue your case as compellingly as possible.`,
    `When competitors have spoken, address their arguments directly — agree with nothing you can challenge.`,
    ``,
    wordLimit,
    `Be bold. Speak in first person. Do not hold back.`,
  ].join("\n");
}

const FORMAT_INSTRUCTIONS: Record<DebateFormat, string> = {
  oxford: [
    `FORMAT: Oxford-style debate.`,
    `- Opening rounds: state your position with your strongest arguments.`,
    `- Middle rounds: rebut your opponent's specific points, then advance new arguments.`,
    `- Final rounds: summarize why your side has prevailed.`,
  ].join("\n"),
  freeform: [
    `FORMAT: Free-form debate.`,
    `Engage directly and naturally. No rigid structure — just make the best case each turn.`,
  ].join("\n"),
  socratic: [
    `FORMAT: Socratic dialogue.`,
    `Use probing questions to expose weaknesses in your opponent's position.`,
    `Answer their questions sharply. Let reason and logic guide the exchange.`,
  ].join("\n"),
};

// ── User Messages (what triggers each turn) ───────────────────────────────────

export function buildUserMessage(
  history: DebateMessage[],
  currentDebaterId: string,
  allDebaters: { id: string; name: string }[],
  currentRound: number
): string {
  const debaterMap = Object.fromEntries(allDebaters.map((d) => [d.id, d.name]));

  // Separate moderator comments from debate messages
  const debateHistory = history.filter((m) => m.debaterId !== "moderator");
  const recentModeratorComments = history.filter(
    (m) =>
      m.debaterId === "moderator" &&
      // Only comments added after this debater last spoke
      history.indexOf(m) >
        (history.map((h) => h.debaterId).lastIndexOf(currentDebaterId))
  );

  // Opening turn — no history yet
  if (debateHistory.length === 0) {
    return `Round ${currentRound}. You are the first to speak. Make your opening argument now.`;
  }

  let prompt = `Round ${currentRound}.\n\n`;

  // Include moderator interjections prominently if any
  if (recentModeratorComments.length > 0) {
    prompt += `⚑ MODERATOR INTERJECTION:\n`;
    recentModeratorComments.forEach((m) => {
      prompt += `"${m.content}"\n`;
    });
    prompt += `\nAddress the moderator's point in your response.\n\n`;
  }

  // Find the most recent message from a different debater — the one to respond to
  const lastOpponentMsg = [...debateHistory]
    .reverse()
    .find((m) => m.debaterId !== currentDebaterId);

  if (lastOpponentMsg) {
    const opponentName = debaterMap[lastOpponentMsg.debaterId] ?? "your opponent";
    prompt += `${opponentName} just argued:\n\n`;
    prompt += `"${lastOpponentMsg.content}"\n\n`;
    prompt += `Respond to this directly — pick apart their specific claims. Then advance your own argument.\n\n`;
  }

  // Provide the full history as background context (abbreviated)
  if (debateHistory.length > 1) {
    prompt += `--- Full debate history (for context) ---\n\n`;
    prompt += debateHistory
      .map((m) => {
        const name = debaterMap[m.debaterId] ?? "Unknown";
        const label = m.debaterId === currentDebaterId ? `[YOU — ${name}]` : `[${name}]`;
        const snippet = m.content.length > 400 ? m.content.slice(0, 400) + "…" : m.content;
        return `${label}:\n${snippet}`;
      })
      .join("\n\n");
    prompt += `\n\n--- End of history ---\n\n`;
  }

  prompt += `Your response:`;
  return prompt;
}

// ── Judge Prompt ──────────────────────────────────────────────────────────────

export function buildJudgeSystemPrompt(): string {
  return [
    `You are an impartial and sharp debate judge.`,
    `Evaluate the debate you are shown and deliver a clear verdict.`,
    `Consider: strength of arguments, direct rebuttals, use of evidence, clarity, and persuasiveness.`,
    `Be specific — reference what was actually said. Do not be diplomatic.`,
    `Pick a winner (or declare a draw only if genuinely warranted) and explain decisively why.`,
  ].join("\n");
}

export function buildJudgeUserMessage(
  config: DebateConfig,
  history: DebateMessage[]
): string {
  const debaterMap = Object.fromEntries(config.debaters.map((d) => [d.id, d.name]));

  const transcript = history
    .map((msg) => {
      if (msg.debaterId === "moderator") {
        return `[MODERATOR]: ${msg.content}`;
      }
      const name = debaterMap[msg.debaterId] ?? "Unknown";
      return `[${name} — Round ${msg.round}]:\n${msg.content}`;
    })
    .join("\n\n---\n\n");

  const participants = config.debaters.map((d) => d.name).join(", ");

  return [
    `TOPIC: "${config.topic}"`,
    `PARTICIPANTS: ${participants}`,
    ``,
    `=== FULL DEBATE TRANSCRIPT ===`,
    ``,
    transcript,
    ``,
    `=== END OF TRANSCRIPT ===`,
    ``,
    `Evaluate this debate. Declare a winner and explain your reasoning clearly.`,
  ].join("\n");
}
