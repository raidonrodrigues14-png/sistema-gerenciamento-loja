"use client";

import { useEffect, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Search, Printer, Tags, Trash2 } from "lucide-react";
import JsBarcode from "jsbarcode";

export default function Etiquetas() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [fila, setFila] = useState([]); // { produto, qtd }

  useEffect(() => {
    supabase.from("produtos").select("*").order("nome").then(({ data }) => setProdutos(data || []));
  }, []);

  // gera os códigos de barras sempre que a fila muda
  useEffect(() => {
    fila.forEach((item, fi) => {
      for (let n = 0; n < item.qtd; n++) {
        const el = document.getElementById(`bar-${fi}-${n}`);
        if (el) {
          try {
            JsBarcode(el, item.produto.codigo || item.produto.id.slice(0, 8), {
              format: "CODE128",
              width: 1.4,
              height: 34,
              fontSize: 10,
              margin: 0,
            });
          } catch {
            /* código inválido — ignora */
          }
        }
      }
    });
  }, [fila]);

  function adicionar(p) {
    setFila((f) => {
      const existe = f.find((i) => i.produto.id === p.id);
      if (existe) return f.map((i) => (i.produto.id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
      return [...f, { produto: p, qtd: 1 }];
    });
  }

  const filtrados = produtos.filter((p) =>
    [p.nome, p.codigo, p.tamanho, p.cor].filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase())
  );

  const totalEtiquetas = fila.reduce((s, i) => s + i.qtd, 0);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Etiquetas</h1>
          <p className="text-slate-500">Selecione as peças e imprima etiquetas com código de barras</p>
        </div>
        <button onClick={() => window.print()} disabled={!fila.length} className="btn-primary">
          <Printer className="w-4 h-4" /> Imprimir {totalEtiquetas} etiquetas
        </button>
      </div>

      <div className="no-print grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Buscar peça…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="card divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => adicionar(p)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-violet-50 text-left"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{p.nome}</p>
                  <p className="text-xs text-slate-400">
                    {[p.codigo, p.tamanho, p.cor].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="font-bold text-sm shrink-0 ml-3">{fmtBRL(p.preco_venda)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-3 self-start">
          <h2 className="font-bold flex items-center gap-2">
            <Tags className="w-4 h-4 text-violet-600" /> Fila de impressão
          </h2>
          {fila.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Clique nas peças ao lado.</p>
          ) : (
            fila.map((i, idx) => (
              <div key={i.produto.id} className="flex items-center gap-2 text-sm">
                <p className="flex-1 truncate font-medium">{i.produto.nome} {i.produto.tamanho || ""} {i.produto.cor || ""}</p>
                <input
                  type="number"
                  min="1"
                  className="input w-20 py-1.5"
                  value={i.qtd}
                  onChange={(e) =>
                    setFila((f) => f.map((x, xi) => (xi === idx ? { ...x, qtd: Math.max(1, Number(e.target.value || 1)) } : x)))
                  }
                />
                <button
                  onClick={() => setFila((f) => f.filter((_, xi) => xi !== idx))}
                  className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Etiquetas para impressão */}
      {fila.length > 0 && (
        <div>
          <p className="no-print text-sm font-semibold text-slate-500 mb-2">Pré-visualização:</p>
          <div className="flex flex-wrap gap-2 bg-white p-4 rounded-2xl border border-slate-200 print:border-none print:p-0">
            {fila.flatMap((item, fi) =>
              Array.from({ length: item.qtd }).map((_, n) => (
                <div
                  key={`${fi}-${n}`}
                  className="border border-slate-300 rounded p-2 w-[180px] text-center break-inside-avoid"
                >
                  <p className="text-[10px] font-bold truncate">{item.produto.nome}</p>
                  <p className="text-[9px] text-slate-500">
                    {[item.produto.tamanho, item.produto.cor].filter(Boolean).join(" · ") || " "}
                  </p>
                  <svg id={`bar-${fi}-${n}`} className="mx-auto max-w-full" />
                  <p className="text-xs font-extrabold">{fmtBRL(item.produto.preco_venda)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
