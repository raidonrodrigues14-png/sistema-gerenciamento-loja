"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { Plus, Briefcase, Search, X, Minus, Trash2, Eye } from "lucide-react";

export default function Malinhas() {
  const router = useRouter();
  const [malinhas, setMalinhas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modal, setModal] = useState(false);
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    const { data } = await supabase.from("malinhas").select("*").order("criado_em", { ascending: false });
    setMalinhas(data || []);
  }

  useEffect(() => {
    carregar();
    supabase.from("clientes").select("*").order("nome").then(({ data }) => setClientes(data || []));
    supabase.from("produtos").select("*").gt("estoque", 0).order("nome").then(({ data }) => setProdutos(data || []));
  }, []);

  const filtrados = useMemo(
    () =>
      produtos.filter((p) =>
        [p.nome, p.codigo, p.tamanho, p.cor].filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase())
      ),
    [produtos, busca]
  );

  function adicionar(p) {
    setItens((c) => {
      const existe = c.find((i) => i.produto_id === p.id);
      if (existe) return c.map((i) => (i.produto_id === p.id ? { ...i, qtd: i.qtd + 1 } : i));
      return [
        ...c,
        {
          produto_id: p.id,
          descricao: [p.nome, p.tamanho, p.cor].filter(Boolean).join(" "),
          preco: Number(p.preco_venda),
          qtd: 1,
        },
      ];
    });
  }

  async function criarMalinha() {
    if (!clienteId || !itens.length) {
      setErro("Escolha o cliente e pelo menos uma peça.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const cliente = clientes.find((c) => c.id === clienteId);
      const { data: malinha, error } = await supabase
        .from("malinhas")
        .insert({ cliente_id: clienteId, cliente_nome: cliente.nome, observacao: obs || null })
        .select()
        .single();
      if (error) throw error;

      const linhas = itens.map((i) => ({
        malinha_id: malinha.id,
        produto_id: i.produto_id,
        descricao: i.descricao,
        quantidade: i.qtd,
        preco: i.preco,
      }));
      const { error: e2 } = await supabase.from("malinha_itens").insert(linhas);
      if (e2) throw e2;

      router.push(`/malinhas/${malinha.id}`);
    } catch (e) {
      setErro("Erro: " + (e.message || e));
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Malinhas</h1>
          <p className="text-slate-500">Fashion delivery — peças enviadas para o cliente provar em casa</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nova malinha
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Malinha</th>
              <th className="px-5 py-3.5">Cliente</th>
              <th className="px-5 py-3.5">Enviada em</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {malinhas.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Briefcase className="w-4 h-4 text-violet-500" /> #{m.numero}
                  </div>
                </td>
                <td className="px-5 py-3.5">{m.cliente_nome}</td>
                <td className="px-5 py-3.5 text-slate-500">{fmtData(m.criado_em)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      m.status === "aberta" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {m.status === "aberta" ? "Com o cliente" : "Fechada"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/malinhas/${m.id}`} className="inline-flex items-center gap-1.5 text-violet-600 font-medium hover:underline">
                    <Eye className="w-4 h-4" /> Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {malinhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Nenhuma malinha ainda. Monte a primeira para enviar a um cliente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nova malinha</h2>
              <button onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Cliente *</label>
                <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Observação</label>
                <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-10" placeholder="Buscar peça…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>

            <div className="card divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => adicionar(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-violet-50 text-left text-sm"
                >
                  <span className="truncate">
                    {p.nome} {[p.tamanho, p.cor].filter(Boolean).join(" ")} · {p.estoque} disp.
                  </span>
                  <span className="font-bold shrink-0 ml-3">{fmtBRL(p.preco_venda)}</span>
                </button>
              ))}
            </div>

            {itens.length > 0 && (
              <div className="space-y-2">
                <p className="label">Peças na malinha ({itens.reduce((s, i) => s + i.qtd, 0)})</p>
                {itens.map((i) => (
                  <div key={i.produto_id} className="flex items-center gap-1.5 text-sm">
                    <p className="flex-1 truncate font-medium">{i.descricao}</p>
                    <button onClick={() => setItens((c) => c.map((x) => x.produto_id === i.produto_id ? { ...x, qtd: Math.max(1, x.qtd - 1) } : x))} className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                    <span className="w-6 text-center font-bold">{i.qtd}</span>
                    <button onClick={() => adicionar({ id: i.produto_id, nome: i.descricao, preco_venda: i.preco })} className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                    <button onClick={() => setItens((c) => c.filter((x) => x.produto_id !== i.produto_id))} className="w-9 h-9 shrink-0 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{erro}</p>}

            <button onClick={criarMalinha} disabled={salvando} className="btn-primary w-full justify-center">
              <Briefcase className="w-4 h-4" />
              {salvando ? "Criando…" : "Criar malinha"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
