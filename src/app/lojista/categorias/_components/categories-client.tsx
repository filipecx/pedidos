"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Category } from "@/db/schema/categories";
import { 
  createCategoryAction, 
  deleteCategoryAction, 
  updateCategoryAction 
} from "@/server/modules/categories/actions";

interface Props {
  initialCategories: Category[];
}

// Utilitário para gerar o slug limpo e sem acentos
const generateSlug = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Substitui espaços por hífen
    .replace(/[^\w-]+/g, "") // Remove caracteres não-alfanuméricos
    .replace(/--+/g, "-"); // Remove múltiplos hífens
};

export function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do formulário (simplificados para não depender do react-hook-form no momento)
  const [formData, setFormData] = useState({ name: "", slug: "", description: "" });
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "" });
    setIsCreating(false);
    setEditingId(null);
    setError(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleEdit = (cat: Category) => {
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description || "" });
    setEditingId(cat.id);
    setIsCreating(false);
    setError(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    // Preenche o slug automaticamente apenas se estiver criando uma nova categoria
    if (isCreating) {
      setFormData({ ...formData, name: newName, slug: generateSlug(newName) });
    } else {
      setFormData({ ...formData, name: newName });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("slug", formData.slug);
    if (formData.description) data.append("description", formData.description);

    let result;

    if (editingId) {
      data.append("id", editingId);
      result = await updateCategoryAction(null, data);
    } else {
      result = await createCategoryAction(null, data);
    }

    if (!result.success) {
      setError(result.error || "Ocorreu um erro");
      setIsLoading(false);
      return;
    }

    window.location.reload(); 
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar esta categoria?")) return;
    
    setIsLoading(true);
    const result = await deleteCategoryAction(id);
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Listagem e Botão Principal */}
      {!isCreating && !editingId && (
        <>
          <div className="mb-6">
            <Button onClick={handleCreateNew}>+ Nova Categoria</Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nenhuma categoria cadastrada ainda.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <li key={cat.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      <p className="text-sm text-gray-500">/{cat.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEdit(cat)}>Editar</Button>
                      <Button variant="ghost" onClick={() => handleDelete(cat.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        Excluir
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Formulário de Criação/Edição */}
      {(isCreating || editingId) && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">
            {isCreating ? "Nova Categoria" : "Editar Categoria"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <Input 
              label="Nome da Categoria" 
              placeholder="ex: Bolos de Pote"
              value={formData.name}
              onChange={handleNameChange}
              required
            />
            
            <Input 
              label="Slug (URL amigável)" 
              placeholder="ex: bolos-de-pote"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
              required
              pattern="^[a-z0-9-]+$"
              title="Apenas letras minúsculas, números e hífens"
            />

            <Input 
              label="Descrição (Opcional)" 
              placeholder="Breve descrição da categoria"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={resetForm} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Salvar Categoria
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
