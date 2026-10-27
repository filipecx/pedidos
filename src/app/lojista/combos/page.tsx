import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listProducts } from "@/server/modules/products/services";
import { Button } from "@/components/ui/button";
import { EstoqueTabs } from "../_components/estoque-tabs";

export default async function CombosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // Busca apenas produtos marcados como isCombo: true
  const combos = await listProducts(session.user.id, { isCombo: true });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <EstoqueTabs />
      <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seus Combos</h1>
            <p className="text-gray-500 mt-1">Ofertas completas com múltiplos passos para o cliente.</p>
          </div>
        </div>

        <div className="mb-6">
          <Link href="/lojista/combos/novo">
            <Button>+ Criar Novo Combo</Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {combos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum combo criado ainda. Experimente criar o primeiro!
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {combos.map((combo) => (
                <li key={combo.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-semibold text-gray-900">{combo.name}</h3>
                    <p className="text-sm text-gray-500">
                      A partir de {(combo.basePriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled>Editar (Em Breve)</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
