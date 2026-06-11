"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Plus, Search, Pencil, Trash2, FileUp, X } from "lucide-react";

const vazio = {
  codigo: "", nome: "", categoria: "Geral", tamanho: "", cor: "",
  preco_custo: "", preco_venda: "", estoque: 0, fornecedor: "",
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data } = await supabase.from("produtos").select("*").order("nome");
    setProdutos(data || []);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(vazio);
    setEditId(null);
    setModal(true);
  }

  function abrirEdicao(p) {
    setForm({ ...p, preco_custo: p.preco_custo ?? "", preco_venda: p.preco_venda ?? "" });
    setEditId(p.id);
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const dados = {
      codigo: form.codigo || null,
      nome: form.nome,
      categoria: form.categoria || "Geral",
      tamanho: form.tamanho || null,
      cor: form.cor || null,
      preco_custo: Number(form.preco_custo || 0),
      preco_venda: Number(form.preco_venda || 0),
      estoque: Number(form.estoque || 0),
      fornecedor: form.fornecedor || null,
    };
    if (editId) await supabase.from("produtos").update(dados).eq("id", editId);
    else await supabase.from("produtos").insert(dados);
    setSalvando(false);
    setModal(false);
    carregar();
  }

  async function excluir(p) {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    await supabase.from("produtos").delete().eq("id", p.id);
    carregar();
  }

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
          <button onClick={abrirNovo} className="btn-primary">
            <Plus className="w-4 h-4" /> Novo produto
          </button>
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
              <th className="px-5 py-3.5"></th>
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
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => abrirEdicao(p)} className="p-2 rounded-lg hover:bg-violet-100 text-slate-400 hover:text-violet-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => excluir(p)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  Nenhum produto encontrado. Cadastre manualmente ou importe o XML do fornecedor.
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
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? "Editar produto" : "Novo produto"}</h2>
              <button type="button" onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Nome da peça *</label>
              <input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Vestido longo floral" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Código / Ref</label>
                <input className="input" value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div>
                <label className="label">Categoria</label>
                <input className="input" value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Vestidos, Calças…" />
              </div>
              <div>
                <label className="label">Tamanho</label>
                <input className="input" value={form.tamanho || ""} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} placeholder="P, M, G, 42…" />
              </div>
              <div>
                <label className="label">Cor</label>
                <input className="input" value={form.cor || ""} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              </div>
              <div>
                <label className="label">Preço de custo (R$)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
              </div>
              <div>
                <label className="label">Preço de venda (R$) *</label>
                <input className="input" type="number" step="0.01" min="0" required value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
              </div>
              <div>
                <label className="label">Estoque (un)</label>
                <input className="input" type="number" min="0" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
              </div>
              <div>
                <label className="label">Fornecedor</label>
                <input className="input" value={form.fornecedor || ""} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
              </div>
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
