"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Sun, Moon, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { JwtPayload } from "@/lib/server-auth";

interface ProfileMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export const ProfileMenu = ({ user }: ProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-x-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"
      >
        <div className="flex flex-col text-right hidden sm:flex">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || "Guest"}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{user?.email || "Not signed in"}</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center border overflow-hidden">
          {user?.image ? (
            <img src={user.image} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="h-4 w-4 text-slate-600" />
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-2 sm:hidden">
             <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || "Guest"}</p>
             <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || "Not signed in"}</p>
          </div>
          
          <button
            onClick={() => {
              setTheme(theme === "light" ? "dark" : "light");
              setIsOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center transition-colors"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4 mr-3" />
            ) : (
              <Sun className="h-4 w-4 mr-3" />
            )}
            Toggle Theme
          </button>
          
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center transition-colors mt-1 border-t border-slate-100 dark:border-slate-800 pt-3"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
};
