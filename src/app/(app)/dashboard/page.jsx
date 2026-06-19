"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { Shirt, Package, Receipt, Users, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";

const PERIODOS = [
  { id: "hoje", label: "Hoje" },
  { id: "mes", label: "Esse mês" },
  { id: "30", label: "Últimos 30 dias" },
  { id: "90", label: "Últimos 90 dias" },
  { id: "tudo", label: "Todo o período" },
  { id: "custom", label: "Personalizado" },
];

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Calcula o intervalo [inicio, fim] (Date) de acordo com o período escolhido.
// inicio === null significa "sem limite inferior" (todo o período).
function calcularIntervalo(periodo, customIni, customFim) {
  const fim = new Date();
  let inicio = null;

  if (periodo === "hoje") {
    inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === "mes") {
    inicio = new Date();
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === "30") {
    inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === "90") {
    inicio = new Date();
    inicio.setDate(inicio.getDate() - 90);
    inicio.setHours(0, 0, 0, 0);
  } else if (periodo === "tudo") {
    inicio = null;
  } else if (periodo === "custom") {
    inicio = customIni ? new Date(customIni + "T00:00:00") : null;
    const f = customFim ? new Date(customFim + "T23:59:59") : fim;
    return { inicio, fim: f };
  }

  return { inicio, fim };
}

// Escolhe a granularidade dos buckets do gráfico de acordo com o tamanho do intervalo.
function granularidadePara(spanDias) {
  if (spanDias <= 1) return "hora";
  if (spanDias <= 120) return "dia";
  if (spanDias <= 730) return "mes";
  return "ano";
}

function bucketDe(dataISO, granularidade) {
  const d = new Date(dataISO);
  if (granularidade === "hora") {
    return { key: d.toISOString().slice(0, 13), label: `${String(d.getHours()).padStart(2, "0")}h` };
  }
  if (granularidade === "dia") {
    return {
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    };
  }
  if (granularidade === "mes") {
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    };
  }
  return { key: `${d.getFullYear()}`, label: `${d.getFullYear()}` };
}

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

  const [periodo, setPeriodo] = useState("30");
  const [customIni, setCustomIni] = useState(hojeISO());
  const [customFim, setCustomFim] = useState(hojeISO());
  const [vendasPeriodo, setVendasPeriodo] = useState([]); // notas brutas no intervalo
  const [carregandoGrafico, setCarregandoGrafico] = useState(true);

  useEffect(() => {
    async function carregarGrafico() {
      setCarregandoGrafico(true);
      const { inicio, fim } = calcularIntervalo(periodo, customIni, customFim);
      let q = supabase.from("notas").select("total, criado_em").lte("criado_em", fim.toISOString());
      if (inicio) q = q.gte("criado_em", inicio.toISOString());
      const { data } = await q.order("criado_em", { ascending: true });
      setVendasPeriodo(data || []);
      setCarregandoGrafico(false);
    }
    carregarGrafico();
  }, [periodo, customIni, customFim]);

  const grafico = useMemo(() => {
    const { inicio, fim } = calcularIntervalo(periodo, customIni, customFim);
    const baseInicio = inicio || (vendasPeriodo[0] ? new Date(vendasPeriodo[0].criado_em) : fim);
    const spanDias = Math.max(1, (fim - baseInicio) / 86400000);
    const granularidade = granularidadePara(spanDias);

    const mapa = new Map();
    for (const n of vendasPeriodo) {
      const { key, label } = bucketDe(n.criado_em, granularidade);
      const atual = mapa.get(key) || { label, valor: 0, qtd: 0 };
      atual.valor += Number(n.total || 0);
      atual.qtd += 1;
      mapa.set(key, atual);
    }
    const pontos = Array.from(mapa.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([, v]) => v);

    const total = vendasPeriodo.reduce((s, n) => s + Number(n.total || 0), 0);
    return { pontos, total, qtd: vendasPeriodo.length, max: Math.max(1, ...pontos.map((p) => p.valor)) };
  }, [vendasPeriodo, periodo, customIni, customFim]);

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

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-600" />
            <h2 className="font-bold text-slate-900">Desempenho de vendas</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="input w-auto py-1.5 text-sm"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              {PERIODOS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {periodo === "custom" && (
              <>
                <input type="date" className="input w-auto py-1.5 text-sm" value={customIni} onChange={(e) => setCustomIni(e.target.value)} />
                <span className="text-slate-400 text-sm">até</span>
                <input type="date" className="input w-auto py-1.5 text-sm" value={customFim} onChange={(e) => setCustomFim(e.target.value)} />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-4 mb-4">
          <p className="text-2xl font-extrabold text-slate-900">{fmtBRL(grafico.total)}</p>
          <p className="text-sm text-slate-500">{grafico.qtd} venda{grafico.qtd === 1 ? "" : "s"} no período</p>
        </div>

        {carregandoGrafico ? (
          <p className="text-sm text-slate-400 py-10 text-center">Carregando…</p>
        ) : grafico.pontos.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">Nenhuma venda no período selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${Math.max(320, grafico.pontos.length * 34)} 220`}
              style={{ width: "100%", minWidth: 320, height: 220 }}
              preserveAspectRatio="none"
            >
              {grafico.pontos.map((p, i) => {
                const larguraBarra = 22;
                const espaco = 34;
                const x = i * espaco + (espaco - larguraBarra) / 2;
                const alturaMax = 170;
                const altura = Math.max(2, (p.valor / grafico.max) * alturaMax);
                const y = 184 - altura;
                const mostrarLabel =
                  grafico.pontos.length <= 12 || i % Math.ceil(grafico.pontos.length / 10) === 0;
                return (
                  <g key={i}>
                    <title>{`${p.label}: ${fmtBRL(p.valor)} (${p.qtd} venda${p.qtd === 1 ? "" : "s"})`}</title>
                    <rect x={x} y={y} width={larguraBarra} height={altura} rx={4} fill="#7c3aed" opacity={0.85} />
                    {mostrarLabel && (
                      <text x={x + larguraBarra / 2} y={204} textAnchor="middle" fontSize="10" fill="#94a3b8">
                        {p.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}
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
