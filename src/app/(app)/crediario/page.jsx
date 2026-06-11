"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { CreditCard, CheckCircle2, AlertCircle } from "lucide-react";

export default function Crediario() {
  const [parcelas, setParcelas] = useState([]);
  const [filtro, setFiltro] = useState("abertas");

  async function carregar() {
    const { data } = await supabase
      .from("parcelas")
      .select("*, notas(numero, cliente_nome)")
      .order("vencimento");
    setParcelas(data || []);
  }
  useEffect(() => { carregar(); }, []);

  async function marcarPaga(p, pago) {
    await supabase
      .from("parcelas")
      .update({ pago, pago_em: pago ? new Date().toISOString().slice(0, 10) : null })
      .eq("id", p.id);
    carregar();
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const visiveis = parcelas.filter((p) =>
    filtro === "abertas" ? !p.pago : filtro === "pagas" ? p.pago : true
  );

  const totalAberto = parcelas.filter((p) => !p.pago).reduce((s, p) => s + Number(p.valor), 0);
  const totalVencido = parcelas
    .filter((p) => !p.pago && p.vencimento < hoje)
    .reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Crediário</h1>
        <p className="text-slate-500">Parcelas das vendas no carnê</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        <div className="card p-5">
          <p className="text-2xl font-extrabold text-slate-900">{fmtBRL(totalAberto)}</p>
          <p className="text-xs text-slate-500">A receber</p>
        </div>
        <div className="card p-5">
          <p className="text-2xl font-extrabold text-red-600">{fmtBRL(totalVencido)}</p>
          <p className="text-xs text-slate-500">Vencido</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          ["abertas", "Em aberto"],
          ["pagas", "Pagas"],
          ["todas", "Todas"],
        ].map(([v, r]) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              filtro === v ? "bg-violet-600 text-white" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Cliente / Nota</th>
              <th className="px-5 py-3.5">Parcela</th>
              <th className="px-5 py-3.5">Vencimento</th>
              <th className="px-5 py-3.5">Valor</th>
              <th className="px-5 py-3.5">Situação</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visiveis.map((p) => {
              const vencida = !p.pago && p.vencimento < hoje;
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold">{p.notas?.cliente_nome}</p>
                    <Link href={`/notas/${p.nota_id}`} className="text-xs text-violet-600 hover:underline">
                      Nota #{p.notas?.numero}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">{p.numero}ª</td>
                  <td className={`px-5 py-3.5 ${vencida ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                    {fmtData(p.vencimento + "T12:00:00")}
                  </td>
                  <td className="px-5 py-3.5 font-bold">{fmtBRL(p.valor)}</td>
                  <td className="px-5 py-3.5">
                    {p.pago ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paga
                      </span>
                    ) : vencida ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" /> Vencida
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Em aberto</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {p.pago ? (
                      <button onClick={() => marcarPaga(p, false)} className="text-xs text-slate-400 hover:underline">
                        Desfazer
                      </button>
                    ) : (
                      <button
                        onClick={() => marcarPaga(p, true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Receber
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhuma parcela aqui. As vendas com pagamento "Crediário" aparecem nesta tela.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
