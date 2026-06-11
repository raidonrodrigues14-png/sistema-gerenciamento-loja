"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Shirt, FileUp, Receipt, Users, LogOut, Menu, X,
} from "lucide-react";

const menu = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Shirt },
  { href: "/importar", label: "Importar XML", icon: FileUp },
  { href: "/notas", label: "Notas / Vendas", icon: Receipt },
  { href: "/clientes", label: "Clientes", icon: Users },
];

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pronto, setPronto] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/login");
      else setPronto(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!pronto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-medium">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold leading-tight">Loja Joselane</p>
            <p className="text-xs text-slate-400">Gerenciamento</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menu.map(({ href, label, icon: Icon }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  ativo
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={sair}
          className="flex items-center gap-3 mx-3 mb-4 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-red-500/20 hover:text-red-300 transition"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </aside>

      {aberto && (
        <div className="no-print fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setAberto(false)} />
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <header className="no-print lg:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setAberto(!aberto)} className="p-2 rounded-lg hover:bg-slate-100">
            {aberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold">Loja Joselane</span>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
