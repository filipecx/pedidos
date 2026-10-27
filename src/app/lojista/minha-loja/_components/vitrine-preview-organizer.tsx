"use client";

import { useState } from "react";
import type { Category, Product, Store } from "@/db/schema";
import { reorderCategoriesAction, resetCategoriesOrderAction } from "@/server/modules/categories/actions";
import { reorderProductsAction, resetProductsOrderAction } from "@/server/modules/products/actions";
import { toast } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";

interface VitrinePreviewOrganizerProps {
  store: Store;
  initialCategories: Category[];
  initialProducts: Product[];
}

export function VitrinePreviewOrganizer({
  store,
  initialCategories,
  initialProducts,
}: VitrinePreviewOrganizerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<"pronta_entrega" | "encomenda">(
    store.layoutConfig?.defaultTab || "pronta_entrega"
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filtra produtos pela modalidade ativa da vitrine
  const currentProducts = products.filter((p) =>
    activeTab === "pronta_entrega" ? p.isProntaEntrega : p.isEncomenda
  );

  // Categorias que possuem produtos nesta modalidade
  const visibleCategories = categories.filter((cat) =>
    currentProducts.some((p) => p.categoryId === cat.id)
  );

  // Categorias vazias ou gerais
  const otherCategories = categories.filter(
    (cat) => !visibleCategories.some((vc) => vc.id === cat.id)
  );

  // Mover Categoria para Cima / Baixo
  const handleMoveCategory = async (catIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? catIndex - 1 : catIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    setIsLoading(true);
    const updated = [...categories];
    const [moved] = updated.splice(catIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setCategories(updated);

    const payload = {
      items: updated.map((c, idx) => ({ id: c.id, displayOrder: (idx + 1) * 10 })),
    };

    const res = await reorderCategoriesAction(payload);
    if (!res.success) {
      toast.error(res.error || "Erro ao reordenar categoria");
      setCategories(initialCategories);
    } else {
      toast.success("Ordem da vitrine atualizada!");
    }
    setIsLoading(false);
  };

  // Mover Produto para Cima / Baixo dentro da sua categoria
  const handleMoveProduct = async (
    categoryId: string,
    prodIndexWithinCat: number,
    direction: "up" | "down"
  ) => {
    const catProducts = currentProducts.filter((p) => p.categoryId === categoryId);
    const targetIndex = direction === "up" ? prodIndexWithinCat - 1 : prodIndexWithinCat + 1;
    if (targetIndex < 0 || targetIndex >= catProducts.length) return;

    setIsLoading(true);
    const reorderedCat = [...catProducts];
    const [moved] = reorderedCat.splice(prodIndexWithinCat, 1);
    reorderedCat.splice(targetIndex, 0, moved);

    // Atualiza a lista geral mantendo a nova ordem desse grupo
    const remainingProducts = products.filter((p) => p.categoryId !== categoryId);
    const updatedAll = [...remainingProducts, ...reorderedCat];
    setProducts(updatedAll);

    const payload = {
      items: reorderedCat.map((p, idx) => ({ id: p.id, displayOrder: (idx + 1) * 10 })),
    };

    const res = await reorderProductsAction(payload);
    if (!res.success) {
      toast.error(res.error || "Erro ao reordenar produto");
      setProducts(initialProducts);
    } else {
      toast.success("Posição do produto atualizada!");
    }
    setIsLoading(false);
  };

  // Restaurar ordem padrão de tudo
  const handleResetAll = async () => {
    if (!confirm("Restaurar a ordem padrão das categorias e produtos na vitrine?")) return;
    setIsLoading(true);
    const [catRes, prodRes] = await Promise.all([
      resetCategoriesOrderAction(),
      resetProductsOrderAction(),
    ]);

    if (catRes.success && prodRes.success) {
      toast.success("Ordem padrão restaurada com sucesso!");
      window.location.reload();
    } else {
      toast.error("Ocorreu um erro ao restaurar.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Controles e Dicas */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>Organizador Visual da Vitrine</span>
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Como seu cliente enxerga
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Clique nas setas das caixas para trocar a posição das seções ou produtos na tela do cliente.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            disabled={isLoading}
            className="text-xs text-gray-600 hover:text-red-600 border-dashed"
          >
            Restaurar Ordem Padrão
          </Button>
        </div>
      </div>

      {/* Seletor de Aba da Vitrine (Pronta-Entrega vs Encomenda) */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex gap-1 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab("pronta_entrega")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "pronta_entrega"
                ? "bg-primary text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Pronta-Entrega ({products.filter((p) => p.isProntaEntrega).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("encomenda")}
            className={`flex-1 py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "encomenda"
                ? "bg-primary text-white shadow-xs"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Encomenda ({products.filter((p) => p.isEncomenda).length})
          </button>
        </div>
      </div>

      {/* SIMULADOR DE VITRINE SIMPLIFICADO EM CAIXAS */}
      <div className="bg-gray-100/70 p-4 sm:p-6 rounded-3xl border border-gray-200 space-y-6">
        {/* Banner e Topo Representativo */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200 flex items-center justify-between text-xs text-gray-500 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-gray-800">Topo da Vitrine</span>
            <span className="text-gray-400">({store.name})</span>
          </div>
          <a
            href={`/${store.slug}`}
            target="_blank"
            className="text-primary hover:underline font-medium text-xs"
          >
            Abrir vitrine real &rarr;
          </a>
        </div>

        {visibleCategories.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-gray-200 text-gray-500">
            <p className="font-medium text-sm text-gray-700">Nenhum produto cadastrado nesta modalidade.</p>
            <p className="text-xs text-gray-400 mt-1">
              Cadastre produtos como {activeTab === "pronta_entrega" ? "Pronta-Entrega" : "Encomenda"} na aba Estoque.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleCategories.map((cat, catIndex) => {
              const catProds = currentProducts.filter((p) => p.categoryId === cat.id);

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition-all"
                >
                  {/* CABEÇALHO DA SEÇÃO / CATEGORIA COM CONTROLE DE ORDEM */}
                  <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center font-mono font-bold text-xs">
                        #{catIndex + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{cat.name}</h3>
                        <span className="text-[11px] text-gray-500">
                          {catProds.length} {catProds.length === 1 ? "produto" : "produtos"}
                        </span>
                      </div>
                    </div>

                    {/* Botoes de Subir / Descer a Categoria inteira na vitrine */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-gray-400 mr-1 hidden sm:inline">Ordem da Seção:</span>
                      <button
                        type="button"
                        disabled={catIndex === 0 || isLoading}
                        onClick={() => handleMoveCategory(catIndex, "up")}
                        aria-label="Subir categoria"
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold shadow-2xs"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={catIndex === visibleCategories.length - 1 || isLoading}
                        onClick={() => handleMoveCategory(catIndex, "down")}
                        aria-label="Descer categoria"
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold shadow-2xs"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  {/* GRADE DE CAIXINHAS DE PRODUTOS DENTRO DA CATEGORIA */}
                  <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {catProds.map((prod, prodIndex) => (
                        <div
                          key={prod.id}
                          className="bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-base shrink-0">
                                🍰
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 truncate">{prod.name}</p>
                              <p className="text-[11px] font-semibold text-primary">
                                {(prod.basePriceCents / 100).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Botoes de Subir / Descer o Produto na Grade */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={prodIndex === 0 || isLoading}
                              onClick={() => handleMoveProduct(cat.id, prodIndex, "up")}
                              aria-label="Mover produto para antes"
                              className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold transition-colors"
                            >
                              ◀
                            </button>
                            <span className="text-[10px] font-mono font-bold text-gray-400 px-1">
                              {prodIndex + 1}
                            </span>
                            <button
                              type="button"
                              disabled={prodIndex === catProds.length - 1 || isLoading}
                              onClick={() => handleMoveProduct(cat.id, prodIndex, "down")}
                              aria-label="Mover produto para depois"
                              className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold transition-colors"
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
