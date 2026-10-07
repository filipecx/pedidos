import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session || session.user.role !== 'ADMIN') {
    redirect("/"); // Ou /login se tiver uma página específica
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar simples */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
            Lojistas
          </Link>
          {/* Outros links de admin no futuro (Pagamentos, Usuários, etc) */}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 md:hidden">
          <h1 className="text-xl font-bold text-gray-800">Admin</h1>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
