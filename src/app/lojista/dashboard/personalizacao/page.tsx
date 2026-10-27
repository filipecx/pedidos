import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CustomizationForm } from "./customization-form";

export const metadata = {
  title: "Personalizar Vitrine | Dashboard Lojista",
};

export default async function PersonalizacaoPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // Redireciona para o novo local oficial unificado em Minha Loja
  redirect("/lojista/minha-loja/personalizacao");
}
