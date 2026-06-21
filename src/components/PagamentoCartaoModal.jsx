"use client";

import { useState } from "react";
import { fmtBRL } from "@/lib/supabase";
import { CreditCard, X, Loader2, ShieldCheck } from "lucide-react";

// ─── Confirmação de pagamento no cartão de crédito ───────────────────────────
// Não existe integração com a maquininha (cada operadora/banco tem uma API
// diferente, e nem todas oferecem isso). O fluxo é: a atendente processa o
// pagamento na maquininha física dela mesma, escolhe quantas parcelas o
// cliente fez (só para anotar no histórico), e só confirma aqui depois que o
// pagamento já caiu — daí a venda é criada e entra no Caixa do dia.
export default function PagamentoCartaoModal({ valor, onConfirmar, onClose }) {
  const [parcelas, setParcelas] = useState(1);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    if (confirmando) return;
    setConfirmando(true);
    setErro("");
    try {
      await onConfirmar?.(Number(parcelas) || 1);
    } catch (e) {
      setErro(e.message || "Erro ao gerar a nota.");
      setConfirmando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.8)", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !confirmando) onClose?.(); }}
    >
      <div
        style={{
          background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 20,
          padding: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
          maxHeight: "92vh", overflowY: "auto", textAlign: "center", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: "var(--tx)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <CreditCard size={17} color="var(--gold)" /> Cartão de crédito
          </p>
          {!confirmando && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 8, margin: -4 }}>
              <X size={18} />
            </button>
          )}
        </div>

        <p style={{ fontSize: 30, fontWeight: 800, color: "var(--gold)", margin: "6px 0 18px" }}>
          {fmtBRL(valor)}
        </p>

        <p style={{ fontSize: 12.5, color: "var(--tx-3)", marginBottom: 16, lineHeight: 1.5 }}>
          Processe esse pagamento na maquininha de cartão. Depois de receber a confirmação dela, escolha
          em quantas vezes o cliente parcelou e confirme abaixo.
        </p>

        <div style={{ textAlign: "left", marginBottom: 16 }}>
          <label className="label">Parcelado em quantas vezes na maquininha?</label>
          <select className="input" value={parcelas} onChange={(e) => setParcelas(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n === 1 ? "À vista (1x)" : `${n}x`}</option>
            ))}
          </select>
        </div>

        {erro && <p style={{ color: "#e58d7b", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}

        <button onClick={confirmar} disabled={confirmando} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          {confirmando ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
          {confirmando ? "Gerando venda…" : "Já recebi — confirmar venda"}
        </button>
      </div>
    </div>
  );
}
