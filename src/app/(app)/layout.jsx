"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Shirt, FileUp, Receipt, Users, LogOut, Menu, X,
  Briefcase, CreditCard, Wallet, Tags, MessageCircle, Calculator, BookOpen,
} from "lucide-react";

const menu = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Shirt },
  { href: "/importar", label: "Importar XML", icon: FileUp },
  { href: "/notas", label: "Notas / Vendas", icon: Receipt },
  { href: "/malinhas", label: "Malinhas", icon: Briefcase },
  { href: "/crediario", label: "Crediário", icon: CreditCard },
  { href: "/carne", label: "Carnê", icon: BookOpen },
  { href: "/caixa", label: "Caixa do dia", icon: Calculator },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/etiquetas", label: "Etiquetas", icon: Tags },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
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
        className={`sidebar-luxe no-print fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="flex items-center gap-3 px-5 py-5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <Image
            src="/superbonita.png"
            alt="Super Bonita"
            width={46}
            height={46}
            className="rounded-full shrink-0"
            style={{
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.6), 0 10px 24px -10px rgba(0,0,0,0.8)",
            }}
          />
          <div className="leading-tight">
            <p
              className="chrome-text serif"
              style={{ fontStyle: "italic", fontWeight: 800, fontSize: 19 }}
            >
              Super Bonita
            </p>
            <p className="eyebrow" style={{ fontSize: 9 }}>
              Super Bonita · Gestão
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map(({ href, label, icon: Icon }) => {
            const ativo = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAberto(false)}
                className={`navitem ${ativo ? "active" : ""}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={sair}
          className="navitem mx-3 mb-4"
          style={{ width: "auto" }}
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </aside>

      {aberto && (
        <div className="no-print fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setAberto(false)} />
      )}

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <header
          className="no-print lg:hidden sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
          style={{ background: "var(--bg)", borderBottom: "1px solid var(--line)" }}
        >
          <button onClick={() => setAberto(!aberto)} className="p-2 rounded-lg hover:bg-slate-50">
            {aberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="chrome-text serif" style={{ fontStyle: "italic", fontWeight: 800, fontSize: 17 }}>
            Loja Joselane
          </span>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
