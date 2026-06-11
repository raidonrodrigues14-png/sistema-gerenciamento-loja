"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { Plus, Search, Receipt, Eye } from "lucide-react";

export default function Notas() {
  const [notas, setNotas] = useState([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    supabase
      .from("notas")
      .select("*")
      .order("criado_em", { ascending: false })
      .then(({ data }) => setNotas(data || []));
  }, []);

  const filtradas = notas.filter((n) =>
    `${n.numero} ${n.cliente_nome}`.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Notas / Vendas</h1>
          <p className="text-slate-500">{notas.length} notas geradas</p>
        </div>
        <Link href="/notas/nova" className="btn-primary">
          <Plus className="w-4 h-4" /> Nova nota
        </Link>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Buscar por número ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Nota</th>
              <th className="px-5 py-3.5">Cliente</th>
              <th className="px-5 py-3.5">Data</th>
              <th className="px-5 py-3.5">Pagamento</th>
              <th className="px-5 py-3.5">Total</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtradas.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Receipt className="w-4 h-4 text-violet-500" /> #{n.numero}
                  </div>
                </td>
                <td className="px-5 py-3.5">{n.cliente_nome}</td>
                <td className="px-5 py-3.5 text-slate-500">{fmtData(n.criado_em)}</td>
                <td className="px-5 py-3.5 text-slate-500">{n.forma_pagamento}</td>
                <td className="px-5 py-3.5 font-bold text-emerald-600">{fmtBRL(n.total)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/notas/${n.id}`}
                    className="inline-flex items-center gap-1.5 text-violet-600 font-medium hover:underline"
                  >
                    <Eye className="w-4 h-4" /> Ver
                  </Link>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  Nenhuma nota ainda. Clique em "Nova nota" para gerar a primeira.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
