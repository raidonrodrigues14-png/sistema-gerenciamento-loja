"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, fmtBRL } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { Printer, ArrowLeft, BookOpen } from "lucide-react";

export default function VerNota() {
  const { id } = useParams();
  const router = useRouter();
  const [nota, setNota] = useState(null);
  const [itens, setItens] = useState([]);
  const [parcelas, setParcelas] = useState([]);

  useEffect(() => {
    supabase.from("notas").select("*").eq("id", id).single().then(({ data }) => setNota(data));
    supabase.from("nota_itens").select("*").eq("nota_id", id).then(({ data }) => setItens(data || []));
    supabase.from("parcelas").select("*").eq("nota_id", id).order("numero").then(({ data }) => setParcelas(data || []));
  }, [id]);

  if (!nota) {
    return <div className="animate-pulse text-slate-400 font-medium py-20 text-center">Carregando…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="no-print flex items-center justify-between">
        <button onClick={() => router.push("/notas")} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex gap-2">
          {parcelas.length > 0 && (
            <Link href={`/carne?nota=${nota.id}`} className="btn-ghost">
              <BookOpen className="w-4 h-4" /> Imprimir Boletas
            </Link>
          )}
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      <div className="card p-8 print:shadow-none print:border-none">
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/superbonita.png"
              alt="Super Bonita"
              width={48}
              height={48}
              className="rounded-full"
              style={{ border: "1px solid rgba(128,128,128,0.3)" }}
            />
            <div>
              <p className="serif text-xl font-extrabold text-slate-900" style={{ fontStyle: "italic" }}>Super Bonita</p>
              <p className="text-sm text-slate-400">Nota de venda</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-violet-600">#{nota.numero}</p>
            <p className="text-sm text-slate-400">
              {new Date(nota.criado_em).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Cliente</p>
            <p className="font-semibold text-slate-900">{nota.cliente_nome}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Pagamento</p>
            <p className="font-semibold text-slate-900">{nota.forma_pagamento}</p>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="py-2.5">Item</th>
              <th className="py-2.5 text-center">Qtd</th>
              <th className="py-2.5 text-right">Preço un.</th>
              <th className="py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itens.map((i) => (
              <tr key={i.id}>
                <td className="py-3 font-medium text-slate-900">{i.descricao}</td>
                <td className="py-3 text-center">{i.quantidade}</td>
                <td className="py-3 text-right text-slate-500">{fmtBRL(i.preco_unit)}</td>
                <td className="py-3 text-right font-semibold">{fmtBRL(i.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span><span>{fmtBRL(nota.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Desconto</span><span>- {fmtBRL(nota.desconto)}</span>
            </div>
            <div className="flex justify-between text-xl font-extrabold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total</span><span>{fmtBRL(nota.total)}</span>
            </div>
          </div>
        </div>

        {parcelas.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">
              Carnê — {parcelas.length} parcelas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {parcelas.map((p) => (
                <div key={p.id} className={`rounded-xl border p-3 text-sm ${p.pago ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                  <p className="font-bold">{p.numero}ª — {fmtBRL(p.valor)}</p>
                  <p className="text-xs text-slate-500">
                    Venc: {new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                  <p className={`text-xs font-semibold ${p.pago ? "text-emerald-600" : "text-amber-600"}`}>
                    {p.pago ? "Paga" : "Em aberto"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {nota.observacao && (
          <p className="mt-6 text-sm text-slate-500 border-t border-slate-100 pt-4">
            <strong>Obs:</strong> {nota.observacao}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Obrigado pela preferência! 
        </p>
      </div>
    </div>
  );
}
