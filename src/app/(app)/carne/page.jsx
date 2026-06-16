"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Printer, BookOpen, Search, X, ChevronDown, Settings } from "lucide-react";
import JsBarcode from "jsbarcode";

// ─── PIX Payload EMV ──────────────────────────────────────────────────────────
function tlv(id, value) {
  const v = String(value);
  return `${id}${String(v.length).padStart(2, "0")}${v}`;
}
function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}
function gerarPixPayload({ chave, nome, cidade, valor, txid }) {
  const ma = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", chave);
  const ad = tlv("05", txid || "***");
  const body =
    tlv("00", "01") + tlv("26", ma) + tlv("52", "0000") + tlv("53", "986") +
    (valor ? tlv("54", Number(valor).toFixed(2)) : "") +
    tlv("58", "BR") + tlv("59", nome.slice(0, 25)) +
    tlv("60", cidade.slice(0, 15)) + tlv("62", ad) + "6304";
  return body + crc16(body);
}
function qrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=160x160&margin=4`;
}

// ─── Código de Barras ─────────────────────────────────────────────────────────
function Barcode({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128", width: 1.4, height: 38,
        displayValue: true, fontSize: 9, margin: 4,
        background: "#ffffff", lineColor: "#000000",
      });
    } catch (_) {}
  }, [value]);
  return <svg ref={ref} style={{ width: "100%", background: "#fff", borderRadius: 4 }} />;
}

// ─── Slip individual ──────────────────────────────────────────────────────────
function Slip({ p, nota, cfg, total }) {
  const pixPayload = cfg.chave_pix
    ? gerarPixPayload({
        chave: cfg.chave_pix,
        nome: cfg.nome_loja || "Super Bonita",
        cidade: cfg.cidade_loja || "Fortaleza",
        valor: p.valor,
        txid: `N${nota.numero}P${p.numero}`,
      })
    : null;

  const barVal = `${String(nota.numero).padStart(6, "0")}${String(p.numero).padStart(2, "0")}${p.vencimento.replace(/-/g, "")}`;
  const venc = new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR");

  return (
    <div style={{
      border: "1px solid #d1d5db", borderRadius: 10, padding: "14px 16px",
      marginBottom: 14, background: "#fff", pageBreakInside: "avoid", breakInside: "avoid",
    }}>
      {/* Topo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px dashed #e2e8f0", paddingBottom: 10, marginBottom: 10 }}>
        <div>
          <p style={{ fontWeight: 900, fontSize: 15, color: "#1e1b4b", fontStyle: "italic", margin: 0 }}>
            {cfg.nome_loja || "Super Bonita"}
          </p>
          <p style={{ fontSize: 10, color: "#6b7280", margin: 0, marginTop: 1 }}>CARNÊ DE PAGAMENTO</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
            {p.numero}/{total}
          </span>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0, marginTop: 4 }}>Nota #{nota.numero}</p>
        </div>
      </div>

      {/* Cliente / Vencimento */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, margin: 0 }}>Cliente</p>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#111827", margin: 0 }}>{nota.cliente_nome}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, margin: 0 }}>Vencimento</p>
          <p style={{ fontWeight: 700, fontSize: 13, color: p.pago ? "#059669" : "#b45309", margin: 0 }}>{venc}</p>
        </div>
      </div>

      {/* Valor */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f3ff", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 9, color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", margin: 0 }}>Valor da parcela</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#4c1d95", margin: 0 }}>{fmtBRL(p.valor)}</p>
        </div>
        {p.pago
          ? <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>✓ PAGO</span>
          : <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>EM ABERTO</span>
        }
      </div>

      {/* Barcode + QR */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, marginBottom: 4, margin: "0 0 4px 0" }}>CÓDIGO DE BARRAS</p>
          <Barcode value={barVal} />
        </div>
        {pixPayload && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, margin: "0 0 4px 0" }}>PAGUE VIA PIX</p>
            <img src={qrUrl(pixPayload)} alt="QR PIX" width={80} height={80}
              style={{ borderRadius: 6, border: "1px solid #e5e7eb", display: "block" }} />
            <p style={{ fontSize: 8, color: "#7c3aed", margin: "2px 0 0 0" }}>Escaneie o QR Code</p>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: 10, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
        <p style={{ fontSize: 8, color: "#9ca3af", margin: 0 }}>✂ Recorte aqui</p>
        <p style={{ fontSize: 8, color: "#9ca3af", margin: 0 }}>Guarde o comprovante de pagamento</p>
      </div>
    </div>
  );
}

// ─── Formulário de config ──────────────────────────────────────────────────────
function ConfigModal({ cfg, onSave, onClose }) {
  const [form, setForm] = useState({ ...cfg });
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: "var(--tx)", margin: 0 }}>⚙️ Configurações de Impressão</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Chave PIX</label>
            <input className="input" type="text" placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={form.chave_pix} onChange={f("chave_pix")} />
          </div>
          <div>
            <label className="label">Nome da loja no PIX (até 25 caracteres)</label>
            <input className="input" type="text" placeholder="Ex: Super Bonita"
              value={form.nome_loja} onChange={f("nome_loja")} />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" type="text" placeholder="Ex: Fortaleza"
              value={form.cidade_loja} onChange={f("cidade_loja")} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="btn-primary" style={{ flex: 1, height: 42 }} onClick={() => onSave(form)}>
              Salvar
            </button>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function CarnePage() {
  const [notas, setNotas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [busca, setBusca] = useState("");
  const [notaSel, setNotaSel] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [cfg, setCfg] = useState({ chave_pix: "", nome_loja: "Super Bonita", cidade_loja: "Fortaleza" });

  useEffect(() => {
    // Carrega config salva
    try {
      const saved = localStorage.getItem("carne_cfg");
      if (saved) setCfg(JSON.parse(saved));
    } catch (_) {}

    async function load() {
      setCarregando(true);
      const [{ data: nts }, { data: parc }] = await Promise.all([
        supabase.from("notas").select("id,numero,cliente_nome,total,forma_pagamento").order("numero", { ascending: false }),
        supabase.from("parcelas").select("*").order("numero"),
      ]);
      setNotas(nts || []);
      setParcelas(parc || []);
      setCarregando(false);
    }
    load();
  }, []);

  function salvarCfg(novo) {
    setCfg(novo);
    try { localStorage.setItem("carne_cfg", JSON.stringify(novo)); } catch (_) {}
    setShowConfig(false);
  }

  // Filtra notas pela busca (nome ou número)
  const notasFiltradas = notas.filter((n) => {
    if (!busca.trim()) return true;
    return (
      n.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) ||
      String(n.numero).includes(busca.trim())
    );
  });

  const notaSelecionada = notas.find((n) => n.id === notaSel) || null;
  const parcelasNota = notaSelecionada ? parcelas.filter((p) => p.nota_id === notaSelecionada.id) : [];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Cabeçalho */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontWeight: 900, color: "var(--tx)", margin: 0 }}>
            <BookOpen size={22} style={{ color: "#a78bfa" }} /> Carnê de Pagamento
          </h1>
          <p style={{ color: "var(--tx-3)", fontSize: 14, margin: "4px 0 0 0" }}>
            Imprima o carnê com código de barras e QR Code PIX
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowConfig(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Settings size={15} /> Configurar PIX
          </button>
          {notaSelecionada && parcelasNota.length > 0 && (
            <button className="btn-primary" onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Printer size={15} /> Imprimir Carnê
            </button>
          )}
        </div>
      </div>

      {/* Config modal */}
      {showConfig && <ConfigModal cfg={cfg} onSave={salvarCfg} onClose={() => setShowConfig(false)} />}

      {/* Filtros */}
      <div className="card no-print" style={{ padding: 20, marginBottom: 20 }}>
        {!cfg.chave_pix && (
          <div style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#fbbf24", display: "flex", alignItems: "center", gap: 8 }}>
            ⚠️ Chave PIX não configurada — o QR Code não será gerado.
            <button onClick={() => setShowConfig(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fbbf24", textDecoration: "underline", fontWeight: 600, padding: 0, fontSize: 13 }}>
              Configurar agora
            </button>
          </div>
        )}

        <label className="label">Buscar por cliente ou número da nota</label>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--tx-4)", pointerEvents: "none" }} />
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            type="text"
            placeholder="Nome do cliente ou número da nota…"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setNotaSel(""); }}
          />
        </div>

        <label className="label">Selecionar nota</label>
        <div style={{ position: "relative" }}>
          <select
            className="input"
            value={notaSel}
            onChange={(e) => setNotaSel(e.target.value)}
            disabled={carregando}
          >
            <option value="">— Selecione uma nota —</option>
            {notasFiltradas.map((n) => {
              const qtdParc = parcelas.filter((p) => p.nota_id === n.id).length;
              return (
                <option key={n.id} value={n.id}>
                  Nota #{n.numero} · {n.cliente_nome} · {fmtBRL(n.total)}{qtdParc > 0 ? ` · ${qtdParc} parcelas` : ""}
                </option>
              );
            })}
          </select>
        </div>

        {carregando && (
          <p style={{ color: "var(--tx-4)", fontSize: 13, marginTop: 10 }}>Carregando notas…</p>
        )}
        {!carregando && notasFiltradas.length === 0 && (
          <p style={{ color: "var(--tx-4)", fontSize: 13, marginTop: 10 }}>Nenhuma nota encontrada para "{busca}".</p>
        )}
      </div>

      {/* Aviso sem parcelas */}
      {notaSelecionada && parcelasNota.length === 0 && (
        <div className="no-print card" style={{ padding: 20, textAlign: "center", color: "var(--tx-3)" }}>
          <p>A nota #{notaSelecionada.numero} não possui parcelas cadastradas.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Apenas notas com pagamento em <strong>Crediário</strong> geram carnê.
          </p>
        </div>
      )}

      {/* Carnê para impressão */}
      {notaSelecionada && parcelasNota.length > 0 && (
        <>
          <div className="no-print card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ color: "var(--tx-2)", fontSize: 13, margin: 0 }}>
              <strong style={{ color: "var(--tx)" }}>{notaSelecionada.cliente_nome}</strong> ·
              Nota #{notaSelecionada.numero} · {parcelasNota.length} parcela(s) · {fmtBRL(notaSelecionada.total)}
            </p>
            <span style={{ fontSize: 12, color: "var(--tx-3)" }}>
              Clique em <strong>Imprimir Carnê</strong> acima ↑
            </span>
          </div>

          {/* Área de impressão */}
          <div id="print-area">
            {/* Cabeçalho visível só no papel */}
            <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #7c3aed" }}>
              <p style={{ fontWeight: 900, fontSize: 20, color: "#1e1b4b", fontStyle: "italic", margin: 0 }}>
                {cfg.nome_loja || "Super Bonita"}
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0" }}>
                Carnê de Pagamento · Nota #{notaSelecionada.numero}
              </p>
              <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>
                Cliente: <strong>{notaSelecionada.cliente_nome}</strong> ·{" "}
                {parcelasNota.length} parcela(s) · Total: {fmtBRL(notaSelecionada.total)}
              </p>
            </div>

            {parcelasNota.map((p) => (
              <Slip key={p.id} p={p} nota={notaSelecionada} cfg={cfg} total={parcelasNota.length} />
            ))}
          </div>
        </>
      )}

      {/* Estado inicial */}
      {!notaSelecionada && !carregando && (
        <div className="no-print" style={{ textAlign: "center", padding: "48px 0", color: "var(--tx-4)" }}>
          <BookOpen size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontWeight: 500 }}>Busque um cliente ou número de nota acima para visualizar o carnê</p>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
          #print-area { display: block; }
        }
      `}</style>
    </div>
  );
}
