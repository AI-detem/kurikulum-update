import Anthropic from '@anthropic-ai/sdk';
import { isCategoryCode } from '@/lib/categories';
import { buildSystemPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Chybí ANTHROPIC_API_KEY.' }, { status: 500 });
  }

  let body: { category?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  const { category, messages } = body;
  if (!isCategoryCode(category)) {
    return Response.json({ error: 'Neznámá nebo chybějící kategorie žáka.' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Prázdná konverzace.' }, { status: 400 });
  }

  const apiMessages: Anthropic.MessageParam[] = (messages as ChatMessage[])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }));

  let system: Anthropic.TextBlockParam[];
  try {
    system = buildSystemPrompt(category);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Chyba katalogu.' }, { status: 500 });
  }

  const client = new Anthropic();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: 'disabled' },
    system,
    messages: apiMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chyba při generování odpovědi.';
        controller.enqueue(encoder.encode(`\n\n⚠️ ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
