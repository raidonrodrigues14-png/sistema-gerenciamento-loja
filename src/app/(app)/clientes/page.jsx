"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Pencil, Trash2, X, Users } from "lucide-react";

const vazio = { nome: "", cpf_cnpj: "", telefone: "", email: "", endereco: "" };

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const { data } = await supabase.from("clientes").select("*").order("nome");
    setClientes(data || []);
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const dados = {
      nome: form.nome,
      cpf_cnpj: form.cpf_cnpj || null,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
    };
    if (editId) await supabase.from("clientes").update(dados).eq("id", editId);
    else await supabase.from("clientes").insert(dados);
    setSalvando(false);
    setModal(false);
    carregar();
  }

  async function excluir(c) {
    if (!confirm(`Excluir cliente "${c.nome}"?`)) return;
    await supabase.from("clientes").delete().eq("id", c.id);
    carregar();
  }

  const filtrados = clientes.filter((c) =>
    [c.nome, c.telefone, c.email, c.cpf_cnpj].filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
          <p className="text-slate-500">{clientes.length} clientes cadastrados</p>
        </div>
        <button
          onClick={() => { setForm(vazio); setEditId(null); setModal(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10"
          placeholder="Buscar por nome, telefone, e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Nome</th>
              <th className="px-5 py-3.5">CPF/CNPJ</th>
              <th className="px-5 py-3.5">Telefone</th>
              <th className="px-5 py-3.5">E-mail</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                      {c.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900">{c.nome}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{c.cpf_cnpj || "—"}</td>
                <td className="px-5 py-3.5 text-slate-500">{c.telefone || "—"}</td>
                <td className="px-5 py-3.5 text-slate-500">{c.email || "—"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => { setForm(c); setEditId(c.id); setModal(true); }}
                      className="p-2 rounded-lg hover:bg-violet-100 text-slate-400 hover:text-violet-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => excluir(c)} className="p-2 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum cliente cadastrado ainda.
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
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? "Editar cliente" : "Novo cliente"}</h2>
              <button type="button" onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Nome *</label>
              <input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CPF / CNPJ</label>
                <input className="input" value={form.cpf_cnpj || ""} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={form.telefone || ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Endereço</label>
              <input className="input" value={form.endereco || ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
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
