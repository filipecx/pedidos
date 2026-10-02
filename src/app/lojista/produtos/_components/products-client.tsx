"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Product } from "@/db/schema/products";
import { Category } from "@/db/schema/categories";
import { 
  createProductAction, 
  deleteProductAction, 
  updateProductAction 
} from "@/server/modules/products/actions";

interface Props {
  initialProducts: Product[]; // Note: Prop name updated in next step if necessary, but actually we learned to just use the prop directly.
  categories: Category[];
}

export function ProductsClient({ initialProducts: products, categories }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados do formulário
  const [formData, setFormData] = useState({ 
    name: "", 
    categoryId: "",
    description: "",
    basePriceCents: "",
    type: "PRONTA_ENTREGA" as "PRONTA_ENTREGA" | "ENCOMENDA",
    stockQuantity: "",
    preparationTimeDays: "",
  });

  const resetForm = () => {
    setFormData({ 
      name: "", 
      categoryId: "",
      description: "",
      basePriceCents: "",
      type: "PRONTA_ENTREGA",
      stockQuantity: "",
      preparationTimeDays: "",
    });
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleEdit = (prod: Product) => {
    setFormData({ 
      name: prod.name, 
      categoryId: prod.categoryId,
      description: prod.description || "",
      basePriceCents: (prod.basePriceCents / 100).toFixed(2), // Mostrando em Reais no form
      type: prod.type,
      stockQuantity: prod.stockQuantity?.toString() || "",
      preparationTimeDays: prod.preparationTimeDays?.toString() || "",
    });
    setEditingId(prod.id);
    setIsCreating(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("categoryId", formData.categoryId);
    data.append("type", formData.type);
    
    // Converter R$ para centavos
    const priceCents = Math.round(parseFloat(formData.basePriceCents.replace(',', '.')) * 100);
    data.append("basePriceCents", priceCents.toString());

    if (formData.description) data.append("description", formData.description);
    
    if (formData.type === "PRONTA_ENTREGA" && formData.stockQuantity) {
      data.append("stockQuantity", formData.stockQuantity);
    }
    
    if (formData.type === "ENCOMENDA" && formData.preparationTimeDays) {
      data.append("preparationTimeDays", formData.preparationTimeDays);
    }

    let result;

    if (editingId) {
      data.append("id", editingId);
      result = await updateProductAction(null, data);
    } else {
      result = await createProductAction(null, data);
    }

    if (!result.success) {
      setError(result.error || "Ocorreu um erro");
      setIsLoading(false);
      return;
    }

    resetForm();
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este produto?")) return;
    
    setIsLoading(true);
    const result = await deleteProductAction(id);
    if (!result.success) {
      alert(result.error);
    }
    setIsLoading(false);
  };

  // Prepara as opções para o Select
  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));
  const typeOptions = [
    { value: "PRONTA_ENTREGA", label: "Pronta Entrega" },
    { value: "ENCOMENDA", label: "Feito sob Encomenda" }
  ];

  return (
    <div>
      {/* Aviso se não houver categorias */}
      {categories.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200">
          Você precisa criar pelo menos uma <strong>Categoria</strong> antes de adicionar produtos.
        </div>
      )}

      {/* Listagem */}
      {!isCreating && !editingId && (
        <>
          <div className="mb-6">
            <Button onClick={handleCreateNew} disabled={categories.length === 0}>
              + Novo Produto
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {products.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhum produto cadastrado.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {products.map((prod) => {
                  const catName = categories.find(c => c.id === prod.categoryId)?.name;
                  return (
                    <li key={prod.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                        <h3 className="font-semibold text-gray-900">{prod.name}</h3>
                        <p className="text-sm text-gray-500">
                          {catName} • {(prod.basePriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded-full ${prod.type === 'PRONTA_ENTREGA' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {prod.type === 'PRONTA_ENTREGA' ? `Estoque: ${prod.stockQuantity}` : `Preparo: ${prod.preparationTimeDays} dias`}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleEdit(prod)}>Editar</Button>
                        <Button variant="ghost" onClick={() => handleDelete(prod.id)} className="text-red-600 hover:bg-red-50">
                          Excluir
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Formulário */}
      {(isCreating || editingId) && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">
            {isCreating ? "Novo Produto" : "Editar Produto"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Nome do Produto" 
                placeholder="ex: Bolo de Cenoura"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Select 
                label="Categoria"
                options={categoryOptions}
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
              />

              <Input 
                label="Preço Base (R$)" 
                placeholder="ex: 15,00"
                value={formData.basePriceCents}
                onChange={(e) => setFormData({ ...formData, basePriceCents: e.target.value })}
                required
              />

              <Select 
                label="Disponibilidade"
                options={typeOptions}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                required
              />

              {formData.type === "PRONTA_ENTREGA" && (
                <Input 
                  label="Quantidade em Estoque" 
                  type="number"
                  min="0"
                  placeholder="ex: 10"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  required
                />
              )}

              {formData.type === "ENCOMENDA" && (
                <Input 
                  label="Tempo de Preparo (Dias)" 
                  type="number"
                  min="1"
                  placeholder="ex: 3"
                  value={formData.preparationTimeDays}
                  onChange={(e) => setFormData({ ...formData, preparationTimeDays: e.target.value })}
                  required
                />
              )}
            </div>

            <Input 
              label="Descrição (Opcional)" 
              placeholder="Descreva os ingredientes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
              <Button type="button" variant="ghost" onClick={resetForm} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Salvar Produto
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
