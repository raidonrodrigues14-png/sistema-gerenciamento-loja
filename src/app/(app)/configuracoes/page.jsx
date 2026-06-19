"use client";

import { useEffect, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import {
  Lock, AlertTriangle, Loader2, CheckCircle2,
  Receipt, Wallet, CalendarClock,
} from "lucide-react";

// Hash SHA-256 do PIN do dono (não guardamos o PIN em texto puro) — mesmo
// padrão já usado na troca da chave Pix da loja.
async function hashPin(pin) {
  const enc = new TextEncoder().encode(String(pin || "").trim());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function limitesMesAtual() {
  const hoje = new Date();
  const iniDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  return {
    iniISO: iniDate.toISOString(),
    fimISO: fimDate.toISOString(),
    iniData: iniDate.toISOString().slice(0, 10),
    fimData: fimDate.toISOString().slice(0, 10),
    rotulo: iniDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
  };
}

// ─── Gate: criar/verificar o PIN do dono antes de mostrar a zona de risco ────
function PortaoPin({ cfg, onLiberado }) {
  const precisaCriar = !cfg?.pin_hash;
  const [pin, setPin] = useState("");
  const [confirmaPin, setConfirmaPin] = useState("");
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    if (precisaCriar) {
      if (pin.trim().length < 4) return setErro("O PIN precisa ter pelo menos 4 dígitos.");
      if (pin !== confirmaPin) return setErro("Os PINs digitados não coincidem.");
      setVerificando(true);
      const pin_hash = await hashPin(pin);
      const { data, error } = await supabase
        .from("config_admin")
        .update({ pin_hash })
        .eq("id", 1)
        .select()
        .single();
      setVerificando(false);
      if (error) {
        return setErro(
          "Erro ao salvar o PIN — verifique se a migração supabase/config_admin.sql foi executada no Supabase."
        );
      }
      onLiberado(data);
    } else {
      setVerificando(true);
      const hash = await hashPin(pin);
      setVerificando(false);
      if (hash === cfg.pin_hash) onLiberado(cfg);
      else setErro("PIN incorreto.");
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2 text-violet-600">
        <Lock className="w-5 h-5" />
        <p className="font-bold text-base">{precisaCriar ? "Criar PIN do dono" : "Área restrita ao dono da loja"}</p>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">
        {precisaCriar
          ? "Esse PIN protege ações sensíveis e irreversíveis do sistema — como zerar dados. Cadastre um PIN que só você conhece; funcionárias não devem ter acesso a ele."
          : "Para abrir as opções de zerar dados, digite o PIN cadastrado pelo dono da loja."}
      </p>
      <form onSubmit={enviar} className="space-y-3 max-w-xs">
        <div>
          <label className="label">{precisaCriar ? "Criar PIN (mín. 4 dígitos)" : "PIN"}</label>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
          />
        </div>
        {precisaCriar && (
          <div>
            <label className="label">Confirmar PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={confirmaPin}
              onChange={(e) => setConfirmaPin(e.target.value)}
              placeholder="••••"
            />
          </div>
        )}
        {erro && <p className="text-sm text-red-500">{erro}</p>}
        <button className="btn-primary" disabled={verificando || !pin}>
          {verificando ? "Verificando…" : precisaCriar ? "Criar PIN" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

// ─── Card de uma categoria isolada (Notas, Financeiro ou Crediário) ─────────
// Cada card tem seu próprio escopo (mês atual / tudo), prévia e confirmação —
// assim a dona da loja zera uma coisa de cada vez, sem afetar as outras.
function CardZerarCategoria({ titulo, icon: Icon, corPerigo, descricaoPorEscopo, getPreview, getExecutar, textoConfirmacao }) {
  const [escopo, setEscopo] = useState("mes"); // "mes" | "tudo"
  const [preview, setPreview] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [executando, setExecutando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    setCarregandoPreview(true);
    setFeito(false);
    setConfirmText("");
    setErro("");
    getPreview(escopo).then((p) => {
      if (ativo) {
        setPreview(p);
        setCarregandoPreview(false);
      }
    });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escopo]);

  const liberado = confirmText.trim().toUpperCase() === "ZERAR";
  const semNada = preview && preview.qtd === 0;

  async function confirmar() {
    if (!liberado) return;
    if (!window.confirm("Tem certeza? Essa ação não pode ser desfeita.")) return;
    setErro("");
    setExecutando(true);
    try {
      await getExecutar(escopo)();
      setFeito(true);
    } catch (e) {
      setErro(e.message || "Erro ao zerar os dados.");
    } finally {
      setExecutando(false);
    }
  }

  return (
    <div className="card p-6 space-y-4" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
      <div className="flex items-center gap-2" style={{ color: corPerigo }}>
        <Icon className="w-5 h-5" />
        <p className="font-bold text-base">{titulo}</p>
      </div>

      <div className="flex gap-2">
        {[["mes", "Mês atual"], ["tudo", "Tudo desde o início"]].map(([v, r]) => (
          <button
            key={v}
            type="button"
            onClick={() => setEscopo(v)}
            disabled={executando}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition ${
              escopo === v ? "bg-violet-50 border-violet-300 text-violet-700" : "border-slate-300 text-slate-500"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500 leading-relaxed">{descricaoPorEscopo(escopo)}</p>

      {carregandoPreview && (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculando o que será apagado…
        </p>
      )}

      {!carregandoPreview && preview && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--line-2)" }}>
          <p>
            <strong>{preview.qtd}</strong> {preview.label}
            {preview.total != null ? ` — total ${fmtBRL(preview.total)}` : ""}
          </p>
        </div>
      )}

      {feito ? (
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4" /> Zerado com sucesso.
        </div>
      ) : (
        <>
          {!semNada && !carregandoPreview && (
            <div className="space-y-2 max-w-sm">
              <label className="label">Digite <strong>ZERAR</strong> para confirmar</label>
              <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="ZERAR" />
            </div>
          )}
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <button
            onClick={confirmar}
            disabled={!liberado || executando || semNada || carregandoPreview}
            className="btn-primary"
            style={{ background: liberado ? corPerigo : undefined, opacity: !liberado || executando || semNada ? 0.5 : 1 }}
          >
            {executando ? "Apagando…" : semNada ? "Nada para apagar" : textoConfirmacao}
          </button>
        </>
      )}
    </div>
  );
}

export default function Configuracoes() {
  const [carregando, setCarregando] = useState(true);
  const [cfg, setCfg] = useState(null);
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    async function carregar() {
      let { data } = await supabase.from("config_admin").select("*").eq("id", 1).maybeSingle();
      if (!data) {
        const ins = await supabase.from("config_admin").insert({ id: 1 }).select().single();
        data = ins.data;
      }
      setCfg(data);
      setCarregando(false);
    }
    carregar();
  }, []);

  // ── Notas (vendas) ──────────────────────────────────────────────────────
  async function previewNotas(escopo) {
    let query = supabase.from("notas").select("id, total");
    if (escopo === "mes") {
      const { iniISO, fimISO } = limitesMesAtual();
      query = query.gte("criado_em", iniISO).lt("criado_em", fimISO);
    }
    const { data } = await query;
    const notas = data || [];
    return { qtd: notas.length, total: notas.reduce((s, n) => s + Number(n.total), 0), label: "nota(s) de venda" };
  }

  async function executarNotas(escopo) {
    let query = supabase.from("notas").select("id");
    if (escopo === "mes") {
      const { iniISO, fimISO } = limitesMesAtual();
      query = query.gte("criado_em", iniISO).lt("criado_em", fimISO);
    }
    const { data } = await query;
    const idsNotas = (data || []).map((n) => n.id);
    if (!idsNotas.length) return;

    const { data: parcelasDessasNotas } = await supabase.from("parcelas").select("id").in("nota_id", idsNotas);
    const idsParcelas = (parcelasDessasNotas || []).map((p) => p.id);
    if (idsParcelas.length) {
      await supabase.from("pagamentos_parcela").delete().in("parcela_id", idsParcelas);
      await supabase.from("parcelas").delete().in("id", idsParcelas);
    }
    await supabase.from("nota_itens").delete().in("nota_id", idsNotas);
    await supabase.from("notas").delete().in("id", idsNotas);
  }

  // ── Lançamentos do Financeiro ───────────────────────────────────────────
  async function previewLancamentos(escopo) {
    let query = supabase.from("lancamentos").select("id, valor");
    if (escopo === "mes") {
      const { iniData, fimData } = limitesMesAtual();
      query = query.gte("data", iniData).lt("data", fimData);
    }
    const { data } = await query;
    const lanc = data || [];
    return { qtd: lanc.length, total: lanc.reduce((s, l) => s + Number(l.valor), 0), label: "lançamento(s) manuais" };
  }

  async function executarLancamentos(escopo) {
    let query = supabase.from("lancamentos").delete();
    if (escopo === "mes") {
      const { iniData, fimData } = limitesMesAtual();
      query = query.gte("data", iniData).lt("data", fimData);
    } else {
      query = query.neq("id", 0);
    }
    await query;
  }

  // ── Crediário recebido (parcelas pagas) ─────────────────────────────────
  async function previewCrediario(escopo) {
    let query = supabase.from("parcelas").select("id", { count: "exact", head: true }).eq("pago", true);
    if (escopo === "mes") {
      const { iniData, fimData } = limitesMesAtual();
      query = query.gte("pago_em", iniData).lt("pago_em", fimData);
    }
    const { count } = await query;
    return { qtd: count || 0, total: null, label: 'parcela(s) paga(s) que voltarão a "em aberto"' };
  }

  async function executarCrediario(escopo) {
    if (escopo === "mes") {
      const { iniData, fimData } = limitesMesAtual();
      await supabase.from("pagamentos_parcela").delete().gte("data", iniData).lt("data", fimData);
      await supabase.from("parcelas").update({ pago: false, pago_em: null }).gte("pago_em", iniData).lt("pago_em", fimData);
    } else {
      await supabase.from("pagamentos_parcela").delete().neq("id", 0);
      await supabase.from("parcelas").update({ pago: false, pago_em: null }).eq("pago", true);
    }
  }

  if (carregando) {
    return <div className="text-slate-400">Carregando…</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Configurações</h1>
        <p className="text-slate-500">Área restrita ao dono da loja</p>
      </div>

      {!liberado && <PortaoPin cfg={cfg} onLiberado={(c) => { setCfg(c); setLiberado(true); }} />}

      {liberado && (
        <>
          <div className="card p-5 flex items-start gap-3" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.3)" }}>
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 leading-relaxed">
              Cada cartão abaixo zera <strong>só aquela categoria</strong> — você escolhe uma de cada vez, no mês atual ou
              em todo o histórico. Nenhuma delas afeta clientes, produtos/estoque, malinhas em aberto ou outras
              configurações do sistema. A ação não pode ser desfeita.
            </p>
          </div>

          <CardZerarCategoria
            titulo="Notas (vendas)"
            icon={Receipt}
            corPerigo="#dc2626"
            descricaoPorEscopo={(escopo) =>
              escopo === "mes"
                ? `Apaga as notas de venda criadas em ${limitesMesAtual().rotulo}, junto com os itens e as parcelas de crediário vinculadas a essas notas.`
                : "Apaga todas as notas de venda do histórico inteiro, junto com os itens e as parcelas de crediário vinculadas a elas."
            }
            getPreview={previewNotas}
            getExecutar={(escopo) => () => executarNotas(escopo)}
            textoConfirmacao="Zerar notas"
          />

          <CardZerarCategoria
            titulo="Financeiro (lançamentos manuais)"
            icon={Wallet}
            corPerigo="#d97706"
            descricaoPorEscopo={(escopo) =>
              escopo === "mes"
                ? `Apaga os lançamentos manuais (entradas e saídas) cadastrados em Financeiro durante ${limitesMesAtual().rotulo}.`
                : "Apaga todos os lançamentos manuais (entradas e saídas) já cadastrados em Financeiro."
            }
            getPreview={previewLancamentos}
            getExecutar={(escopo) => () => executarLancamentos(escopo)}
            textoConfirmacao="Zerar financeiro"
          />

          <CardZerarCategoria
            titulo="Crediário recebido (parcelas)"
            icon={CalendarClock}
            corPerigo="#7c3aed"
            descricaoPorEscopo={(escopo) =>
              escopo === "mes"
                ? `Reverte para "em aberto" as parcelas de crediário que foram pagas em ${limitesMesAtual().rotulo} — não apaga o plano de parcelas, só desfaz o recebimento.`
                : "Reverte para \"em aberto\" todas as parcelas de crediário já pagas, em qualquer mês — não apaga os planos de parcelas, só desfaz os recebimentos."
            }
            getPreview={previewCrediario}
            getExecutar={(escopo) => () => executarCrediario(escopo)}
            textoConfirmacao="Zerar crediário recebido"
          />
        </>
      )}
    </div>
  );
}
