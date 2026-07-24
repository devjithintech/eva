import { GoogleGenAI, Type, type FunctionDeclaration, type Schema } from "@google/genai";
import { config } from "../config.js";
import { joinSystem, type LLMProvider, type LLMTool, type ProviderStreamEvent, type StreamChatOptions } from "./types.js";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: config.keys.gemini });
  return client;
}

/** Convert a JSON-Schema-ish object into the genai Schema enum form. */
function toGeminiSchema(schema: Record<string, unknown>): Schema {
  const t = (schema.type as string | undefined)?.toLowerCase();
  const map: Record<string, Type> = {
    object: Type.OBJECT,
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
  };
  const out: Schema = { type: map[t ?? "object"] ?? Type.OBJECT };
  if (schema.description) out.description = String(schema.description);
  if (schema.enum) out.enum = schema.enum as string[];
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties as Record<string, Record<string, unknown>>).map(
        ([k, v]) => [k, toGeminiSchema(v)],
      ),
    );
  }
  if (schema.items) out.items = toGeminiSchema(schema.items as Record<string, unknown>);
  if (Array.isArray(schema.required)) out.required = schema.required as string[];
  return out;
}

function toFunctionDeclarations(tools: LLMTool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: toGeminiSchema(tool.parameters),
  }));
}

export class GeminiProvider implements LLMProvider {
  readonly id = "gemini";

  isConfigured(): boolean {
    return Boolean(config.keys.gemini);
  }

  async *streamChat(opts: StreamChatOptions): AsyncIterable<ProviderStreamEvent> {
    const contents = opts.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const stream = await getClient().models.generateContentStream({
      model: opts.model,
      contents,
      config: {
        systemInstruction: joinSystem(opts.system),
        tools: opts.tools.length ? [{ functionDeclarations: toFunctionDeclarations(opts.tools) }] : undefined,
        abortSignal: opts.signal,
      },
    });

    let toolSeq = 0;
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield { type: "text", delta: text };

      for (const call of chunk.functionCalls ?? []) {
        yield {
          type: "tool",
          id: call.id ?? `gemini-tool-${toolSeq++}`,
          name: call.name ?? "",
          args: (call.args as Record<string, unknown>) ?? {},
        };
      }
    }
  }
}
