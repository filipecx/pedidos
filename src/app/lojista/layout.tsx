import { ReactNode } from "react";
import { LojistaNavigation } from "./_components/lojista-navigation";

export default function LojistaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Navigation (Sidebar on Desktop, Bottom Bar on Mobile) */}
      <LojistaNavigation />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 md:ml-64 relative">
        {children}
      </div>
    </div>
  );
}
