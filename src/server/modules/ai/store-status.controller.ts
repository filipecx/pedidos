import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { updateStoreManualStatus } from "@/server/modules/store/services";
import { agentStoreStatusSchema } from "@/server/modules/ai/schema";
import { createChildLogger } from "@/lib/logger";

const log = createChildLogger("controller:agent-store-status");

/**
 * Controller para alterar o status manual da loja via requisições do Agente de IA.
 * 
 * Reutiliza o fluxo seguro da aplicação:
 * 1. Extrai a sessão do lojista diretamente dos cookies/headers via BetterAuth.
 * 2. Valida o payload de entrada via Zod.
 * 3. Delega para a função de domínio `updateStoreManualStatus(userId, manualIsOpen)`.
 * 4. Revalida as rotas Next.js em cache.
 */
export async function changeStoreStatusController(req: NextRequest) {
  try {
    // 1. Validação de sessão do Lojista via Cookie/Headers
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || session.user.role !== "LOJISTA") {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Sessão de lojista necessária." },
        { status: 401 }
      );
    }

    // 2. Parse do corpo da requisição
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "JSON inválido no corpo da requisição." },
        { status: 400 }
      );
    }

    const parseResult = agentStoreStatusSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados de requisição inválidos.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { status, isOpen } = parseResult.data;

    // Normaliza para manualIsOpen (boolean | null)
    let manualIsOpen: boolean | null;
    if (typeof isOpen !== "undefined") {
      manualIsOpen = isOpen;
    } else if (status === "OPEN") {
      manualIsOpen = true;
    } else if (status === "CLOSED") {
      manualIsOpen = false;
    } else {
      manualIsOpen = null; // AUTO
    }

    // 3. Execução da regra de domínio utilizando o userId da sessão autenticada
    const updatedStore = await updateStoreManualStatus(session.user.id, manualIsOpen);

    // 4. Revalidação de caminhos em cache (Next.js)
    try {
      revalidatePath("/lojista/dashboard");
      revalidatePath("/lojista/minha-loja");
      revalidatePath("/lojista/pedidos");
      if (updatedStore.slug) {
        revalidatePath(`/${updatedStore.slug}`);
      }
    } catch (revalidateError) {
      log.warn({ err: revalidateError }, "Falha ao revalidar caminhos de cache");
    }

    log.info(
      { userId: session.user.id, storeId: updatedStore.id, manualIsOpen: updatedStore.manualIsOpen },
      "Status manual da loja atualizado pelo agente de IA"
    );

    return NextResponse.json({
      success: true,
      message: "Status da loja atualizado com sucesso.",
      data: {
        storeId: updatedStore.id,
        manualIsOpen: updatedStore.manualIsOpen,
        status:
          updatedStore.manualIsOpen === true
            ? "OPEN"
            : updatedStore.manualIsOpen === false
            ? "CLOSED"
            : "AUTO",
      },
    });
  } catch (error: any) {
    log.error({ err: error }, "Erro ao processar alteração de status da loja pelo agente");
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno do servidor ao atualizar status da loja.",
      },
      { status: 500 }
    );
  }
}
