"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LojistaLogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleLogout} 
      isLoading={isLoading}
      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
    >
      Sair da Conta
    </Button>
  );
}
