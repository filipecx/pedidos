"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EstoqueTabs() {
  const pathname = usePathname();

  const tabs = [
    { name: "Produtos", href: "/lojista/produtos" },
    { name: "Categorias", href: "/lojista/categorias" },
    { name: "Combos", href: "/lojista/combos" },
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-6 sticky top-0 z-10">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${isActive
                  ? 'border-primary text-primary'
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
