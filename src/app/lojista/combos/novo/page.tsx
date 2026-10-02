import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCategories } from "@/server/modules/categories/services";
import { ComboCreatorClient } from "./_components/combo-creator-client";

export default async function NovoComboPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/lojista/cadastro");
  }

  const categories = await listCategories(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 md:p-6 md:pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Combo Especiais</h1>
        <p className="text-gray-500 mt-1 text-sm">Monte a experiência perfeita para seu cliente.</p>
      </div>

      <ComboCreatorClient categories={categories} />
    </div>
  );
}
