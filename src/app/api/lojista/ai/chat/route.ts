import { auth } from "@/lib/auth";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

const chatInputSchema = z.object({
  message: z.string().trim().min(1, "A mensagem não pode estar vazia."),
  session_id: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });

  if (!session || session.user.role !== "LOJISTA") {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    return Response.json({ error: "Loja não encontrada." }, { status: 404 });
  }

  let incomingForm: FormData;
  try {
    incomingForm = await request.formData();
  } catch {
    return Response.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = chatInputSchema.safeParse({
    message: incomingForm.get("message"),
    session_id: incomingForm.get("session_id") || undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
  const upstreamForm = new FormData();
  upstreamForm.append("message", parsed.data.message);
  upstreamForm.append("store_id", store.id);
  // Isola a thread por loja e usuário para evitar colisão entre lojistas
  const scopedSessionId = parsed.data.session_id
    ? `${store.id}:${parsed.data.session_id}`
    : `${store.id}:default`;
  upstreamForm.append("session_id", scopedSessionId);

  const image = incomingForm.get("image");
  if (image instanceof File && image.size > 0) {
    upstreamForm.append("image", image, image.name);
  }

  const cookieHeader = reqHeaders.get("cookie") ?? "";
  const requestHeaders: Record<string, string> = {
    "x-store-id": store.id,
  };
  if (cookieHeader) {
    requestHeaders["cookie"] = cookieHeader;
  }

  try {
    const upstreamResponse = await fetch(`${aiServiceUrl}/chat/stream`, {
      method: "POST",
      headers: requestHeaders,
      body: upstreamForm,
      signal: request.signal,
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const errorText = await upstreamResponse.text().catch(() => "");
      return Response.json(
        { error: errorText || "Erro ao comunicar com o assistente de IA." },
        { status: upstreamResponse.status || 502 }
      );
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return new Response(null, { status: 499 });
    }
    return Response.json(
      { error: "Serviço de IA indisponível no momento." },
      { status: 502 }
    );
  }
}
