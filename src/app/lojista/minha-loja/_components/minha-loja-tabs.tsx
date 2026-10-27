"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MinhaLojaTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Dados Gerais & Horários", href: "/lojista/minha-loja" },
    { name: "Personalizar Vitrine", href: "/lojista/minha-loja/personalizacao" },
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-6 sticky top-0 z-10 shadow-xs">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs Minha Loja">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
