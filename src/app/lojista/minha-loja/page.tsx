import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { MinhaLojaForm } from "./minha-loja-form";
import { LojistaLogoutButton } from "../_components/lojista-logout-button";

import { MinhaLojaTabs } from "./_components/minha-loja-tabs";
import { StoreStatusToggle } from "../_components/store-status-toggle";

export default async function MinhaLojaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    redirect("/lojista/onboarding");
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <MinhaLojaTabs />

      <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dados da Loja & Horários</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gerencie os dados cadastrais, horários de atendimento e chave Pix.</p>
          </div>

          <StoreStatusToggle 
            initialManualIsOpen={store.manualIsOpen} 
            businessHours={store.businessHours as any} 
          />
        </div>
        <Link 
          href={`/${store.slug}`} 
          target="_blank"
          className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-auto"
        >
          Ver Vitrine &rarr;
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 mt-2">
        <MinhaLojaForm 
          initialData={{
            storeName: store.name,
            slug: store.slug,
            pixKey: store.pixKey || "",
            userName: session.user.name,
            businessHours: store.businessHours as any,
            manualIsOpen: store.manualIsOpen,
          }}
        />

        <div className="pt-4 border-t border-gray-200">
          <LojistaLogoutButton />
        </div>
      </main>
    </div>
  );
}
