"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageName?: string;
}

interface DashboardAiChatProps {
  storeName: string;
}

const QUICK_PROMPTS = [
  "Como foram minhas vendas hoje?",
  "Quais produtos estão com estoque baixo?",
  "Quais pedidos estão pendentes?",
  "Qual o status atual da minha loja?",
];

export function DashboardAiChat({ storeName }: DashboardAiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Date.now()}`
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsStreaming(false);
  };

  const sendMessage = async (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || isStreaming) return;

    setError(null);
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;
    const imageToSend = selectedImage;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: trimmed,
        imageName: imageToSend?.name,
      },
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
      },
    ]);

    if (!textToSend) {
      setInput("");
    }
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    try {
      const formData = new FormData();
      formData.append("message", trimmed);
      formData.append("session_id", sessionId);
      if (imageToSend) {
        formData.append("image", imageToSend);
      }

      const response = await fetch("/api/lojista/ai/chat", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.error || "Não foi possível obter resposta do assistente."
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          const line = eventBlock
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;

          const rawJson = line.slice(6).trim();
          if (!rawJson) continue;

          try {
            const parsed = JSON.parse(rawJson) as {
              type: "token" | "done" | "error";
              content?: string;
              detail?: string;
            };

            if (parsed.type === "token" && parsed.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + parsed.content }
                    : m
                )
              );
            } else if (parsed.type === "error") {
              throw new Error(parsed.detail || "Erro durante o processamento.");
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      let message =
        err instanceof Error ? err.message : "Erro ao conversar com a IA.";
      if (message.includes("503") || message.includes("UNAVAILABLE") || message.includes("high demand")) {
        message = "O assistente está com alta demanda no momento. Por favor, tente novamente em instantes.";
      }
      setError(message);
      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantMsgId && m.content === ""))
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-14rem)] min-h-[460px] max-h-[760px] overflow-hidden">
      {/* Cabeçalho do Chat */}
      <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gray-50/60">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            Assistente da {storeName}
          </h3>
          <p className="text-xs text-gray-500">
            Consulte vendas, estoque, pedidos ou peça ações na sua loja em tempo real.
          </p>
        </div>
        {isStreaming && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStop}
            className="shrink-0"
          >
            Parar
          </Button>
        )}
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              Como posso ajudar na sua loja hoje?
            </p>
            <p className="text-xs text-gray-500 mt-1 mb-5 max-w-md">
              Pergunte sobre faturamento, produtos ou peça para atualizar estoque e status de pedidos.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-xl">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                }`}
              >
                {msg.imageName && (
                  <p className="text-xs opacity-80 mb-1 font-medium">
                    📎 {msg.imageName}
                  </p>
                )}
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <span className="animate-pulse">Pensando...</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Erro */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Formulário de Envio */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 border-t border-gray-100 bg-white space-y-2"
      >
        {selectedImage && (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700">
            <span className="truncate">📎 {selectedImage.name}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-gray-400 hover:text-gray-700 ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            title="Anexar imagem"
            className="shrink-0"
          >
            📎
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta ou comando..."
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="shrink-0"
          >
            {isStreaming ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </form>
    </section>
  );
}
