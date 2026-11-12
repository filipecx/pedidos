import { describe, it, expect, vi, beforeEach } from "vitest";
import { agentStoreStatusSchema } from "./schema";
import { changeStoreStatusController } from "./store-status.controller";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import * as storeServices from "@/server/modules/store/services";

// Mock do BetterAuth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock do Next headers
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// Mock do Next Cache revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock do Logger
vi.mock("@/lib/logger", () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock de store services
vi.mock("@/server/modules/store/services", () => ({
  updateStoreManualStatus: vi.fn(),
}));

describe("Módulo de IA - Alteração de Status da Loja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("agentStoreStatusSchema", () => {
    it("deve validar corretamente payload com status OPEN", () => {
      const res = agentStoreStatusSchema.safeParse({ status: "OPEN" });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.status).toBe("OPEN");
      }
    });

    it("deve validar corretamente payload com status CLOSED", () => {
      const res = agentStoreStatusSchema.safeParse({ status: "CLOSED" });
      expect(res.success).toBe(true);
    });

    it("deve validar corretamente payload com status AUTO", () => {
      const res = agentStoreStatusSchema.safeParse({ status: "AUTO" });
      expect(res.success).toBe(true);
    });

    it("deve validar payload com isOpen booleano", () => {
      const res = agentStoreStatusSchema.safeParse({ isOpen: false });
      expect(res.success).toBe(true);
    });

    it("deve rejeitar payload vazio sem status nem isOpen", () => {
      const res = agentStoreStatusSchema.safeParse({});
      expect(res.success).toBe(false);
    });
  });

  describe("changeStoreStatusController", () => {
    it("deve retornar 401 se o usuário não estiver autenticado", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const req = new NextRequest("http://localhost:3000/api/ai/store-status", {
        method: "POST",
        body: JSON.stringify({ status: "OPEN" }),
      });

      const res = await changeStoreStatusController(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Acesso negado");
    });

    it("deve retornar 401 se o usuário logado não for LOJISTA", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "user-cliente", role: "CLIENTE" },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/ai/store-status", {
        method: "POST",
        body: JSON.stringify({ status: "OPEN" }),
      });

      const res = await changeStoreStatusController(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("deve alterar status para OPEN usando o userId da sessão do lojista", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "user-lojista-1", role: "LOJISTA" },
      } as any);

      vi.mocked(storeServices.updateStoreManualStatus).mockResolvedValue({
        id: "store-123",
        userId: "user-lojista-1",
        manualIsOpen: true,
        slug: "doces-da-maria",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/ai/store-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "OPEN",
        }),
      });

      const res = await changeStoreStatusController(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.manualIsOpen).toBe(true);
      expect(json.data.status).toBe("OPEN");
      expect(storeServices.updateStoreManualStatus).toHaveBeenCalledWith("user-lojista-1", true);
    });

    it("deve alterar status para CLOSED usando o userId da sessão do lojista", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "user-lojista-2", role: "LOJISTA" },
      } as any);

      vi.mocked(storeServices.updateStoreManualStatus).mockResolvedValue({
        id: "store-456",
        userId: "user-lojista-2",
        manualIsOpen: false,
        slug: "bolos-do-joao",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/ai/store-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "CLOSED",
        }),
      });

      const res = await changeStoreStatusController(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.manualIsOpen).toBe(false);
      expect(json.data.status).toBe("CLOSED");
      expect(storeServices.updateStoreManualStatus).toHaveBeenCalledWith("user-lojista-2", false);
    });

    it("deve alterar status para AUTO (null) usando o userId da sessão do lojista", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "user-lojista-3", role: "LOJISTA" },
      } as any);

      vi.mocked(storeServices.updateStoreManualStatus).mockResolvedValue({
        id: "store-789",
        userId: "user-lojista-3",
        manualIsOpen: null,
        slug: "paes-artesanais",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/ai/store-status", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: "AUTO",
        }),
      });

      const res = await changeStoreStatusController(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.manualIsOpen).toBeNull();
      expect(json.data.status).toBe("AUTO");
      expect(storeServices.updateStoreManualStatus).toHaveBeenCalledWith("user-lojista-3", null);
    });

    it("deve retornar 400 se o JSON for inválido", async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        user: { id: "user-lojista-1", role: "LOJISTA" },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/ai/store-status", {
        method: "POST",
        body: "{ bad json",
      });

      const res = await changeStoreStatusController(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("JSON inválido");
    });
  });
});
