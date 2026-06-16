"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase, fmtBRL, fmtData } from "@/lib/supabase";
import { Printer, BookOpen, Search, X, ChevronDown } from "lucide-react";
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
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function gerarPixPayload({ chave, nome, cidade, valor, txid }) {
  const merchantAccount = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", chave);
  const additionalData = tlv("05", txid || "***");
  const payload =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (valor ? tlv("54", Number(valor).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", nome.substring(0, 25)) +
    tlv("60", cidade.substring(0, 15)) +
    tlv("62", additionalData) +
    "6304";
  return payload + crc16(payload);
}

// QR via API pública (sem instalação extra)
function qrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=160x160&margin=4`;
}

// ─── Barcode Component ─────────────────────────────────────────────────────────
function BarcodeImg({ value }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 9,
          margin: 4,
        });
      } catch (_) {}
    }
  }, [value]);
  return <svg ref={ref} className="w-full" />;
}

// ─── Slip (canhoto de carnê) ───────────────────────────────────────────────────
function Slip({ parcela, nota, config, index, total }) {
  const { chave_pix, nome_loja, cidade_loja } = config;
  const txid = `N${nota.numero}P${parcela.numero}`;
  const pixPayload = chave_pix
    ? gerarPixPayload({
        chave: chave_pix,
        nome: nome_loja || "Super Bonita",
        cidade: cidade_loja || "Fortaleza",
        valor: parcela.valor,
        txid,
      })
    : null;

  // Linha digitável fictícia baseada nos dados da parcela
  const barcodeVal = `000${String(nota.numero).padStart(6, "0")}${String(parcela.numero).padStart(2, "0")}${parcela.vencimento.replace(/-/g, "")}`;

  return (
    <div
      className="slip-card"
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "14px 16px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        marginBottom: 16,
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px dashed #e2e8f0", paddingBottom: 10, marginBottom: 10 }}>
        <div>
          <p style={{ fontWeight: 900, fontSize: 15, color: "#1e1b4b", fontStyle: "italic" }}>
            {nome_loja || "Super Bonita"}
          </p>
          <p style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>CARNÊ DE PAGAMENTO</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{
            background: "#7c3aed",
            color: "#fff",
            borderRadius: 20,
            padding: "2px 10px",
            fontSize: 11,
            fontWeight: 700,
          }}>
            {parcela.numero}/{total} parcela{total > 1 ? "s" : ""}
          </span>
          <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>Nota #{nota.numero}</p>
        </div>
      </div>

      {/* Dados do cliente e vencimento */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: "span 2" }}>
          <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Cliente</p>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{nota.cliente_nome}</p>
        </div>
        <div>
          <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Vencimento</p>
          <p style={{ fontWeight: 700, fontSize: 13, color: parcela.pago ? "#059669" : "#b45309" }}>
            {new Date(parcela.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Valor e status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f5f3ff", borderRadius: 8, padding: "8px 14px", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 9, color: "#7c3aed", fontWeight: 600, textTransform: "uppercase" }}>Valor da parcela</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: "#4c1d95" }}>{fmtBRL(parcela.valor)}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {parcela.pago ? (
            <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>✓ PAGO</span>
          ) : (
            <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700 }}>EM ABERTO</span>
          )}
        </div>
      </div>

      {/* Código de barras e QR Code */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>CÓDIGO DE BARRAS</p>
          <BarcodeImg value={barcodeVal} />
        </div>
        {pixPayload && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <p style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}>PIX</p>
            <img
              src={qrUrl(pixPayload)}
              alt="QR Code PIX"
              width={80}
              height={80}
              style={{ borderRadius: 6, border: "1px solid #e5e7eb" }}
            />
            <p style={{ fontSize: 8, color: "#7c3aed", marginTop: 2 }}>Pague via PIX</p>
          </div>
        )}
      </div>

      {/* Linha de recorte */}
      <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: 10, paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
        <p style={{ fontSize: 9, color: "#9ca3af" }}>✂ Recorte aqui</p>
        <p style={{ fontSize: 9, color: "#9ca3af" }}>Guarde o comprovante de pagamento</p>
      </div>
    </div>
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function CarnePage() {
  const [clientes, setClientes] = useState([]);
  const [notas, setNotas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [clienteSel, setClienteSel] = useState("");
  const [notaSel, setNotaSel] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [config, setConfig] = useState({
    chave_pix: "",
    nome_loja: "Super Bonita",
    cidade_loja: "Fortaleza",
  });
  const [mostrarConfig, setMostrarConfig] = useState(false);

  // Carrega dados
  useEffect(() => {
    async function init() {
      setCarregando(true);
      const { data: nts } = await supabase
        .from("notas")
        .select("id, numero, cliente_nome, total, forma_pagamento, criado_em")
        .order("numero", { ascending: false });
      const { data: parc } = await supabase
        .from("parcelas")
        .select("*")
        .order("numero");
      setNotas(nts || []);
      setParcelas(parc || []);

      // Extrai clientes únicos
      const nomes = [...new Set((nts || []).map((n) => n.cliente_nome))].sort();
      setClientes(nomes);

      // Config salva
      const cfg = localStorage.getItem("carne_config");
      if (cfg) setConfig(JSON.parse(cfg));

      setCarregando(false);
    }
    init();
  }, []);

  function salvarConfig(novo) {
    setConfig(novo);
    localStorage.setItem("carne_config", JSON.stringify(novo));
    setMostrarConfig(false);
  }

  // Filtra notas pelo cliente selecionado e busca
  const notasFiltradas = notas.filter((n) => {
    const matchCliente = clienteSel ? n.cliente_nome === clienteSel : true;
    const matchBusca = busca
      ? n.cliente_nome.toLowerCase().includes(busca.toLowerCase()) ||
        String(n.numero).includes(busca)
      : true;
    const temParcelas = parcelas.some((p) => p.nota_id === n.id);
    return matchCliente && matchBusca && temParcelas;
  });

  const notaParaImprimir = notaSel
    ? notas.find((n) => n.id === notaSel)
    : null;

  const parcelasNota = notaParaImprimir
    ? parcelas.filter((p) => p.nota_id === notaParaImprimir.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho – só aparece na tela */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-violet-600" /> Carnê de Pagamento
          </h1>
          <p className="text-slate-500">Imprima o carnê com código de barras e QR Code PIX</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMostrarConfig(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            ⚙️ Configurar PIX
          </button>
          {notaParaImprimir && (
            <button
              onClick={() => window.print()}
              className="btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Imprimir Carnê
            </button>
          )}
        </div>
      </div>

      {/* Modal de configuração PIX */}
      {mostrarConfig && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-slate-900">Configurações de Impressão</h2>
              <button onClick={() => setMostrarConfig(false)}><X className="w-5 h-5" /></button>
            </div>
            <ConfigForm initial={config} onSave={salvarConfig} onCancel={() => setMostrarConfig(false)} />
          </div>
        </div>
      )}

      {/* Filtros – só na tela */}
      <div className="no-print card p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-600">Selecione o cliente e a nota para imprimir o carnê</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente ou nº nota…"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setClienteSel(""); setNotaSel(""); }}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Cliente */}
          <div className="relative">
            <select
              value={clienteSel}
              onChange={(e) => { setClienteSel(e.target.value); setNotaSel(""); setBusca(""); }}
              className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
            >
              <option value="">— Todos os clientes —</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Nota */}
          <div className="relative">
            <select
              value={notaSel}
              onChange={(e) => setNotaSel(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
              disabled={notasFiltradas.length === 0}
            >
              <option value="">— Selecione a nota —</option>
              {notasFiltradas.map((n) => (
                <option key={n.id} value={n.id}>
                  Nota #{n.numero} · {n.cliente_nome} · {fmtBRL(n.total)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {!config.chave_pix && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            ⚠️ Chave PIX não configurada. O QR Code PIX não será gerado.{" "}
            <button onClick={() => setMostrarConfig(true)} className="underline font-semibold">Configurar agora</button>
          </div>
        )}
      </div>

      {/* Área de impressão */}
      {carregando ? (
        <div className="text-center py-16 text-slate-400 animate-pulse">Carregando…</div>
      ) : notaParaImprimir ? (
        <div>
          {/* Cabeçalho do carnê – visível na impressão */}
          <div className="no-print mb-4 p-4 bg-violet-50 rounded-xl border border-violet-200">
            <p className="text-sm font-semibold text-violet-700">
              Carnê de <strong>{notaParaImprimir.cliente_nome}</strong> — Nota #{notaParaImprimir.numero} — {parcelasNota.length} parcela(s)
            </p>
            <p className="text-xs text-violet-500 mt-1">
              Clique em <strong>Imprimir Carnê</strong> para abrir a janela de impressão
            </p>
          </div>

          {/* Slips */}
          <div className="print-area space-y-0">
            <PrintHeader nota={notaParaImprimir} total={parcelasNota.length} />
            {parcelasNota.map((p, i) => (
              <Slip
                key={p.id}
                parcela={p}
                nota={notaParaImprimir}
                config={config}
                index={i}
                total={parcelasNota.length}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="no-print text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Selecione um cliente e uma nota para visualizar o carnê</p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .print-area { display: block; }
          .slip-card { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

// Cabeçalho de impressão
function PrintHeader({ nota, total }) {
  return (
    <div style={{
      textAlign: "center",
      marginBottom: 20,
      paddingBottom: 16,
      borderBottom: "2px solid #7c3aed",
    }}>
      <p style={{ fontWeight: 900, fontSize: 20, color: "#1e1b4b", fontStyle: "italic" }}>Super Bonita</p>
      <p style={{ fontSize: 13, color: "#6b7280" }}>Carnê de Pagamento · Nota #{nota.numero}</p>
      <p style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
        Cliente: <strong>{nota.cliente_nome}</strong> · {total} parcela(s) · Total: {fmtBRL(nota.total)}
      </p>
    </div>
  );
}

// Formulário de configuração
function ConfigForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave PIX</label>
        <input
          type="text"
          placeholder="CPF, e-mail, telefone ou chave aleatória"
          value={form.chave_pix}
          onChange={(e) => set("chave_pix", e.target.value)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome no PIX</label>
        <input
          type="text"
          placeholder="Nome da loja (até 25 caracteres)"
          value={form.nome_loja}
          onChange={(e) => set("nome_loja", e.target.value)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cidade</label>
        <input
          type="text"
          placeholder="Cidade da loja"
          value={form.cidade_loja}
          onChange={(e) => set("cidade_loja", e.target.value)}
          className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onSave(form)}
          className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition"
        >
          Salvar
        </button>
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}
