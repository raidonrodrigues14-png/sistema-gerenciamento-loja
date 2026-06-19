"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import LicencaPainel from "./licenca/LicencaPainel";
import {
  LayoutDashboard, Shirt, FileUp, Receipt, Users, LogOut, Menu, X,
  CreditCard, Wallet, Tags, MessageCircle, Calculator, BookOpen, KeyRound,
  ShoppingCart,
} from "lucide-react";

const menu = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produtos", label: "Produtos", icon: Shirt },
  { href: "/importar", label: "Importar XML", icon: FileUp },
  { href: "/notas/nova", label: "Vendas", icon: ShoppingCart },
  { href: "/notas", label: "Notas", icon: Receipt },
  { href: "/crediario", label: "Crediário", icon: CreditCard },
  { href: "/carne", label: "Carnê", icon: BookOpen },
  { href: "/caixa", label: "Caixa do dia", icon: Calculator },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/etiquetas", label: "Etiquetas", icon: Tags },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/licenca", label: "Licença", icon: KeyRound },
];

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function somarDias(dataISO, dias) {
  const d = new Date(dataISO + "T12:00:00");
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}

export default function AppLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pronto, setPronto] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [licencaBloqueada, setLicencaBloqueada] = useState(false);
  const [checandoLicenca, setChecandoLicenca] = useState(true);

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

  async function checarLicenca() {
    setChecandoLicenca(true);
    try {
      const { data: cfg, error: errCfg } = await supabase
        .from("licenca_config")
        .select("dias_validade")
        .eq("id", 1)
        .maybeSingle();
      if (errCfg || !cfg) {
        // Tabela ainda não criada (migração não rodada) — não bloqueia o sistema
        setLicencaBloqueada(false);
        return;
      }
      const { data: ultimo, error: errPag } = await supabase
        .from("pagamentos_licenca")
        .select("data")
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (errPag || !ultimo) {
        setLicencaBloqueada(false);
        return;
      }
      const venceEm = somarDias(ultimo.data, cfg.dias_validade);
      setLicencaBloqueada(venceEm < hojeISO());
    } catch (_) {
      setLicencaBloqueada(false);
    } finally {
      setChecandoLicenca(false);
    }
  }

  useEffect(() => {
    if (pronto) checarLicenca();
  }, [pronto]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!pronto || checandoLicenca) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400 font-medium">Carregando…</div>
      </div>
    );
  }

  if (licencaBloqueada) {
    return <LicencaPainel modoBloqueio onLiberado={() => setLicencaBloqueada(false)} onSair={sair} />;
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
            src="/elta-variedades.svg"
            alt="Elta Variedades"
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
              Elta Variedades
            </p>
            <p className="eyebrow" style={{ fontSize: 9 }}>
              Elta Variedades · Gestão
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map(({ href, label, icon: Icon }) => {
            const ativo =
              href === "/notas"
                ? pathname.startsWith("/notas") && !pathname.startsWith("/notas/nova")
                : pathname.startsWith(href);
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
            Elta Variedades
          </span>
        </header>
        <main className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
