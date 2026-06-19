"use client";

import { useEffect, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import { gerarPixPayload, formatarChavePix, qrUrl } from "@/lib/pix";
import { ShieldCheck, ShieldAlert, Settings, LogOut, Copy, Check, Lock } from "lucide-react";

// Hash SHA-256 do PIN do dono — mesmo PIN usado em Configurações para proteger
// ações sensíveis. Aqui protege a troca da chave Pix/mensalidade da licença,
// pra terceiros não conseguirem desviar o pagamento pra outra chave.
async function hashPin(pin) {
  const enc = new TextEncoder().encode(String(pin || "").trim());
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function somarDias(dataISO, dias) {
  const d = new Date(dataISO + "T12:00:00");
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}
function diffDias(dataISO, baseISO) {
  const a = new Date(dataISO + "T12:00:00");
  const b = new Date(baseISO + "T12:00:00");
  return Math.round((a - b) / 86400000);
}
function fmtData(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function LicencaPainel({ modoBloqueio = false, onLiberado, onSair }) {
  const [cfg, setCfg] = useState(null);
  const [pagamentos, setPagamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [mostrarPagamento, setMostrarPagamento] = useState(false);
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [salvandoPag, setSalvandoPag] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const [formCfg, setFormCfg] = useState(null);
  const [formPag, setFormPag] = useState({ data: hojeISO(), valor: "", observacao: "" });
  const [erroTabela, setErroTabela] = useState(false);

  // ─── PIN do dono para proteger a configuração da chave Pix/mensalidade ───
  const [cfgAdmin, setCfgAdmin] = useState(null);
  const [pinLiberado, setPinLiberado] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmaPin, setConfirmaPin] = useState("");
  const [erroPin, setErroPin] = useState("");
  const [verificandoPin, setVerificandoPin] = useState(false);

  async function carregarCfgAdmin() {
    let { data } = await supabase.from("config_admin").select("*").eq("id", 1).maybeSingle();
    if (!data) {
      const ins = await supabase.from("config_admin").insert({ id: 1 }).select().single();
      data = ins.data;
    }
    setCfgAdmin(data);
  }

  async function enviarPin(e) {
    e.preventDefault();
    setErroPin("");
    const precisaCriar = !cfgAdmin?.pin_hash;
    if (precisaCriar) {
      if (pin.trim().length < 4) return setErroPin("O PIN precisa ter pelo menos 4 dígitos.");
      if (pin !== confirmaPin) return setErroPin("Os PINs digitados não coincidem.");
      setVerificandoPin(true);
      const pin_hash = await hashPin(pin);
      const { data, error } = await supabase.from("config_admin").update({ pin_hash }).eq("id", 1).select().single();
      setVerificandoPin(false);
      if (error) return setErroPin("Erro ao salvar o PIN — verifique se a migração supabase/config_admin.sql foi executada no Supabase.");
      setCfgAdmin(data);
      setPinLiberado(true);
    } else {
      setVerificandoPin(true);
      const hash = await hashPin(pin);
      setVerificandoPin(false);
      if (hash === cfgAdmin.pin_hash) setPinLiberado(true);
      else setErroPin("PIN incorreto.");
    }
  }

  const cfgPadrao = {
    id: 1, chave_pix: "", tipo_chave: "aleatoria",
    nome_beneficiario: "Elta Variedades", cidade: "Fortaleza",
    valor_mensalidade: 0, dias_validade: 30,
  };

  async function carregar() {
    setCarregando(true);
    try {
      const [{ data: c, error: e1 }, { data: pg, error: e2 }] = await Promise.all([
        supabase.from("licenca_config").select("*").eq("id", 1).maybeSingle(),
        supabase.from("pagamentos_licenca").select("*").order("data", { ascending: false }),
      ]);
      if (e1 || e2) setErroTabela(true);
      else setErroTabela(false);
      const cFinal = c || cfgPadrao;
      setCfg(cFinal);
      setFormCfg(cFinal);
      setPagamentos(pg || []);
      setFormPag((p) => ({ ...p, valor: cFinal.valor_mensalidade ? String(cFinal.valor_mensalidade).replace(".", ",") : p.valor }));
    } catch (_) {
      setErroTabela(true);
      setCfg(cfgPadrao);
      setFormCfg(cfgPadrao);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); carregarCfgAdmin(); }, []);

  // Avisa o layout que a licença está em dia (precisa ficar ANTES de qualquer
  // return condicional, senão viola as Rules of Hooks quando o estado muda)
  useEffect(() => {
    if (!cfg) return;
    const ultimoPagamento = pagamentos[0] || null;
    const venceEmAgora = ultimoPagamento ? somarDias(ultimoPagamento.data, cfg.dias_validade) : null;
    const diasRestantesAgora = venceEmAgora ? diffDias(venceEmAgora, hojeISO()) : null;
    const vencidoAgora = diasRestantesAgora === null || diasRestantesAgora < 0;
    if (!vencidoAgora && onLiberado) onLiberado();
  }, [cfg, pagamentos]);

  if (carregando || !cfg) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--tx-4)" }}>Carregando licença…</div>
    );
  }

  if (erroTabela) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--tx-3)", maxWidth: 420, margin: "0 auto" }}>
        ⚠️ Não consegui acessar as tabelas de licença no Supabase. Rode o arquivo <code>supabase/licenca.sql</code> no SQL Editor do Supabase e recarregue a página.
      </div>
    );
  }

  const hoje = hojeISO();
  const ultimoPagamento = pagamentos[0] || null;
  const venceEm = ultimoPagamento ? somarDias(ultimoPagamento.data, cfg.dias_validade) : null;
  const diasRestantes = venceEm ? diffDias(venceEm, hoje) : null;
  const vencido = diasRestantes === null || diasRestantes < 0;

  const chaveFormatada = cfg.chave_pix ? formatarChavePix(cfg.chave_pix, cfg.tipo_chave || "aleatoria") : "";
  const pixPayload = chaveFormatada
    ? gerarPixPayload({
        chave: chaveFormatada,
        nome: cfg.nome_beneficiario || "Elta Variedades",
        cidade: cfg.cidade || "Fortaleza",
        valor: cfg.valor_mensalidade,
        txid: "LICENCA",
      })
    : null;

  function copiarCodigo() {
    if (!pixPayload) return;
    try {
      navigator.clipboard.writeText(pixPayload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (_) {}
  }

  async function salvarCfg() {
    setSalvandoCfg(true);
    await supabase.from("licenca_config").update({
      chave_pix: formCfg.chave_pix,
      tipo_chave: formCfg.tipo_chave,
      nome_beneficiario: formCfg.nome_beneficiario,
      cidade: formCfg.cidade,
      valor_mensalidade: parseFloat(String(formCfg.valor_mensalidade).replace(",", ".")) || 0,
      dias_validade: parseInt(formCfg.dias_validade) || 30,
    }).eq("id", 1);
    setSalvandoCfg(false);
    setMostrarConfig(false);
    carregar();
  }

  async function registrarPagamento() {
    const valorNum = parseFloat(String(formPag.valor).replace(",", ".")) || 0;
    if (valorNum <= 0) return;
    setSalvandoPag(true);
    await supabase.from("pagamentos_licenca").insert({
      data: formPag.data,
      valor: valorNum,
      observacao: formPag.observacao || null,
    });
    setSalvandoPag(false);
    setMostrarPagamento(false);
    carregar();
  }

  const f = (setForm) => (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // ─── Conteúdo (status + QR) ─────────────────────────────────────────────
  const statusCard = (
    <div className="card" style={{ padding: 24, textAlign: "center" }}>
      {vencido ? (
        <ShieldAlert size={40} style={{ color: "#f87171", margin: "0 auto 10px" }} />
      ) : (
        <ShieldCheck size={40} style={{ color: "#34d399", margin: "0 auto 10px" }} />
      )}
      <p style={{ fontWeight: 800, fontSize: 18, color: "var(--tx)", margin: 0 }}>
        {vencido ? "Licença vencida" : "Licença ativa"}
      </p>
      <p style={{ color: "var(--tx-3)", fontSize: 13, marginTop: 4 }}>
        {ultimoPagamento
          ? vencido
            ? `Venceu em ${fmtData(venceEm)} (há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) === 1 ? "" : "s"})`
            : `Vence em ${fmtData(venceEm)} (faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"})`
          : "Nenhum pagamento registrado ainda."}
      </p>

      {vencido && (
        <p style={{ color: "#fbbf24", fontSize: 13.5, marginTop: 10, fontWeight: 600 }}>
          Para continuar usando o sistema, faça o pagamento via Pix abaixo. O sistema libera automaticamente assim que o pagamento for confirmado nesta tela.
        </p>
      )}
    </div>
  );

  const qrCard = pixPayload ? (
    <div className="card" style={{ padding: 24, textAlign: "center" }}>
      <p style={{ fontSize: 11, color: "var(--tx-3)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 12px 0" }}>
        Pague a mensalidade via Pix
      </p>
      {cfg.valor_mensalidade > 0 && (
        <p style={{ fontSize: 26, fontWeight: 900, color: "var(--tx)", margin: "0 0 12px 0" }}>{fmtBRL(cfg.valor_mensalidade)}</p>
      )}
      <img src={qrUrl(pixPayload)} alt="QR Pix" width={200} height={200}
        style={{ borderRadius: 10, border: "1px solid var(--line-2)", margin: "0 auto", display: "block" }} />
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 14, background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 10px" }}>
        <p style={{ fontSize: 9.5, color: "var(--tx-3)", margin: 0, wordBreak: "break-all", flex: 1, fontFamily: "monospace", textAlign: "left" }}>
          {pixPayload}
        </p>
        <button type="button" onClick={copiarCodigo}
          style={{ background: copiado ? "#34d399" : "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}>
          {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  ) : (
    <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--tx-3)" }}>
      ⚠️ Chave Pix da licença ainda não configurada. Abra "Configurar" abaixo para cadastrar.
    </div>
  );

  const adminSection = (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button onClick={() => setMostrarConfig((v) => !v)} className="w-full"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", color: "var(--tx)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
          <Settings size={16} /> Configurar chave Pix e mensalidade
        </span>
        <span style={{ fontSize: 12, color: "var(--tx-3)" }}>{mostrarConfig ? "▲" : "▼"}</span>
      </button>
      {mostrarConfig && formCfg && !pinLiberado && (
        <div style={{ padding: "0 18px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#a78bfa" }}>
            <Lock size={16} />
            <p style={{ fontWeight: 700, fontSize: 13.5, margin: 0 }}>
              {cfgAdmin && !cfgAdmin.pin_hash ? "Criar PIN do dono" : "Área restrita ao dono da loja"}
            </p>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--tx-3)", margin: 0, lineHeight: 1.5 }}>
            {cfgAdmin && !cfgAdmin.pin_hash
              ? "Esse PIN protege a chave Pix e a mensalidade da licença — cadastre um PIN que só você conhece, pra funcionárias não conseguirem mudar pra onde vai esse pagamento."
              : "Digite o PIN do dono para alterar a chave Pix ou o valor da mensalidade."}
          </p>
          <form onSubmit={enviarPin} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 260 }}>
            <div>
              <label className="label">{cfgAdmin && !cfgAdmin.pin_hash ? "Criar PIN (mín. 4 dígitos)" : "PIN"}</label>
              <input className="input" type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" />
            </div>
            {cfgAdmin && !cfgAdmin.pin_hash && (
              <div>
                <label className="label">Confirmar PIN</label>
                <input className="input" type="password" inputMode="numeric" value={confirmaPin} onChange={(e) => setConfirmaPin(e.target.value)} placeholder="••••" />
              </div>
            )}
            {erroPin && <p style={{ fontSize: 12.5, color: "#f87171", margin: 0 }}>{erroPin}</p>}
            <button className="btn-primary" style={{ height: 40 }} disabled={verificandoPin || !pin}>
              {verificandoPin ? "Verificando…" : cfgAdmin && !cfgAdmin.pin_hash ? "Criar PIN" : "Entrar"}
            </button>
          </form>
        </div>
      )}
      {mostrarConfig && formCfg && pinLiberado && (
        <div style={{ padding: "0 18px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className="label">Tipo de chave Pix</label>
            <select className="input" value={formCfg.tipo_chave || "aleatoria"} onChange={f(setFormCfg)("tipo_chave")}>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="telefone">Telefone</option>
              <option value="email">E-mail</option>
              <option value="aleatoria">Chave aleatória (EVP)</option>
            </select>
          </div>
          <div>
            <label className="label">Chave Pix (sua, para receber a mensalidade)</label>
            <input className="input" type="text" value={formCfg.chave_pix || ""} onChange={f(setFormCfg)("chave_pix")} placeholder="Sem pontos, traços ou espaços" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Nome do beneficiário</label>
              <input className="input" type="text" value={formCfg.nome_beneficiario || ""} onChange={f(setFormCfg)("nome_beneficiario")} />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input className="input" type="text" value={formCfg.cidade || ""} onChange={f(setFormCfg)("cidade")} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Valor da mensalidade (R$)</label>
              <input className="input" type="text" inputMode="decimal" value={formCfg.valor_mensalidade ?? ""} onChange={f(setFormCfg)("valor_mensalidade")} placeholder="0,00" />
            </div>
            <div>
              <label className="label">Validade (dias)</label>
              <input className="input" type="number" value={formCfg.dias_validade ?? 30} onChange={f(setFormCfg)("dias_validade")} />
            </div>
          </div>
          <button className="btn-primary" style={{ height: 42 }} disabled={salvandoCfg} onClick={salvarCfg}>
            {salvandoCfg ? "Salvando…" : "Salvar configuração"}
          </button>
        </div>
      )}
    </div>
  );

  const pagamentoSection = (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button onClick={() => setMostrarPagamento((v) => !v)} className="w-full"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", color: "var(--tx)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14 }}>
          ✅ Já recebi o Pix — registrar pagamento e liberar
        </span>
        <span style={{ fontSize: 12, color: "var(--tx-3)" }}>{mostrarPagamento ? "▲" : "▼"}</span>
      </button>
      {mostrarPagamento && (
        <div style={{ padding: "0 18px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label className="label">Data do pagamento</label>
              <input className="input" type="date" value={formPag.data} onChange={f(setFormPag)("data")} />
            </div>
            <div>
              <label className="label">Valor recebido (R$)</label>
              <input className="input" type="text" inputMode="decimal" value={formPag.valor} onChange={f(setFormPag)("valor")} placeholder="0,00" />
            </div>
          </div>
          <div>
            <label className="label">Observação (opcional)</label>
            <input className="input" type="text" value={formPag.observacao} onChange={f(setFormPag)("observacao")} placeholder="Ex: pago por Maria via Pix" />
          </div>
          <button className="btn-primary" style={{ height: 42 }} disabled={salvandoPag} onClick={registrarPagamento}>
            {salvandoPag ? "Salvando…" : "Confirmar pagamento e liberar sistema"}
          </button>
        </div>
      )}
    </div>
  );

  const historico = pagamentos.length > 0 && (
    <div className="card" style={{ padding: 18 }}>
      <p style={{ fontWeight: 700, fontSize: 13, color: "var(--tx)", margin: "0 0 10px 0" }}>Histórico de pagamentos</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {pagamentos.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--tx-2)", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>
            <span>{fmtData(p.data)}{p.observacao ? ` — ${p.observacao}` : ""}</span>
            <span style={{ fontWeight: 700, color: "#34d399" }}>{fmtBRL(p.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const conteudo = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 480, margin: "0 auto" }}>
      {statusCard}
      {qrCard}
      {adminSection}
      {pagamentoSection}
      {historico}
    </div>
  );

  if (!modoBloqueio) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--tx)", marginBottom: 4 }}>Licença do sistema</h1>
        <p style={{ color: "var(--tx-3)", marginBottom: 20 }}>Pagamento mensal via Pix para manter o sistema liberado</p>
        {conteudo}
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999, overflowY: "auto",
      background: "var(--bg)", padding: "32px 16px",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto 16px auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className="serif" style={{ fontStyle: "italic", fontWeight: 800, fontSize: 18, color: "var(--tx)", margin: 0 }}>
          {cfg.nome_beneficiario || "Elta Variedades"}
        </p>
        {onSair && (
          <button onClick={onSair} style={{ background: "none", border: "none", color: "var(--tx-3)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
            <LogOut size={15} /> Sair
          </button>
        )}
      </div>
      {conteudo}
    </div>
  );
}
