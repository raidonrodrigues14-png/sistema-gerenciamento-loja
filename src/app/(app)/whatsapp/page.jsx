"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Send, CheckCircle2, Users, AlertCircle } from "lucide-react";

// transforma o telefone em formato internacional do WhatsApp (55 + DDD + número)
function foneWhats(telefone) {
  const d = (telefone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length >= 10 && d.length <= 11) return "55" + d;
  return d;
}

const modelos = [
  {
    rotulo: "Novidades",
    texto: "Oi {nome}! 💛 Chegaram peças novas aqui na Loja Joselane e lembrei de você! Quer que eu te mande fotos?",
  },
  {
    rotulo: "Promoção",
    texto: "Oi {nome}! Tudo bem? 🎉 Estamos com promoção especial esta semana na Loja Joselane. Vem aproveitar antes que acabe!",
  },
  {
    rotulo: "Malinha",
    texto: "Oi {nome}! Separei umas peças lindas com a sua cara 😍 Quer que eu monte uma malinha pra você provar em casa?",
  },
  {
    rotulo: "Cobrança gentil",
    texto: "Oi {nome}, tudo bem? Passando só pra lembrar da sua parcelinha aqui da Loja Joselane que está em aberto. Qualquer coisa me chama! 💛",
  },
];

export default function WhatsApp() {
  const [clientes, setClientes] = useState([]);
  const [mensagem, setMensagem] = useState(modelos[0].texto);
  const [sel, setSel] = useState({});
  const [enviados, setEnviados] = useState({});

  useEffect(() => {
    supabase.from("clientes").select("*").order("nome").then(({ data }) => {
      const lista = data || [];
      setClientes(lista);
      const s = {};
      lista.forEach((c) => { if (foneWhats(c.telefone)) s[c.id] = true; });
      setSel(s);
    });
  }, []);

  const comFone = clientes.filter((c) => foneWhats(c.telefone));
  const semFone = clientes.filter((c) => !foneWhats(c.telefone));
  const selecionados = comFone.filter((c) => sel[c.id]);
  const pendentes = selecionados.filter((c) => !enviados[c.id]);

  function mensagemDe(c) {
    return mensagem.replaceAll("{nome}", (c.nome || "").split(" ")[0]);
  }

  function abrir(c) {
    const url = `https://wa.me/${foneWhats(c.telefone)}?text=${encodeURIComponent(mensagemDe(c))}`;
    window.open(url, "_blank");
    setEnviados((e) => ({ ...e, [c.id]: true }));
  }

  function abrirProximo() {
    if (pendentes.length) abrir(pendentes[0]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Disparo WhatsApp</h1>
        <p className="text-slate-500">
          Escreva uma vez, envie para todos — o WhatsApp abre com a mensagem pronta, é só apertar enviar.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Mensagem */}
        <div className="card p-5 space-y-4 self-start">
          <div>
            <label className="label">Modelos prontos</label>
            <div className="flex flex-wrap gap-2">
              {modelos.map((m) => (
                <button
                  key={m.rotulo}
                  onClick={() => setMensagem(m.texto)}
                  className="btn-ghost"
                  style={{ height: 34, padding: "0 12px", fontSize: 12.5 }}
                >
                  {m.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Mensagem — use {"{nome}"} para o nome do cliente</label>
            <textarea
              className="input"
              rows={6}
              style={{ height: "auto", resize: "vertical", lineHeight: 1.5, paddingTop: 11 }}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          {selecionados[0] && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--line-2)" }}>
              <p className="label" style={{ marginBottom: 6 }}>Prévia para {selecionados[0].nome}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{mensagemDe(selecionados[0])}</p>
            </div>
          )}

          <button
            onClick={abrirProximo}
            disabled={!pendentes.length || !mensagem.trim()}
            className="btn-primary w-full justify-center"
          >
            <Send className="w-4 h-4" />
            {pendentes.length
              ? `Enviar próximo (${pendentes[0].nome}) — faltam ${pendentes.length}`
              : "Todos enviados! 🎉"}
          </button>
          <p className="text-xs text-slate-400">
            O WhatsApp abre em outra aba com a mensagem pronta. Aperte enviar lá, volte aqui e clique de novo para o próximo.
          </p>
        </div>

        {/* Clientes */}
        <div className="card p-5 space-y-3 self-start">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-600" />
              Clientes ({selecionados.length} selecionados)
            </h2>
            <button
              onClick={() => {
                const todos = selecionados.length < comFone.length;
                const s = {};
                comFone.forEach((c) => { s[c.id] = todos; });
                setSel(s);
              }}
              className="text-sm text-violet-600 font-medium hover:underline"
            >
              {selecionados.length < comFone.length ? "Marcar todos" : "Desmarcar todos"}
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[55vh] overflow-y-auto">
            {comFone.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={!!sel[c.id]}
                  onChange={(e) => setSel({ ...sel, [c.id]: e.target.checked })}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-slate-400">{c.telefone}</p>
                </div>
                {enviados[c.id] ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enviado
                  </span>
                ) : (
                  <button
                    onClick={() => abrir(c)}
                    disabled={!mensagem.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </button>
                )}
              </div>
            ))}
            {comFone.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">
                Nenhum cliente com telefone cadastrado.
              </p>
            )}
          </div>

          {semFone.length > 0 && (
            <p className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {semFone.length} cliente(s) sem telefone válido: {semFone.map((c) => c.nome).join(", ")}.
              Cadastre o telefone com DDD (ex: 86 99999-9999).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
