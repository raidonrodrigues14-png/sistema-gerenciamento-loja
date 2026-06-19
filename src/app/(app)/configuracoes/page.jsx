"use client";

import { useEffect, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Lock, ShieldAlert, Trash2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

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

// ─── Card de uma ação de "zerar dados" — pede prévia + confirmação digitada ──
function CardZerar({ titulo, descricao, corPerigo, carregarPreview, executar, textoConfirmacao }) {
  const [preview, setPreview] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [executando, setExecutando] = useState(false);
  const [feito, setFeito] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarPreview().then((p) => {
      setPreview(p);
      setCarregandoPreview(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liberado = confirmText.trim().toUpperCase() === "ZERAR";
  const semNada = preview && preview.qtdNotas === 0 && preview.qtdLancamentos === 0;

  async function confirmar() {
    if (!liberado) return;
    if (!window.confirm("Tem certeza? Essa ação não pode ser desfeita.")) return;
    setErro("");
    setExecutando(true);
    try {
      await executar();
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
        <Trash2 className="w-5 h-5" />
        <p className="font-bold text-base">{titulo}</p>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{descricao}</p>

      {carregandoPreview && (
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculando o que será apagado…
        </p>
      )}

      {!carregandoPreview && preview && (
        <div className="rounded-xl p-4 text-sm space-y-1" style={{ background: "var(--bg)", border: "1px solid var(--line-2)" }}>
          <p><strong>{preview.qtdNotas}</strong> nota(s) de venda{preview.totalVendas != null ? ` — total ${fmtBRL(preview.totalVendas)}` : ""}</p>
          <p><strong>{preview.qtdLancamentos}</strong> lançamento(s) manuais do financeiro</p>
          {preview.qtdParcelasRevertidas != null && (
            <p><strong>{preview.qtdParcelasRevertidas}</strong> parcela(s) de crediário voltarão a "em aberto"</p>
          )}
        </div>
      )}

      {feito ? (
        <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
          <CheckCircle2 className="w-4 h-4" /> Dados zerados com sucesso.
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

  // ── Prévias ──
  async function previewMesAtual() {
    const { iniISO, fimISO, iniData, fimData } = limitesMesAtual();
    const [notasRes, lancRes, parcRevertRes] = await Promise.all([
      supabase.from("notas").select("id, total").gte("criado_em", iniISO).lt("criado_em", fimISO),
      supabase.from("lancamentos").select("id", { count: "exact", head: true }).gte("data", iniData).lt("data", fimData),
      supabase.from("parcelas").select("id", { count: "exact", head: true }).gte("pago_em", iniData).lt("pago_em", fimData),
    ]);
    const notas = notasRes.data || [];
    return {
      qtdNotas: notas.length,
      totalVendas: notas.reduce((s, n) => s + Number(n.total), 0),
      qtdLancamentos: lancRes.count || 0,
      qtdParcelasRevertidas: parcRevertRes.count || 0,
    };
  }

  async function previewTudo() {
    const [notasRes, lancRes] = await Promise.all([
      supabase.from("notas").select("id", { count: "exact", head: true }),
      supabase.from("lancamentos").select("id", { count: "exact", head: true }),
    ]);
    return { qtdNotas: notasRes.count || 0, qtdLancamentos: lancRes.count || 0, totalVendas: null };
  }

  // ── Execuções ──
  async function zerarMesAtual() {
    const { iniISO, fimISO, iniData, fimData } = limitesMesAtual();

    const { data: notasMes } = await supabase.from("notas").select("id").gte("criado_em", iniISO).lt("criado_em", fimISO);
    const idsNotas = (notasMes || []).map((n) => n.id);

    if (idsNotas.length) {
      const { data: parcelasDessasNotas } = await supabase.from("parcelas").select("id").in("nota_id", idsNotas);
      const idsParcelas = (parcelasDessasNotas || []).map((p) => p.id);
      if (idsParcelas.length) {
        await supabase.from("pagamentos_parcela").delete().in("parcela_id", idsParcelas);
        await supabase.from("parcelas").delete().in("id", idsParcelas);
      }
      await supabase.from("nota_itens").delete().in("nota_id", idsNotas);
      await supabase.from("notas").delete().in("id", idsNotas);
    }

    // Parcelas de vendas de meses anteriores que foram pagas neste mês:
    // volta pra "em aberto" em vez de apagar o plano de parcelas inteiro.
    await supabase.from("pagamentos_parcela").delete().gte("data", iniData).lt("data", fimData);
    await supabase.from("parcelas").update({ pago: false, pago_em: null }).gte("pago_em", iniData).lt("pago_em", fimData);

    // Lançamentos manuais do financeiro deste mês
    await supabase.from("lancamentos").delete().gte("data", iniData).lt("data", fimData);
  }

  async function zerarTudo() {
    await supabase.from("pagamentos_parcela").delete().neq("id", 0);
    await supabase.from("parcelas").delete().neq("id", 0);
    await supabase.from("nota_itens").delete().neq("id", 0);
    await supabase.from("notas").delete().neq("id", 0);
    await supabase.from("lancamentos").delete().neq("id", 0);
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
              As ações abaixo apagam dados <strong>de verdade e sem volta</strong>. Elas não afetam clientes, produtos/estoque,
              malinhas em aberto nem outras configurações do sistema — só notas de venda, parcelas de crediário e
              lançamentos do Financeiro/Caixa.
            </p>
          </div>

          <CardZerar
            titulo="Zerar mês atual"
            descricao={`Apaga vendas (notas), parcelas e lançamentos do financeiro de ${limitesMesAtual().rotulo}. Parcelas de crediário de meses anteriores que foram pagas este mês voltam a ficar "em aberto".`}
            corPerigo="#d97706"
            carregarPreview={previewMesAtual}
            executar={zerarMesAtual}
            textoConfirmacao="Zerar mês atual"
          />

          <CardZerar
            titulo="Zerar tudo (todo o histórico)"
            descricao="Apaga todas as notas de venda, parcelas de crediário e lançamentos do financeiro desde o início do sistema."
            corPerigo="#dc2626"
            carregarPreview={previewTudo}
            executar={zerarTudo}
            textoConfirmacao="Zerar tudo"
          />
        </>
      )}
    </div>
  );
}
