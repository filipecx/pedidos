"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon, 
  ClipboardDocumentListIcon, 
  CubeIcon, 
  Cog6ToothIcon 
} from "@heroicons/react/24/outline";
import { 
  HomeIcon as HomeSolidIcon, 
  ClipboardDocumentListIcon as ClipboardSolidIcon, 
  CubeIcon as CubeSolidIcon, 
  Cog6ToothIcon as CogSolidIcon 
} from "@heroicons/react/24/solid";

export function LojistaNavigation() {
  const pathname = usePathname();

  // Esconder a navegação na tela de onboarding
  if (pathname?.startsWith("/lojista/onboarding")) {
    return null;
  }

  const navItems = [
    {
      name: "Início",
      href: "/lojista/dashboard",
      icon: HomeIcon,
      activeIcon: HomeSolidIcon,
      // Consider active if exactly on dashboard
      isActive: pathname === "/lojista/dashboard",
    },
    {
      name: "Pedidos",
      href: "/lojista/pedidos",
      icon: ClipboardDocumentListIcon,
      activeIcon: ClipboardSolidIcon,
      isActive: pathname?.startsWith("/lojista/pedidos"),
    },
    {
      name: "Estoque",
      href: "/lojista/produtos", // Isso depois vai englobar categorias e combos
      icon: CubeIcon,
      activeIcon: CubeSolidIcon,
      isActive: pathname?.startsWith("/lojista/produtos") || pathname?.startsWith("/lojista/categorias") || pathname?.startsWith("/lojista/combos"),
    },
    {
      name: "Minha Loja",
      href: "/lojista/minha-loja",
      icon: Cog6ToothIcon,
      activeIcon: CogSolidIcon,
      isActive: pathname?.startsWith("/lojista/minha-loja"),
    },
  ];

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
          <h1 className="text-xl font-bold text-primary">Painel do Lojista</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.isActive ? item.activeIcon : item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm ${
                  item.isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* --- MOBILE BOTTOM PWA NAV --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.isActive ? item.activeIcon : item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  item.isActive ? "text-primary" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
