import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider } from "@/types/debate";

export interface StreamTurnParams {
  provider: Provider;
  modelId: string;
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
}

export async function streamTurn(params: StreamTurnParams): Promise<ReadableStream<Uint8Array>> {
  const { provider, modelId, systemPrompt, userMessage, maxTokens } = params;
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        switch (provider) {
          case "anthropic": {
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
            const client = new Anthropic({ apiKey });
            const stream = client.messages.stream({
              model: modelId,
              max_tokens: maxTokens,
              system: systemPrompt,
              messages: [{ role: "user", content: userMessage }],
            });
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            break;
          }

          case "openai": {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
            const client = new OpenAI({ apiKey });
            const stream = await client.chat.completions.create({
              model: modelId,
              max_tokens: maxTokens,
              stream: true,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
            });
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            }
            break;
          }

          case "xai": {
            const apiKey = process.env.XAI_API_KEY;
            if (!apiKey) throw new Error("XAI_API_KEY is not set");
            const client = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
            const stream = await client.chat.completions.create({
              model: modelId,
              max_tokens: maxTokens,
              stream: true,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
              ],
            });
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            }
            break;
          }

          case "google": {
            const apiKey = process.env.GOOGLE_API_KEY;
            if (!apiKey) throw new Error("GOOGLE_API_KEY is not set");
            const genai = new GoogleGenerativeAI(apiKey);
            const model = genai.getGenerativeModel({
              model: modelId,
              systemInstruction: systemPrompt,
            });
            const result = await model.generateContentStream(userMessage);
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) controller.enqueue(encoder.encode(text));
            }
            break;
          }

          default:
            throw new Error(`Unknown provider: ${provider}`);
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
