"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { Shirt, Package, Receipt, Users, AlertTriangle, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    produtos: 0,
    pecas: 0,
    vendasMes: 0,
    qtdNotasMes: 0,
    clientes: 0,
  });
  const [ultimas, setUltimas] = useState([]);
  const [baixoEstoque, setBaixoEstoque] = useState([]);

  useEffect(() => {
    async function carregar() {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const [prod, cli, notasMes, ultimasNotas, baixo] = await Promise.all([
        supabase.from("produtos").select("estoque"),
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("notas").select("total").gte("criado_em", inicioMes.toISOString()),
        supabase.from("notas").select("*").order("criado_em", { ascending: false }).limit(6),
        supabase.from("produtos").select("*").lte("estoque", 3).order("estoque").limit(6),
      ]);

      setStats({
        produtos: prod.data?.length || 0,
        pecas: (prod.data || []).reduce((s, p) => s + (p.estoque || 0), 0),
        vendasMes: (notasMes.data || []).reduce((s, n) => s + Number(n.total || 0), 0),
        qtdNotasMes: notasMes.data?.length || 0,
        clientes: cli.count || 0,
      });
      setUltimas(ultimasNotas.data || []);
      setBaixoEstoque(baixo.data || []);
    }
    carregar();
  }, []);

  const cards = [
    { label: "Produtos cadastrados", valor: stats.produtos, icon: Shirt, cor: "bg-violet-100 text-violet-600" },
    { label: "Peças em estoque", valor: stats.pecas, icon: Package, cor: "bg-blue-100 text-blue-600" },
    { label: "Vendas no mês", valor: fmtBRL(stats.vendasMes), icon: TrendingUp, cor: "bg-emerald-100 text-emerald-600" },
    { label: "Notas no mês", valor: stats.qtdNotasMes, icon: Receipt, cor: "bg-amber-100 text-amber-600" },
    { label: "Clientes", valor: stats.clientes, icon: Users, cor: "bg-pink-100 text-pink-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Visão geral da sua loja</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, valor, icon: Icon, cor }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 truncate">{valor}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Últimas notas</h2>
            <Link href="/notas" className="text-sm text-violet-600 font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          {ultimas.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Nenhuma nota gerada ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {ultimas.map((n) => (
                <Link
                  key={n.id}
                  href={`/notas/${n.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-sm">Nota #{n.numero} — {n.cliente_nome}</p>
                    <p className="text-xs text-slate-400">{fmtData(n.criado_em)}</p>
                  </div>
                  <span className="font-bold text-emerald-600 text-sm">{fmtBRL(n.total)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="font-bold text-slate-900">Estoque baixo (≤ 3 peças)</h2>
          </div>
          {baixoEstoque.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Tudo certo com o estoque!</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {baixoEstoque.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-400">
                      {[p.tamanho, p.cor].filter(Boolean).join(" · ") || p.categoria}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.estoque <= 0 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.estoque} un
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
