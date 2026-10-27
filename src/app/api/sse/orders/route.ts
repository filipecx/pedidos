import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "LOJISTA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Buscar a loja do lojista
    const store = await db.query.stores.findFirst({
      where: eq(stores.userId, session.user.id),
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // 3. Criar uma nova conexão do Redis apenas para esse Subscriber
    const subscriber = redis.duplicate();
    const channel = `store-orders:${store.id}`;

    await subscriber.subscribe(channel);

    // 4. Configurar a stream SSE
    const stream = new ReadableStream({
      start(controller) {
        // Enviar evento de conexão (útil para o frontend saber que conectou)
        controller.enqueue(`event: connected\ndata: ${JSON.stringify({ status: 'ok' })}\n\n`);

        subscriber.on("message", (ch, message) => {
          if (ch === channel) {
            // message é o JSON do pedido novo ou atualizado
            controller.enqueue(`event: new_order\ndata: ${message}\n\n`);
          }
        });

        // Limpeza quando o cliente fecha a conexão
        const cleanup = () => {
          try {
            if (subscriber.status === "ready" || subscriber.status === "connect") {
              subscriber.unsubscribe(channel).catch(() => {});
              subscriber.quit().catch(() => {});
            } else {
              subscriber.disconnect();
            }
          } catch (e) {
            // Ignora se já estiver fechado
          }
        };

        req.signal.addEventListener("abort", cleanup);
      },
      cancel() {
        try {
          if (subscriber.status === "ready" || subscriber.status === "connect") {
            subscriber.unsubscribe(channel).catch(() => {});
            subscriber.quit().catch(() => {});
          } else {
            subscriber.disconnect();
          }
        } catch (e) {
          // Ignora se já estiver fechado
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("SSE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
