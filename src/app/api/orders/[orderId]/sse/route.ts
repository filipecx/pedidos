import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  if (!orderId) {
    return new Response("Missing orderId", { status: 400 });
  }

  // Criamos um clone da conexão Redis porque um cliente "subscriber"
  // fica bloqueado apenas para receber eventos e não pode emitir comandos (get/set).
  const subscriber = redis.duplicate();

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Envia headers de SSE imediatos e um heartbeat de keep-alive
      // Isso impede que a conexão caia por inatividade em proxies como Cloudflare/Nginx.
      const heartbeat = setInterval(() => {
        controller.enqueue(": heartbeat\n\n");
      }, 30000);

      const channel = `order:${orderId}:events`;

      // 2. Inscreve-se no canal exclusivo desse pedido no Redis
      await subscriber.subscribe(channel);

      subscriber.on("message", (ch, message) => {
        if (ch === channel) {
          // Envia o payload no padrão Server-Sent Events (SSE)
          controller.enqueue(`data: ${message}\n\n`);
        }
      });

      // 3. Cleanup: O usuário fechou a aba ou a conexão caiu
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscriber.unsubscribe(channel);
        subscriber.quit();
        controller.close();
      });
    },
    cancel() {
      // Garantia dupla de desconexão
      subscriber.quit();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
