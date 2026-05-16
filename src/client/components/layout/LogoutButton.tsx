"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export const LogoutButton = () => {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center justify-center p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors rounded-full ml-4"
      title="Logout"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
};
