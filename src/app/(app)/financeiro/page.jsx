"use client";

import { useEffect, useState } from "react";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { Plus, TrendingUp, TrendingDown, Wallet, X, Trash2 } from "lucide-react";

export default function Financeiro() {
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [vendas, setVendas] = useState([]);
  const [parcelasPagas, setParcelasPagas] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ tipo: "saida", descricao: "", categoria: "Geral", valor: "", data: new Date().toISOString().slice(0, 10) });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const ini = mes + "-01";
    const fimDate = new Date(ini + "T12:00:00");
    fimDate.setMonth(fimDate.getMonth() + 1);
    const fim = fimDate.toISOString().slice(0, 10);

    const [n, p, l] = await Promise.all([
      supabase.from("notas").select("*").gte("criado_em", ini).lt("criado_em", fim).neq("forma_pagamento", "Crediário"),
      supabase.from("parcelas").select("*, notas(numero, cliente_nome)").eq("pago", true).gte("pago_em", ini).lt("pago_em", fim),
      supabase.from("lancamentos").select("*").gte("data", ini).lt("data", fim).order("data", { ascending: false }),
    ]);
    setVendas(n.data || []);
    setParcelasPagas(p.data || []);
    setLancamentos(l.data || []);
  }
  useEffect(() => { carregar(); }, [mes]);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    await supabase.from("lancamentos").insert({
      tipo: form.tipo,
      descricao: form.descricao,
      categoria: form.categoria || "Geral",
      valor: Number(form.valor || 0),
      data: form.data,
    });
    setSalvando(false);
    setModal(false);
    setForm({ tipo: "saida", descricao: "", categoria: "Geral", valor: "", data: new Date().toISOString().slice(0, 10) });
    carregar();
  }

  async function excluir(l) {
    if (!confirm(`Excluir "${l.descricao}"?`)) return;
    await supabase.from("lancamentos").delete().eq("id", l.id);
    carregar();
  }

  const totalVendas = vendas.reduce((s, n) => s + Number(n.total), 0);
  const totalParcelas = parcelasPagas.reduce((s, p) => s + Number(p.valor), 0);
  const entradasManuais = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);
  const entradas = totalVendas + totalParcelas + entradasManuais;
  const saldo = entradas - saidas;

  const movimentos = [
    ...vendas.map((n) => ({ id: "n" + n.id, data: n.criado_em.slice(0, 10), descricao: `Venda — Nota #${n.numero} (${n.cliente_nome})`, categoria: n.forma_pagamento, valor: Number(n.total), tipo: "entrada", fixo: true })),
    ...parcelasPagas.map((p) => ({ id: "p" + p.id, data: p.pago_em, descricao: `Crediário — ${p.numero}ª parcela Nota #${p.notas?.numero} (${p.notas?.cliente_nome})`, categoria: "Crediário", valor: Number(p.valor), tipo: "entrada", fixo: true })),
    ...lancamentos.map((l) => ({ id: "l" + l.id, data: l.data, descricao: l.descricao, categoria: l.categoria, valor: Number(l.valor), tipo: l.tipo, fixo: false, raw: l })),
  ].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Financeiro</h1>
          <p className="text-slate-500">Fluxo de caixa do mês</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" className="input w-auto" value={mes} onChange={(e) => setMes(e.target.value)} />
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Lançamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <TrendingUp className="w-4 h-4" /><span className="text-xs font-semibold uppercase">Entradas</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">{fmtBRL(entradas)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <TrendingDown className="w-4 h-4" /><span className="text-xs font-semibold uppercase">Saídas</span>
          </div>
          <p className="text-xl font-extrabold text-slate-900">{fmtBRL(saidas)}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <Wallet className="w-4 h-4" /><span className="text-xs font-semibold uppercase">Saldo</span>
          </div>
          <p className={`text-xl font-extrabold ${saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtBRL(saldo)}</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Data</th>
              <th className="px-5 py-3.5">Descrição</th>
              <th className="px-5 py-3.5">Categoria</th>
              <th className="px-5 py-3.5 text-right">Valor</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimentos.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5 text-slate-500">{fmtData(m.data + "T12:00:00")}</td>
                <td className="px-5 py-3.5 font-medium">{m.descricao}</td>
                <td className="px-5 py-3.5 text-slate-500">{m.categoria}</td>
                <td className={`px-5 py-3.5 text-right font-bold ${m.tipo === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                  {m.tipo === "entrada" ? "+" : "-"} {fmtBRL(m.valor)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {!m.fixo && (
                    <button onClick={() => excluir(m.raw)} className="p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {movimentos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Nenhum movimento neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <form
            onSubmit={salvar}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo lançamento</h2>
              <button type="button" onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[["saida", "Saída (despesa)"], ["entrada", "Entrada (receita)"]].map(([v, r]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: v })}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                    form.tipo === v
                      ? v === "saida" ? "bg-red-50 border-red-300 text-red-600" : "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "border-slate-300 text-slate-500"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Descrição *</label>
              <input className="input" required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Aluguel, conta de luz, compra de sacolas…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Valor (R$) *</label>
                <input className="input" type="number" step="0.01" min="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <label className="label">Data</label>
                <input className="input" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Categoria</label>
              <input className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Aluguel, Energia, Fornecedor…" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
