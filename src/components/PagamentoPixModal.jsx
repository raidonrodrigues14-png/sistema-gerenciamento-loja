"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import {
  QrCode, Copy, Check, X, Loader2, CheckCircle2, RefreshCw, FlaskConical,
} from "lucide-react";

// ─── Tela de pagamento Pix (AbacatePay) ───────────────────────────────────────
// Gera um QRCode Pix, mostra para o cliente escanear, e fica checando o status
// automaticamente. Quando o pagamento é confirmado, chama onConfirmado(pix) —
// quem usa este componente é responsável por criar a nota/registro nesse momento,
// o que já faz o valor aparecer automaticamente no Fechamento de Caixa.
export default function PagamentoPixModal({ valor, descricao, cliente, onConfirmado, onClose }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pix, setPix] = useState(null); // { id, brCode, brCodeBase64, devMode, status, expiresAt }
  const [status, setStatus] = useState("PENDING");
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erroConfirmar, setErroConfirmar] = useState("");
  const [simulando, setSimulando] = useState(false);

  const pollRef = useRef(null);
  const pagamentoLogIdRef = useRef(null); // id da linha em pagamentos_pix

  async function criarCobranca() {
    setCarregando(true);
    setErro("");
    setStatus("PENDING");
    try {
      let customer;
      if (cliente?.nome && cliente?.telefone && cliente?.email && cliente?.cpf_cnpj) {
        customer = {
          name: cliente.nome,
          cellphone: cliente.telefone,
          email: cliente.email,
          taxId: cliente.cpf_cnpj,
        };
      }

      const res = await fetch("/api/pix/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountReais: valor, description: descricao, customer }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao gerar o Pix.");

      setPix(json.data);
      setStatus(json.data.status || "PENDING");

      // Log local (best-effort): se a tabela ainda não existir ou falhar,
      // o pagamento continua funcionando normalmente.
      try {
        const { data: log } = await supabase
          .from("pagamentos_pix")
          .insert({
            pix_id: json.data.id,
            valor,
            descricao,
            status: json.data.status || "PENDING",
            dev_mode: !!json.data.devMode,
            cliente_nome: cliente?.nome || null,
          })
          .select()
          .single();
        pagamentoLogIdRef.current = log?.id || null;
      } catch (_) {}
    } catch (e) {
      setErro(e.message || "Erro ao gerar o Pix.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    criarCobranca();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling do status enquanto estiver pendente
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!pix?.id || status !== "PENDING") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pix/status?id=${encodeURIComponent(pix.id)}`);
        const json = await res.json();
        if (!res.ok) return;
        if (json.data?.status && json.data.status !== status) {
          setStatus(json.data.status);
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix?.id, status]);

  // Quando o pagamento é confirmado, finaliza automaticamente (quita)
  useEffect(() => {
    if (status !== "PAID" || confirmando) return;
    clearInterval(pollRef.current);
    let ativo = true;
    (async () => {
      setConfirmando(true);
      setErroConfirmar("");
      if (pagamentoLogIdRef.current) {
        await supabase
          .from("pagamentos_pix")
          .update({ status: "PAID", pago_em: new Date().toISOString() })
          .eq("id", pagamentoLogIdRef.current);
      }
      try {
        await onConfirmado?.(pix);
      } catch (e) {
        if (ativo) setErroConfirmar(e.message || "Pagamento confirmado, mas houve um erro ao gerar a nota.");
      } finally {
        if (ativo) setConfirmando(false);
      }
    })();
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function copiar() {
    if (!pix?.brCode) return;
    try {
      navigator.clipboard.writeText(pix.brCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (_) {}
  }

  async function simular() {
    if (!pix?.id || simulando) return;
    setSimulando(true);
    try {
      await fetch(`/api/pix/simular?id=${encodeURIComponent(pix.id)}`, { method: "POST" });
    } catch (_) {}
    setSimulando(false);
  }

  const expirado = status === "EXPIRED" || status === "CANCELLED";

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
          padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
          maxHeight: "92vh", overflowY: "auto", textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: "var(--tx)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <QrCode size={17} color="var(--gold)" /> Pagar com Pix
          </p>
          {!confirmando && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 4 }}>
              <X size={18} />
            </button>
          )}
        </div>

        <p style={{ fontSize: 30, fontWeight: 800, color: "var(--gold)", margin: "6px 0 18px" }}>
          {fmtBRL(valor)}
        </p>

        {carregando && (
          <div style={{ padding: "40px 0", color: "var(--tx-3)" }}>
            <Loader2 className="animate-spin" size={28} style={{ margin: "0 auto 12px" }} />
            <p>Gerando código Pix…</p>
          </div>
        )}

        {erro && !carregando && (
          <div style={{ padding: "16px 0" }}>
            <p style={{ color: "#e58d7b", marginBottom: 14, fontSize: 13.5 }}>{erro}</p>
            <button className="btn-primary" onClick={criarCobranca} style={{ margin: "0 auto" }}>
              Tentar novamente
            </button>
          </div>
        )}

        {pix && !carregando && !erro && status === "PENDING" && (
          <>
            <div style={{ background: "#fff", borderRadius: 14, padding: 14, display: "inline-block", marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pix.brCodeBase64} alt="QR Code Pix" width={220} height={220} style={{ display: "block" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--tx-3)", fontSize: 13, marginBottom: 16 }}>
              <Loader2 className="animate-spin" size={14} /> Aguardando pagamento…
            </div>

            <button onClick={copiar} className="btn-ghost" style={{ width: "100%", marginBottom: 8 }}>
              {copiado ? <Check size={15} /> : <Copy size={15} />}
              {copiado ? "Código copiado!" : "Copiar código Pix"}
            </button>

            {pix.devMode && (
              <button
                onClick={simular}
                disabled={simulando}
                className="btn-ghost"
                style={{ width: "100%", color: "#d8b36a", borderColor: "rgba(216,179,106,0.35)" }}
              >
                <FlaskConical size={15} />
                {simulando ? "Simulando…" : "Simular pagamento (ambiente de testes)"}
              </button>
            )}

            <p style={{ fontSize: 11, color: "var(--tx-4)", marginTop: 14, lineHeight: 1.5 }}>
              O pagamento cai direto na conta da loja e é confirmado aqui automaticamente
              — não é preciso recarregar a página.
            </p>
          </>
        )}

        {expirado && (
          <div style={{ padding: "16px 0" }}>
            <p style={{ color: "#d8b36a", marginBottom: 14, fontSize: 13.5 }}>
              Este código Pix {status === "EXPIRED" ? "expirou" : "foi cancelado"}.
            </p>
            <button className="btn-primary" onClick={criarCobranca} style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 auto" }}>
              <RefreshCw size={15} /> Gerar novo código
            </button>
          </div>
        )}

        {status === "PAID" && (
          <div style={{ padding: "26px 0" }}>
            <CheckCircle2 size={48} color="#7fd0a8" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 800, color: "#7fd0a8", fontSize: 16 }}>Pagamento confirmado!</p>
            <p style={{ fontSize: 12.5, color: "var(--tx-3)", marginTop: 4 }}>
              {confirmando ? "Finalizando nota e atualizando o caixa…" : "Tudo certo."}
            </p>
            {erroConfirmar && (
              <p style={{ fontSize: 12.5, color: "#e58d7b", marginTop: 10 }}>{erroConfirmar}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
