"use client";

import { useEffect, useState } from "react";
import { fmtBRL } from "@/lib/supabase";
import { gerarPixPayload, formatarChavePix, qrUrl } from "@/lib/pix";
import { QrCode, Copy, Check, X, Loader2, ShieldCheck, Settings, RefreshCw } from "lucide-react";

const RENOVA_A_CADA = 5 * 60; // 5 minutos, em segundos

// ─── Pix estático (chave fixa da loja) ────────────────────────────────────────
// Gera um QR Code Pix manual (sem AbacatePay): o pagamento cai direto na conta
// vinculada à chave Pix configurada. Como não existe API pra consultar esse
// pagamento, a confirmação é manual — quem recebeu o Pix confirma na tela.
// A chave nunca muda, então renovar o QR a cada 5 min é só reforço visual
// para o caso do cliente demorar pra pagar.
export default function PagamentoPixEstaticoModal({ valor, txid, cfg, onConfirmar, onClose, onConfigurar }) {
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState("");
  const [restante, setRestante] = useState(RENOVA_A_CADA);
  const [versaoQr, setVersaoQr] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setRestante((s) => {
        if (s <= 1) {
          setVersaoQr((v) => v + 1);
          return RENOVA_A_CADA;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function renovarAgora() {
    setVersaoQr((v) => v + 1);
    setRestante(RENOVA_A_CADA);
  }

  const mm = String(Math.floor(restante / 60)).padStart(2, "0");
  const ss = String(restante % 60).padStart(2, "0");

  const semChave = !cfg?.chave_pix;
  const chaveFormatada = !semChave ? formatarChavePix(cfg.chave_pix, cfg.tipo_chave || "aleatoria") : "";
  const payload = !semChave
    ? gerarPixPayload({
        chave: chaveFormatada,
        nome: cfg.nome_loja || "Loja",
        cidade: cfg.cidade_loja || "Fortaleza",
        valor,
        txid,
      })
    : null;
  const qrSrc = payload ? `${qrUrl(payload)}&_r=${versaoQr}` : null;

  function copiar() {
    if (!payload) return;
    try {
      navigator.clipboard.writeText(payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (_) {}
  }

  async function confirmar() {
    if (confirmando) return;
    setConfirmando(true);
    setErro("");
    try {
      await onConfirmar?.();
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
          padding: 20, width: "100%", maxWidth: 560, boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
          maxHeight: "94vh", overflowY: "auto", textAlign: "center", boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: "var(--tx)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <QrCode size={17} color="var(--gold)" /> Pix manual
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

        {semChave ? (
          <div style={{ padding: "20px 0" }}>
            <p style={{ color: "#d8b36a", fontSize: 13.5, marginBottom: 14 }}>
              Nenhuma chave Pix configurada para a loja ainda.
            </p>
            <button className="btn-primary" onClick={onConfigurar} style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Settings size={15} /> Configurar chave Pix
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: "#fff", borderRadius: 18, padding: 16, maxWidth: "100%", width: 408, margin: "0 auto 10px", boxSizing: "border-box" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR Code Pix"
                width={360}
                height={360}
                style={{ display: "block", width: "100%", maxWidth: 360, height: "auto", margin: "0 auto" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "var(--tx-4)" }}>
                QR renova em {mm}:{ss}
              </span>
              <button
                onClick={renovarAgora}
                title="Renovar QR agora"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 2, display: "flex" }}
              >
                <RefreshCw size={13} />
              </button>
            </div>

            <button onClick={copiar} className="btn-ghost" style={{ width: "100%", marginBottom: 8 }}>
              {copiado ? <Check size={15} /> : <Copy size={15} />}
              {copiado ? "Código copiado!" : "Copiar código Pix"}
            </button>

            <p style={{ fontSize: 11, color: "var(--tx-4)", margin: "10px 0 16px", lineHeight: 1.5 }}>
              Esse QR é fixo — não dá pra saber automaticamente se o cliente pagou.
              Confirme abaixo só depois de ver o Pix entrar na conta.
            </p>

            {erro && <p style={{ color: "#e58d7b", fontSize: 12.5, marginBottom: 10 }}>{erro}</p>}

            <button onClick={confirmar} disabled={confirmando} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              {confirmando ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
              {confirmando ? "Gerando venda…" : "Já recebi — confirmar venda"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
