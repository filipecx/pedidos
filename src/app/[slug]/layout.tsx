import { getStorefrontData } from "@/server/modules/store/public-services";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const data = await getStorefrontData(slug);
  
  if (!data) {
    notFound();
  }

  const { themeColors } = data.store;

  // Fallbacks de cores
  const primary = themeColors?.primary || "#ef4444"; // ex: red-500
  const background = themeColors?.background || "#f8fafc"; // ex: slate-50
  const text = themeColors?.text || "#0f172a"; // ex: slate-900

  return (
    <div
      style={{
        "--color-primary": primary,
        "--color-background": background,
        "--color-text": text,
      } as React.CSSProperties}
      className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] font-sans"
    >
      {children}
    </div>
  );
}
