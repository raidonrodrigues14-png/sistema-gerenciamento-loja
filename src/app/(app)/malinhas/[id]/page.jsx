"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, fmtBRL } from "@/lib/supabase";
import { ArrowLeft, CheckCircle2, Undo2, Receipt, Briefcase } from "lucide-react";

const situacoes = {
  enviado: { rotulo: "Com o cliente", cor: "bg-amber-100 text-amber-700" },
  devolvido: { rotulo: "Devolvido", cor: "bg-slate-200 text-slate-600" },
  comprado: { rotulo: "Comprado", cor: "bg-emerald-100 text-emerald-700" },
};

export default function VerMalinha() {
  const { id } = useParams();
  const router = useRouter();
  const [malinha, setMalinha] = useState(null);
  const [itens, setItens] = useState([]);
  const [fechando, setFechando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    const { data: m } = await supabase.from("malinhas").select("*").eq("id", id).single();
    const { data: its } = await supabase.from("malinha_itens").select("*").eq("malinha_id", id);
    setMalinha(m);
    setItens(its || []);
  }
  useEffect(() => { carregar(); }, [id]);

  async function mudarSituacao(item, situacao) {
    await supabase.from("malinha_itens").update({ situacao }).eq("id", item.id);
    carregar();
  }

  const comprados = itens.filter((i) => i.situacao === "comprado");
  const totalComprado = comprados.reduce((s, i) => s + Number(i.preco) * i.quantidade, 0);
  const aberta = malinha?.status === "aberta";

  async function fechar() {
    if (itens.some((i) => i.situacao === "enviado")) {
      setErro('Marque cada peça como "Comprado" ou "Devolvido" antes de fechar.');
      return;
    }
    setFechando(true);
    setErro("");
    try {
      let notaId = null;

      if (comprados.length) {
        const { data: nota, error } = await supabase
          .from("notas")
          .insert({
            cliente_id: malinha.cliente_id,
            cliente_nome: malinha.cliente_nome,
            subtotal: totalComprado,
            desconto: 0,
            total: totalComprado,
            forma_pagamento: "Malinha",
            observacao: `Malinha #${malinha.numero}`,
          })
          .select()
          .single();
        if (error) throw error;
        notaId = nota.id;

        await supabase.from("nota_itens").insert(
          comprados.map((i) => ({
            nota_id: nota.id,
            produto_id: i.produto_id,
            descricao: i.descricao,
            quantidade: i.quantidade,
            preco_unit: i.preco,
            total: Number(i.preco) * i.quantidade,
          }))
        );

        for (const i of comprados) {
          if (i.produto_id) {
            await supabase.rpc("baixar_estoque", { p_produto_id: i.produto_id, p_qtd: i.quantidade });
          }
        }
      }

      await supabase
        .from("malinhas")
        .update({ status: "fechada", fechado_em: new Date().toISOString() })
        .eq("id", id);

      if (notaId) router.push(`/notas/${notaId}`);
      else carregar();
    } catch (e) {
      setErro("Erro ao fechar: " + (e.message || e));
    }
    setFechando(false);
  }

  if (!malinha) {
    return <div className="animate-pulse text-slate-400 font-medium py-20 text-center">Carregando…</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/malinhas")} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {aberta && (
          <button onClick={fechar} disabled={fechando} className="btn-primary">
            <Receipt className="w-4 h-4" />
            {fechando ? "Fechando…" : comprados.length ? `Fechar e gerar nota (${fmtBRL(totalComprado)})` : "Fechar malinha"}
          </button>
        )}
      </div>

      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xl font-extrabold">Malinha #{malinha.numero}</p>
            <p className="text-sm text-slate-500">
              {malinha.cliente_nome} ·{" "}
              <span className={aberta ? "text-amber-600 font-semibold" : "text-emerald-600 font-semibold"}>
                {aberta ? "Com o cliente" : "Fechada"}
              </span>
            </p>
          </div>
        </div>

        {malinha.observacao && <p className="text-sm text-slate-500">Obs: {malinha.observacao}</p>}

        <div className="divide-y divide-slate-100">
          {itens.map((i) => {
            const sit = situacoes[i.situacao] || situacoes.enviado;
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-sm">{i.descricao}</p>
                  <p className="text-xs text-slate-400">{i.quantidade}x · {fmtBRL(i.preco)}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sit.cor}`}>{sit.rotulo}</span>
                {aberta && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => mudarSituacao(i, "comprado")}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Comprou
                    </button>
                    <button
                      onClick={() => mudarSituacao(i, "devolvido")}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Undo2 className="w-3.5 h-3.5" /> Devolveu
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {comprados.length > 0 && (
          <div className="flex justify-between font-extrabold text-lg border-t border-slate-200 pt-4">
            <span>Total comprado</span>
            <span className="text-emerald-600">{fmtBRL(totalComprado)}</span>
          </div>
        )}

        {erro && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{erro}</p>}
      </div>
    </div>
  );
}
