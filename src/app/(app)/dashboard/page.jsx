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

// Formata valores compactos para o eixo do gráfico (R$ 1.2k em vez de R$ 1.200,00)
function fmtCompacto(v) {
  if (v >= 1000) {
    const k = v / 1000;
    return `R$ ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `R$ ${Math.round(v)}`;
}

// Gera um caminho SVG suave (curva) passando pelos pontos, em vez de linhas retas
function caminhoSuave(pontos) {
  if (pontos.length === 0) return "";
  if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;
  let d = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i === 0 ? 0 : i - 1];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2 < pontos.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ─── Gráfico de desempenho de vendas: linha suave + área + grade + tooltip ──
function GraficoDesempenho({ pontos, max }) {
  const [hover, setHover] = useState(null);

  const espaco = 72;
  const padLeft = 52;
  const padRight = 16;
  const padTop = 24;
  const padBottom = 32;
  const altura = 360;
  const largura = Math.max(480, padLeft + padRight + pontos.length * espaco);
  const baseline = altura - padBottom;
  const plotH = baseline - padTop;

  const coords = pontos.map((p, i) => ({
    ...p,
    x: padLeft + i * espaco + espaco / 2,
    y: baseline - (p.valor / max) * plotH,
  }));

  const linha = caminhoSuave(coords);
  const area = coords.length
    ? `${linha} L ${coords[coords.length - 1].x} ${baseline} L ${coords[0].x} ${baseline} Z`
    : "";

  const niveis = [1, 0.75, 0.5, 0.25, 0].map((f) => ({ y: baseline - f * plotH, valor: max * f, ultimo: f === 0 }));

  const mostrarLabel = (i) =>
    coords.length <= 10 || i % Math.ceil(coords.length / 8) === 0 || i === coords.length - 1;

  const ativo = hover != null ? coords[hover] : null;
  const tooltipW = 132;
  const tooltipX = ativo ? Math.min(Math.max(ativo.x - tooltipW / 2, 4), largura - tooltipW - 4) : 0;
  const tooltipY = ativo ? Math.max(ativo.y - 58, 4) : 0;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        style={{ width: "100%", minWidth: 480, height: altura }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaFillVendas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grade horizontal */}
        {niveis.map((n, i) => (
          <g key={i}>
            <line
              x1={padLeft} y1={n.y} x2={largura - padRight} y2={n.y}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray={n.ultimo ? "0" : "4 4"}
            />
            <text x={padLeft - 8} y={n.y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
              {fmtCompacto(n.valor)}
            </text>
          </g>
        ))}

        {/* área preenchida + linha suave */}
        {coords.length > 0 && (
          <>
            <path d={area} fill="url(#areaFillVendas)" style={{ pointerEvents: "none" }} />
            <path d={linha} fill="none" stroke="#7c3aed" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }} />
          </>
        )}

        {/* rótulos do eixo x */}
        {coords.map((p, i) => mostrarLabel(i) && (
          <text key={"lbl" + i} x={p.x} y={altura - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
            {p.label}
          </text>
        ))}

        {/* pontos */}
        {coords.map((p, i) => (
          <circle
            key={"pt" + i}
            cx={p.x} cy={p.y}
            r={hover === i ? 5 : 3}
            fill="#fff" stroke="#7c3aed" strokeWidth={hover === i ? 2.5 : 2}
            style={{ pointerEvents: "none" }}
          />
        ))}

        {/* linha guia do ponto em foco */}
        {ativo && (
          <line x1={ativo.x} y1={padTop} x2={ativo.x} y2={baseline} stroke="#7c3aed" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} style={{ pointerEvents: "none" }} />
        )}

        {/* faixas de interação (uma por ponto, para o tooltip ao passar o mouse) */}
        {coords.map((p, i) => (
          <rect
            key={"hit" + i}
            x={p.x - espaco / 2} y={0} width={espaco} height={altura}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {/* tooltip */}
        {ativo && (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tooltipX} y={tooltipY} width={tooltipW} height={46} rx={8} fill="#1e1b2e" opacity={0.95} />
            <text x={tooltipX + tooltipW / 2} y={tooltipY + 18} textAnchor="middle" fontSize="11" fill="#c4b5fd" fontWeight="700">
              {ativo.label}
            </text>
            <text x={tooltipX + tooltipW / 2} y={tooltipY + 34} textAnchor="middle" fontSize="12" fill="#fff" fontWeight="800">
              {fmtBRL(ativo.valor)} · {ativo.qtd} venda{ativo.qtd === 1 ? "" : "s"}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
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

        <div className="flex flex-wrap items-baseline gap-6 mb-5">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{fmtBRL(grafico.total)}</p>
            <p className="text-xs text-slate-400 mt-0.5">Faturamento no período</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">{grafico.qtd}</p>
            <p className="text-xs text-slate-400 mt-0.5">venda{grafico.qtd === 1 ? "" : "s"}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">{fmtBRL(grafico.qtd ? grafico.total / grafico.qtd : 0)}</p>
            <p className="text-xs text-slate-400 mt-0.5">ticket médio</p>
          </div>
        </div>

        {carregandoGrafico ? (
          <p className="text-sm text-slate-400 py-10 text-center">Carregando…</p>
        ) : grafico.pontos.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">Nenhuma venda no período selecionado.</p>
        ) : (
          <GraficoDesempenho pontos={grafico.pontos} max={grafico.max} />
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
