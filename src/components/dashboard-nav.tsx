"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, LogOut, LayoutDashboard } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

export function DashboardNav({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold text-gray-900">Clavis</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {profile.full_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{profile.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
