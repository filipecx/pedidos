"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Product } from "@/db/schema/products";
import { Category } from "@/db/schema/categories";
import { 
  createProductAction, 
  deleteProductAction, 
  updateProductAction,
  quickUpdateProductStockAction,
} from "@/server/modules/products/actions";
import { createCategoryAction } from "@/server/modules/categories/actions";
import { ImageCropModal } from "./image-crop-modal";
import { toast } from "@/lib/toast-store";

interface Props {
  initialProducts: Product[]; 
  categories: Category[];
}

const generateSlug = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]+/g, "").replace(/--+/g, "-");
};

export function ProductsClient({ initialProducts: products, categories }: Props) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({ 
    name: "", 
    categoryId: "",
    description: "",
    basePriceCents: "",
    isProntaEntrega: false,
    isEncomenda: false,
    stockQuantity: "",
    preparationTimeDays: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);

  const resetForm = () => {
    setFormData({ 
      name: "", categoryId: "", description: "", basePriceCents: "",
      isProntaEntrega: false, isEncomenda: false, stockQuantity: "", preparationTimeDays: "",
    });
    setImageFile(null);
    setPendingCropFile(null);
    setCurrentImageUrl(null);
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
      categoryId: prod.categoryId || "",
      description: prod.description || "",
      basePriceCents: (prod.basePriceCents / 100).toFixed(2), 
      isProntaEntrega: prod.isProntaEntrega,
      isEncomenda: prod.isEncomenda,
      stockQuantity: prod.stockQuantity?.toString() || "",
      preparationTimeDays: prod.preparationTimeDays?.toString() || "",
    });
    setImageFile(null);
    setCurrentImageUrl(prod.imageUrl || null);
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
    data.append("isProntaEntrega", formData.isProntaEntrega.toString());
    data.append("isEncomenda", formData.isEncomenda.toString());
    
    const priceCents = Math.round(parseFloat(formData.basePriceCents.replace(',', '.')) * 100);
    data.append("basePriceCents", priceCents.toString());

    if (formData.description) data.append("description", formData.description);
    
    if (formData.isProntaEntrega && formData.stockQuantity) {
      data.append("stockQuantity", formData.stockQuantity);
    }
    
    if (formData.isEncomenda && formData.preparationTimeDays) {
      data.append("preparationTimeDays", formData.preparationTimeDays);
    }

    // Por padrão, ao criar/editar pelo form, o produto fica ativo
    data.append("isActive", "true");

    if (imageFile) {
      data.append("image", imageFile);
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
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este produto?")) return;
    setIsLoading(true);
    const result = await deleteProductAction(id);
    if (!result.success) {
      toast.error(result.error || "Erro ao excluir produto");
    } else {
      toast.success("Produto excluído com sucesso!");
      router.refresh();
    }
    setIsLoading(false);
  };

  const handleQuickCreateCategory = async () => {
    const name = prompt("Qual o nome da nova categoria?");
    if (!name) return;
    setIsLoading(true);
    
    const data = new FormData();
    data.append("name", name);
    data.append("slug", generateSlug(name));
    
    const result = await createCategoryAction(null, data);
    if (!result.success) {
      toast.error("Erro ao criar categoria: " + result.error);
    } else {
      toast.success("Categoria criada com sucesso!");
    }
    setIsLoading(false);
  };

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <div>
      {/* Aviso */}
      {categories.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 flex items-center justify-between">
          <span>Você precisa criar pelo menos uma <strong>Categoria</strong> antes de adicionar produtos.</span>
          <Button onClick={handleQuickCreateCategory} variant="outline" className="px-3 py-1 text-xs">Criar Categoria</Button>
        </div>
      )}

      {/* Listagem */}
      {!isCreating && !editingId && (
        <>
          <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <Button onClick={handleCreateNew} disabled={categories.length === 0}>
                + Novo Produto
              </Button>
              <Button onClick={handleQuickCreateCategory} variant="outline" disabled={isLoading}>
                + Categoria
              </Button>
            </div>
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
                    <li key={prod.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 object-cover rounded-xl border border-gray-100 shadow-sm" />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-200">
                            <span className="text-gray-400 text-xs text-center leading-tight">Sem<br/>foto</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <h3 className="font-semibold text-gray-900 leading-tight">{prod.name}</h3>
                          <p className="text-sm text-gray-500">
                            {catName} • {(prod.basePriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {prod.isProntaEntrega && (
                              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg">
                                <span className="text-xs font-semibold text-gray-700">Estoque:</span>
                                <button
                                  type="button"
                                  disabled={isLoading || (prod.stockQuantity ?? 0) <= 0}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const newQty = Math.max(0, (prod.stockQuantity ?? 0) - 1);
                                    const res = await quickUpdateProductStockAction(prod.id, newQty);
                                    if (res.success) {
                                      toast.success(`Estoque de ${prod.name}: ${newQty}`);
                                    } else {
                                      toast.error(res.error || "Erro ao atualizar estoque.");
                                    }
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-gray-200 border border-gray-200 text-gray-700 text-xs font-bold active:scale-95 disabled:opacity-40"
                                  title="Diminuir 1"
                                >
                                  -
                                </button>
                                <span className={`text-xs font-bold px-1 ${(prod.stockQuantity ?? 0) === 0 ? "text-rose-600" : "text-gray-900"}`}>
                                  {prod.stockQuantity ?? 0}
                                </span>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const newQty = (prod.stockQuantity ?? 0) + 1;
                                    const res = await quickUpdateProductStockAction(prod.id, newQty);
                                    if (res.success) {
                                      toast.success(`Estoque de ${prod.name}: ${newQty}`);
                                    } else {
                                      toast.error(res.error || "Erro ao atualizar estoque.");
                                    }
                                  }}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white hover:bg-gray-200 border border-gray-200 text-gray-700 text-xs font-bold active:scale-95 disabled:opacity-40"
                                  title="Aumentar 1"
                                >
                                  +
                                </button>
                              </div>
                            )}
                            {prod.isEncomenda && (
                              <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
                                Preparo: {prod.preparationTimeDays} dias
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 self-start sm:self-center w-full sm:w-auto shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(prod)} className="flex-1 sm:flex-none">Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(prod.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700 flex-1 sm:flex-none">
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
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select 
                    label="Categoria"
                    options={categoryOptions}
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    required
                  />
                </div>
                <Button type="button" onClick={handleQuickCreateCategory} variant="outline" className="h-[50px] px-3 border-gray-200">
                  +
                </Button>
              </div>

              <Input 
                label="Preço Base (R$)" 
                placeholder="ex: 15,00"
                value={formData.basePriceCents}
                onChange={(e) => setFormData({ ...formData, basePriceCents: e.target.value })}
                required
              />
            </div>

            <Input 
              label="Descrição (Opcional)" 
              placeholder="Descreva os ingredientes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700">
                Foto do Produto
              </label>

              {/* Preview da Imagem Atual ou Nova */}
              {(imageFile || currentImageUrl) && (
                <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-xl w-fit">
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : currentImageUrl!}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-xs"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800">
                      {imageFile ? "Nova foto selecionada" : "Foto atual do produto"}
                    </p>
                    <p className="text-gray-400">
                      {imageFile ? `${(imageFile.size / 1024).toFixed(0)} KB (recortada 1:1)` : "Salva na nuvem (R2)"}
                    </p>
                  </div>
                </div>
              )}

              <input 
                type="file" 
                accept="image/*"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-black/90 cursor-pointer"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error("A imagem deve ter no máximo 10MB.");
                      e.target.value = "";
                      return;
                    }
                    setPendingCropFile(file);
                    // Reseta valor para permitir selecionar o mesmo arquivo novamente se quiser reajustar
                    e.target.value = "";
                  }
                }}
              />
            </div>

            {/* Modal de Recorte Interativo 1:1 */}
            {pendingCropFile && (
              <ImageCropModal
                imageFile={pendingCropFile}
                onCropComplete={(croppedBlob) => {
                  const croppedFile = new File(
                    [croppedBlob], 
                    pendingCropFile.name.replace(/\.[^/.]+$/, "") + "-cropped.jpg",
                    { type: croppedBlob.type || "image/jpeg" }
                  );
                  setImageFile(croppedFile);
                  setPendingCropFile(null);
                }}
                onCancel={() => {
                  setPendingCropFile(null);
                }}
              />
            )}

            {/* Modalidades */}
            <div className="p-4 border border-gray-200 rounded-xl space-y-4 bg-gray-50 mt-4">
              <h3 className="font-semibold text-gray-800">Disponibilidade do Produto</h3>
              
              <div className="space-y-4">
                {/* Checkbox Pronta Entrega */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={formData.isProntaEntrega}
                      onChange={(e) => setFormData({ ...formData, isProntaEntrega: e.target.checked })}
                    />
                    <span className="font-medium text-gray-700">Vendido a Pronta-Entrega</span>
                  </label>
                  
                  {formData.isProntaEntrega && (
                    <div className="mt-3 ml-8">
                      <Input 
                        label="Quantidade em Estoque Físico" 
                        type="number"
                        min="0"
                        placeholder="ex: 10"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        required={formData.isProntaEntrega}
                      />
                    </div>
                  )}
                </div>

                {/* Checkbox Encomenda */}
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={formData.isEncomenda}
                      onChange={(e) => setFormData({ ...formData, isEncomenda: e.target.checked })}
                    />
                    <span className="font-medium text-gray-700">Aceita Encomendas</span>
                  </label>
                  
                  {formData.isEncomenda && (
                    <div className="mt-3 ml-8">
                      <Input 
                        label="Tempo de Preparo (em Dias)" 
                        type="number"
                        min="1"
                        placeholder="ex: 3"
                        value={formData.preparationTimeDays}
                        onChange={(e) => setFormData({ ...formData, preparationTimeDays: e.target.value })}
                        required={formData.isEncomenda}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

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
