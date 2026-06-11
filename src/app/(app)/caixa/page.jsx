"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL } from "@/lib/supabase";
import {
  Banknote, QrCode, CreditCard, Briefcase, CalendarClock,
  TrendingDown, Printer, Wallet, Receipt,
} from "lucide-react";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function Caixa() {
  const [dia, setDia] = useState(hojeISO());
  const [notas, setNotas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);

  useEffect(() => {
    async function carregar() {
      const ini = new Date(dia + "T00:00:00");
      const fim = new Date(dia + "T23:59:59.999");
      const [n, p, l] = await Promise.all([
        supabase.from("notas").select("*")
          .gte("criado_em", ini.toISOString()).lte("criado_em", fim.toISOString())
          .order("criado_em"),
        supabase.from("parcelas").select("*, notas(numero, cliente_nome)").eq("pago", true).eq("pago_em", dia),
        supabase.from("lancamentos").select("*").eq("data", dia),
      ]);
      setNotas(n.data || []);
      setParcelas(p.data || []);
      setLancamentos(l.data || []);
    }
    carregar();
  }, [dia]);

  const somaForma = (forma) =>
    notas.filter((n) => n.forma_pagamento === forma).reduce((s, n) => s + Number(n.total), 0);

  const dinheiro = somaForma("Dinheiro");
  const pix = somaForma("Pix");
  const debito = somaForma("Cartão de débito");
  const credito = somaForma("Cartão de crédito");
  const malinha = somaForma("Malinha");
  const crediarioVendido = somaForma("Crediário"); // não entra no caixa hoje
  const crediarioRecebido = parcelas.reduce((s, p) => s + Number(p.valor), 0);
  const entradasManuais = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);

  const entrouNoCaixa = dinheiro + pix + debito + credito + malinha + crediarioRecebido + entradasManuais;
  const saldoDia = entrouNoCaixa - saidas;

  const linhas = [
    { rotulo: "Dinheiro", valor: dinheiro, icon: Banknote },
    { rotulo: "Pix", valor: pix, icon: QrCode },
    { rotulo: "Cartão de débito", valor: debito, icon: CreditCard },
    { rotulo: "Cartão de crédito", valor: credito, icon: CreditCard },
    { rotulo: "Malinhas fechadas", valor: malinha, icon: Briefcase },
    { rotulo: "Crediário recebido (parcelas)", valor: crediarioRecebido, icon: CalendarClock },
    { rotulo: "Outras entradas", valor: entradasManuais, icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Fechamento de caixa</h1>
          <p className="text-slate-500">Quanto entrou e saiu no dia, por forma de pagamento</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" className="input w-auto" value={dia} onChange={(e) => setDia(e.target.value)} />
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Resumo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <p className="eyebrow mb-4">
              Caixa de {new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
            <div className="space-y-3">
              {linhas.map(({ rotulo, valor, icon: Icon }) => (
                <div key={rotulo} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2.5 text-slate-600">
                    <Icon className="w-4 h-4 text-violet-600" /> {rotulo}
                  </span>
                  <span className={`font-bold ${valor > 0 ? "text-slate-900" : "text-slate-400"}`}>
                    {fmtBRL(valor)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-3">
                <span className="flex items-center gap-2.5 text-red-500">
                  <TrendingDown className="w-4 h-4" /> Saídas do dia
                </span>
                <span className="font-bold text-red-500">- {fmtBRL(saidas)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--line-2)" }}>
              <div className="flex justify-between text-sm text-slate-500 mb-1">
                <span>Total que entrou</span><span>{fmtBRL(entrouNoCaixa)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold">Saldo do dia</span>
                <span className={`text-2xl font-extrabold ${saldoDia >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtBRL(saldoDia)}
                </span>
              </div>
            </div>

            {crediarioVendido > 0 && (
              <p className="mt-4 text-xs text-slate-400">
                * Vendas no crediário hoje: {fmtBRL(crediarioVendido)} — entram no caixa quando as parcelas forem pagas.
              </p>
            )}
          </div>
        </div>

        {/* Movimentos do dia */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="px-5 py-3.5">Hora</th>
                  <th className="px-5 py-3.5">Movimento</th>
                  <th className="px-5 py-3.5">Forma</th>
                  <th className="px-5 py-3.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(n.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/notas/${n.id}`} className="font-medium hover:underline flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-violet-500" />
                        Nota #{n.numero} — {n.cliente_nome}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{n.forma_pagamento}</td>
                    <td className={`px-5 py-3 text-right font-bold ${n.forma_pagamento === "Crediário" ? "text-slate-400" : "text-emerald-600"}`}>
                      {n.forma_pagamento === "Crediário" ? "(a prazo) " : "+ "}{fmtBRL(n.total)}
                    </td>
                  </tr>
                ))}
                {parcelas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">—</td>
                    <td className="px-5 py-3 font-medium">
                      Parcela {p.numero}ª — Nota #{p.notas?.numero} ({p.notas?.cliente_nome})
                    </td>
                    <td className="px-5 py-3 text-slate-500">Crediário</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">+ {fmtBRL(p.valor)}</td>
                  </tr>
                ))}
                {lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">—</td>
                    <td className="px-5 py-3 font-medium">{l.descricao}</td>
                    <td className="px-5 py-3 text-slate-500">{l.categoria}</td>
                    <td className={`px-5 py-3 text-right font-bold ${l.tipo === "entrada" ? "text-emerald-600" : "text-red-500"}`}>
                      {l.tipo === "entrada" ? "+ " : "- "}{fmtBRL(l.valor)}
                    </td>
                  </tr>
                ))}
                {notas.length === 0 && parcelas.length === 0 && lancamentos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                      Nenhum movimento neste dia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="no-print text-xs text-slate-400">
            Despesas pagas no dia (sacolas, lanche, motoboy…) você lança em <Link href="/financeiro" className="text-violet-600 hover:underline">Financeiro → Lançamento</Link> e elas aparecem aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
