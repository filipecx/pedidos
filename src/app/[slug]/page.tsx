import { getStorefrontData } from "@/server/modules/store/public-services";
import { notFound } from "next/navigation";
import Image from "next/image";
import { StorefrontCatalog } from "./components/storefront-catalog";

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getStorefrontData(slug);

  if (!data) {
    notFound();
  }

  const { store, categories, products } = data;

  // Filtragem dos produtos pelas regras
  const prontaEntregaProducts = products.filter(p => p.isProntaEntrega);
  const encomendaProducts = products.filter(p => p.isEncomenda);

  return (
    <main className="pb-24">
      {/* HEADER: Banner & Profile */}
      <header className="relative w-full">
        {store.bannerUrl ? (
          <div className="h-40 w-full relative">
            <Image
              src={store.bannerUrl}
              alt={`Banner ${store.name}`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="h-32 w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-text)] opacity-80" />
        )}
        
        <div className="absolute -bottom-10 left-4">
          <div className="h-24 w-24 rounded-full border-4 border-[var(--color-background)] bg-[var(--color-background)] overflow-hidden relative shadow-md">
            {store.profileUrl ? (
              <Image
                src={store.profileUrl}
                alt={store.name}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-bold text-xl">
                {store.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* STORE INFO */}
      <section className="mt-14 px-4">
        <h1 className="text-2xl font-bold font-heading">{store.name}</h1>
        {store.description && (
          <p className="text-sm opacity-80 mt-1">{store.description}</p>
        )}
      </section>

      {/* CATALOG: Interactive Tabs and List */}
      <section className="mt-6">
        <StorefrontCatalog 
          categories={categories}
          prontaEntregaProducts={prontaEntregaProducts}
          encomendaProducts={encomendaProducts}
        />
      </section>
    </main>
  );
}
