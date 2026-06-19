"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Search, FileUp, Lock } from "lucide-react";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");

  async function carregar() {
    const { data } = await supabase.from("produtos").select("*").order("nome");
    setProdutos(data || []);
  }
  useEffect(() => { carregar(); }, []);

  const filtrados = produtos.filter((p) =>
    [p.nome, p.codigo, p.categoria, p.tamanho, p.cor, p.fornecedor]
      .filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Produtos</h1>
          <p className="text-slate-500">{produtos.length} roupas cadastradas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/importar" className="btn-ghost">
            <FileUp className="w-4 h-4" /> Importar XML
          </Link>
          <Link href="/produtos/adicionar" className="btn-primary">
            <Lock className="w-4 h-4" /> Adicionar produtos
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Buscar por nome, código, categoria, tamanho, cor…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Produto</th>
              <th className="px-5 py-3.5">Código</th>
              <th className="px-5 py-3.5">Tam / Cor</th>
              <th className="px-5 py-3.5">Custo</th>
              <th className="px-5 py-3.5">Venda</th>
              <th className="px-5 py-3.5">Estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-900">{p.nome}</p>
                  <p className="text-xs text-slate-400">{p.categoria}{p.fornecedor ? ` · ${p.fornecedor}` : ""}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{p.codigo || "—"}</td>
                <td className="px-5 py-3.5 text-slate-500">
                  {[p.tamanho, p.cor].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{fmtBRL(p.preco_custo)}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-900">{fmtBRL(p.preco_venda)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.estoque <= 0
                        ? "bg-red-100 text-red-600"
                        : p.estoque <= 3
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {p.estoque} un
                  </span>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  Nenhum produto encontrado. Cadastre manualmente ou importe o XML do fornecedor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
