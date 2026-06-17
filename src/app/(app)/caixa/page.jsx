"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, fmtBRL } from "@/lib/supabase";
import {
  Banknote, QrCode, CreditCard, Briefcase, CalendarClock,
  TrendingDown, Printer, Wallet, Receipt, Plus, X, ChevronDown, BookOpen,
} from "lucide-react";

function hojeISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const FORMAS = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito"];

// ─── Modal: registrar recebimento parcial ─────────────────────────────────────
function ModalRecebimento({ dia, onSalvo, onClose }) {
  const [parcelas, setParcelas] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [busca, setBusca] = useState("");
  const [parcelaSel, setParcelaSel] = useState(null);
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("Pix");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("parcelas")
        .select("*, notas(numero, cliente_nome)")
        .eq("pago", false)
        .order("vencimento");
      const { data: pg } = await supabase
        .from("pagamentos_parcela")
        .select("*");
      setParcelas(p || []);
      setPagamentos(pg || []);
    }
    load();
  }, []);

  // Total já pago por parcela
  function totalPago(parcelaId) {
    return pagamentos
      .filter((pg) => pg.parcela_id === parcelaId)
      .reduce((s, pg) => s + Number(pg.valor), 0);
  }

  const parcelasFiltradas = parcelas.filter((p) => {
    if (!busca.trim()) return true;
    const nome = p.notas?.cliente_nome?.toLowerCase() || "";
    const num = String(p.notas?.numero || "");
    return nome.includes(busca.toLowerCase()) || num.includes(busca);
  });

  const saldoParcela = parcelaSel
    ? Number(parcelaSel.valor) - totalPago(parcelaSel.id)
    : 0;

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const restaApos = saldoParcela - valorNum;

  async function salvar() {
    if (!parcelaSel || valorNum <= 0) return;
    setSalvando(true);

    await supabase.from("pagamentos_parcela").insert({
      parcela_id: parcelaSel.id,
      data: dia,
      valor: valorNum,
      forma,
      observacao: obs || null,
    });

    // Se o valor cobre o saldo total, marca a parcela como paga
    if (restaApos <= 0.01) {
      await supabase
        .from("parcelas")
        .update({ pago: true, pago_em: dia })
        .eq("id", parcelaSel.id);
    }

    setSalvando(false);
    onSalvo();
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.8)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontWeight: 800, fontSize: 16, color: "var(--tx)", margin: 0 }}>💰 Registrar Recebimento</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Busca de parcela */}
        <div style={{ marginBottom: 12 }}>
          <label className="label">Buscar cliente ou nota</label>
          <input
            className="input"
            type="text"
            placeholder="Nome do cliente ou número da nota…"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setParcelaSel(null); }}
          />
        </div>

        {/* Lista de parcelas */}
        {!parcelaSel && (
          <div style={{ marginBottom: 16 }}>
            <label className="label">Selecionar parcela em aberto</label>
            <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--line-2)", borderRadius: 10 }}>
              {parcelasFiltradas.length === 0 ? (
                <p style={{ padding: "12px 14px", color: "var(--tx-4)", fontSize: 13 }}>Nenhuma parcela em aberto encontrada.</p>
              ) : parcelasFiltradas.map((p) => {
                const pago = totalPago(p.id);
                const saldo = Number(p.valor) - pago;
                const venc = new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR");
                return (
                  <button
                    key={p.id}
                    onClick={() => { setParcelaSel(p); setValor(saldo.toFixed(2).replace(".", ",")); }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "10px 14px", background: "none", border: "none",
                      borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-2)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                  >
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: "var(--tx)", margin: 0 }}>
                        {p.notas?.cliente_nome} — {p.numero}ª parcela (Nota #{p.notas?.numero})
                      </p>
                      <p style={{ fontSize: 11, color: "var(--tx-3)", margin: "2px 0 0 0" }}>
                        Vence: {venc}{pago > 0 ? ` · Já pago: ${fmtBRL(pago)}` : ""}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontWeight: 800, fontSize: 13, color: "#a78bfa", margin: 0 }}>{fmtBRL(saldo)}</p>
                      <p style={{ fontSize: 10, color: "var(--tx-4)", margin: 0 }}>restante</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Parcela selecionada */}
        {parcelaSel && (
          <>
            <div style={{ background: "var(--bg)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, color: "var(--tx)", margin: 0 }}>
                  {parcelaSel.notas?.cliente_nome} — {parcelaSel.numero}ª parcela
                </p>
                <p style={{ fontSize: 11, color: "var(--tx-3)", margin: "2px 0 0 0" }}>
                  Nota #{parcelaSel.notas?.numero} · Total da parcela: {fmtBRL(parcelaSel.valor)}
                  {totalPago(parcelaSel.id) > 0 && ` · Já pago: ${fmtBRL(totalPago(parcelaSel.id))}`}
                </p>
              </div>
              <button
                onClick={() => { setParcelaSel(null); setValor(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-4)", fontSize: 11, padding: "4px 8px" }}
              >
                Trocar
              </button>
            </div>

            {/* Valor recebido */}
            <div style={{ marginBottom: 12 }}>
              <label className="label">Valor recebido (R$)</label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>

            {/* Preview do saldo */}
            {valorNum > 0 && (
              <div style={{
                borderRadius: 10, padding: "10px 14px", marginBottom: 12,
                background: restaApos <= 0.01 ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.08)",
                border: `1px solid ${restaApos <= 0.01 ? "rgba(16,185,129,0.3)" : "rgba(251,191,36,0.25)"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--tx-3)" }}>Saldo da parcela</span>
                  <span style={{ color: "var(--tx)", fontWeight: 700 }}>{fmtBRL(saldoParcela)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                  <span style={{ color: "var(--tx-3)" }}>Recebendo agora</span>
                  <span style={{ color: "#34d399", fontWeight: 700 }}>- {fmtBRL(valorNum)}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: "var(--tx)" }}>
                    {restaApos <= 0.01 ? "✅ Parcela quitada!" : "Ainda restará"}
                  </span>
                  <span style={{ fontWeight: 800, color: restaApos <= 0.01 ? "#34d399" : "#fbbf24", fontSize: 16 }}>
                    {restaApos <= 0.01 ? fmtBRL(0) : fmtBRL(restaApos)}
                  </span>
                </div>
              </div>
            )}

            {/* Forma de pagamento */}
            <div style={{ marginBottom: 12 }}>
              <label className="label">Forma de pagamento</label>
              <select className="input" value={forma} onChange={(e) => setForma(e.target.value)}>
                {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Observação */}
            <div style={{ marginBottom: 16 }}>
              <label className="label">Observação (opcional)</label>
              <input className="input" type="text" placeholder="Ex: pagou metade, restante na sexta" value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, height: 44, opacity: (!valorNum || valorNum <= 0 || salvando) ? 0.5 : 1 }}
                disabled={!valorNum || valorNum <= 0 || salvando}
                onClick={salvar}
              >
                {salvando ? "Salvando…" : "Confirmar Recebimento"}
              </button>
              <button className="btn-ghost" style={{ height: 44 }} onClick={onClose}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Página Caixa ──────────────────────────────────────────────────────────────
export default function Caixa() {
  const [dia, setDia] = useState(hojeISO());
  const [notas, setNotas] = useState([]);
  const [parcelas, setParcelas] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [pagParc, setPagParc] = useState([]); // pagamentos parciais do dia
  const [todosPagamentos, setTodosPagamentos] = useState([]); // histórico completo, p/ calcular saldo
  const [showModal, setShowModal] = useState(false);

  async function carregar() {
    const ini = new Date(dia + "T00:00:00");
    const fim = new Date(dia + "T23:59:59.999");
    const [n, p, l, pp, tp] = await Promise.all([
      supabase.from("notas").select("*")
        .gte("criado_em", ini.toISOString()).lte("criado_em", fim.toISOString())
        .order("criado_em"),
      supabase.from("parcelas").select("*, notas(numero, cliente_nome)").eq("pago", true).eq("pago_em", dia),
      supabase.from("lancamentos").select("*").eq("data", dia),
      supabase.from("pagamentos_parcela")
        .select("*, parcelas(numero, valor, nota_id, notas(numero, cliente_nome))")
        .eq("data", dia),
      supabase.from("pagamentos_parcela").select("parcela_id, valor"),
    ]);
    setNotas(n.data || []);
    setParcelas(p.data || []);
    setLancamentos(l.data || []);
    setPagParc(pp.data || []);
    setTodosPagamentos(tp.data || []);
  }

  useEffect(() => { carregar(); }, [dia]);

  const somaForma = (forma) =>
    notas.filter((n) => n.forma_pagamento === forma).reduce((s, n) => s + Number(n.total), 0);

  const dinheiro = somaForma("Dinheiro");
  const pix = somaForma("Pix");
  const debito = somaForma("Cartão de débito");
  const credito = somaForma("Cartão de crédito");
  const malinha = somaForma("Malinha");
  const crediarioVendido = somaForma("Crediário");
  const crediarioRecebido = parcelas.reduce((s, p) => s + Number(p.valor), 0);
  const pagParcTotal = pagParc.reduce((s, pp) => s + Number(pp.valor), 0);

  // Total já pago (todo o histórico) de uma parcela específica
  function totalPagoParcela(parcelaId) {
    return todosPagamentos
      .filter((pg) => pg.parcela_id === parcelaId)
      .reduce((s, pg) => s + Number(pg.valor), 0);
  }

  // Detalhe de quem pagou o quê hoje no crediário, e quanto ainda resta por parcela
  const detalheCrediario = [
    ...parcelas.map((p) => ({
      id: "quit-" + p.id,
      cliente: p.notas?.cliente_nome,
      notaNum: p.notas?.numero,
      parcelaNum: p.numero,
      valorPagoHoje: Number(p.valor),
      restante: 0,
      forma: null,
    })),
    ...pagParc.map((pp) => {
      const parc = pp.parcelas;
      const pago = totalPagoParcela(pp.parcela_id);
      const restante = Math.max(0, Number(parc?.valor || 0) - pago);
      return {
        id: "parc-" + pp.id,
        cliente: parc?.notas?.cliente_nome,
        notaNum: parc?.notas?.numero,
        parcelaNum: parc?.numero,
        valorPagoHoje: Number(pp.valor),
        restante,
        forma: pp.forma,
      };
    }),
  ];
  const entradasManuais = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + Number(l.valor), 0);
  const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + Number(l.valor), 0);

  const entrouNoCaixa = dinheiro + pix + debito + credito + malinha + crediarioRecebido + pagParcTotal + entradasManuais;
  const saldoDia = entrouNoCaixa - saidas;

  const linhas = [
    { rotulo: "Dinheiro", valor: dinheiro, icon: Banknote },
    { rotulo: "Pix", valor: pix, icon: QrCode },
    { rotulo: "Cartão de débito", valor: debito, icon: CreditCard },
    { rotulo: "Cartão de crédito", valor: credito, icon: CreditCard },
    { rotulo: "Malinhas fechadas", valor: malinha, icon: Briefcase },
    { rotulo: "Crediário recebido (parcelas)", valor: crediarioRecebido + pagParcTotal, icon: CalendarClock },
    { rotulo: "Outras entradas", valor: entradasManuais, icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Fechamento de caixa</h1>
          <p className="text-slate-500">Quanto entrou e saiu no dia, por forma de pagamento</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input type="date" className="input w-auto" value={dia} onChange={(e) => setDia(e.target.value)} />
          <button
            onClick={() => setShowModal(true)}
            className="btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} /> Registrar Recebimento
          </button>
          <Link href="/carne" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <BookOpen size={15} /> Imprimir Boletas
          </Link>
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {showModal && (
        <ModalRecebimento
          dia={dia}
          onSalvo={() => { setShowModal(false); carregar(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Resumo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <p className="eyebrow mb-4">
              Caixa de {new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
            <div className="space-y-3">
              {linhas.map(({ rotulo, valor, icon: Icon }) => (
                <div key={rotulo}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2.5 text-slate-600">
                      <Icon className="w-4 h-4 text-violet-600" /> {rotulo}
                    </span>
                    <span className={`font-bold ${valor > 0 ? "text-slate-900" : "text-slate-400"}`}>
                      {fmtBRL(valor)}
                    </span>
                  </div>

                  {/* Detalhe: quem pagou o quê no crediário e quanto falta */}
                  {rotulo === "Crediário recebido (parcelas)" && detalheCrediario.length > 0 && (
                    <div style={{ marginTop: 6, marginBottom: 4, paddingLeft: 4, borderLeft: "2px solid var(--line-2)" }}>
                      {detalheCrediario.map((d) => (
                        <div key={d.id} style={{ padding: "5px 0 5px 10px", fontSize: 11.5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                            <span style={{ color: "var(--tx-2)", fontWeight: 600 }}>
                              {d.cliente} <span style={{ color: "var(--tx-4)", fontWeight: 400 }}>· {d.parcelaNum}ª parcela (Nota #{d.notaNum})</span>
                            </span>
                            <span style={{ color: "#34d399", fontWeight: 700, whiteSpace: "nowrap" }}>+ {fmtBRL(d.valorPagoHoje)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                            <span style={{ color: "var(--tx-4)" }}>{d.forma || "—"}</span>
                            <span style={{ fontWeight: 700, color: d.restante <= 0.01 ? "#34d399" : "#fbbf24" }}>
                              {d.restante <= 0.01 ? "✅ Quitada" : `Falta ${fmtBRL(d.restante)}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between text-sm border-t border-slate-200 pt-3">
                <span className="flex items-center gap-2.5 text-red-500">
                  <TrendingDown className="w-4 h-4" /> Saídas do dia
                </span>
                <span className="font-bold text-red-500">- {fmtBRL(saidas)}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--bg)", border: "1px solid var(--line-2)" }}>
              <div className="flex justify-between text-sm text-slate-500 mb-1">
                <span>Total que entrou</span><span>{fmtBRL(entrouNoCaixa)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold">Saldo do dia</span>
                <span className={`text-2xl font-extrabold ${saldoDia >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {fmtBRL(saldoDia)}
                </span>
              </div>
            </div>

            {crediarioVendido > 0 && (
              <p className="mt-4 text-xs text-slate-400">
                * Vendas no crediário hoje: {fmtBRL(crediarioVendido)} — entram no caixa quando as parcelas forem pagas.
              </p>
            )}
          </div>
        </div>

        {/* Movimentos */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="px-5 py-3.5">Hora</th>
                  <th className="px-5 py-3.5">Movimento</th>
                  <th className="px-5 py-3.5">Forma</th>
                  <th className="px-5 py-3.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notas.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(n.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/notas/${n.id}`} className="font-medium hover:underline flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-violet-500" />
                        Nota #{n.numero} — {n.cliente_nome}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{n.forma_pagamento}</td>
                    <td className={`px-5 py-3 text-right font-bold ${n.forma_pagamento === "Crediário" ? "text-slate-400" : "text-emerald-600"}`}>
                      {n.forma_pagamento === "Crediário" ? "(a prazo) " : "+ "}{fmtBRL(n.total)}
                    </td>
                  </tr>
                ))}

                {/* Parcelas totalmente pagas no dia */}
                {parcelas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">—</td>
                    <td className="px-5 py-3">
                      <p className="font-medium">
                        Parcela {p.numero}ª quitada — Nota #{p.notas?.numero} ({p.notas?.cliente_nome})
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#34d399", fontWeight: 600 }}>✅ Quitada — não falta nada</p>
                    </td>
                    <td className="px-5 py-3 text-slate-500">Crediário</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">+ {fmtBRL(p.valor)}</td>
                  </tr>
                ))}

                {/* Pagamentos parciais do dia */}
                {pagParc.map((pp) => {
                  const parc = pp.parcelas;
                  const nota = parc?.notas;
                  const pago = totalPagoParcela(pp.parcela_id);
                  const restante = Math.max(0, Number(parc?.valor || 0) - pago);
                  return (
                    <tr key={pp.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-500">—</td>
                      <td className="px-5 py-3">
                        <p className="font-medium">
                          Pagamento parcial — {nota?.cliente_nome} · {parc?.numero}ª parcela (Nota #{nota?.numero})
                        </p>
                        {pp.observacao && (
                          <p className="text-xs text-slate-400 mt-0.5">{pp.observacao}</p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: restante <= 0.01 ? "#34d399" : "#d97706", fontWeight: 600 }}>
                          {restante <= 0.01 ? "✅ Parcela quitada" : `Ainda faltam ${fmtBRL(restante)}`}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{pp.forma}</td>
                      <td className="px-5 py-3 text-right font-bold text-amber-500">+ {fmtBRL(pp.valor)}</td>
                    </tr>
                  );
                })}

                {lancamentos.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">—</td>
                    <td className="px-5 py-3 font-medium">{l.descricao}</td>
                    <td className="px-5 py-3 text-slate-500">{l.categoria}</td>
                    <td className={`px-5 py-3 text-right font-bold ${l.tipo === "entrada" ? "text-emerald-600" : "text-red-500"}`}>
                      {l.tipo === "entrada" ? "+ " : "- "}{fmtBRL(l.valor)}
                    </td>
                  </tr>
                ))}

                {notas.length === 0 && parcelas.length === 0 && lancamentos.length === 0 && pagParc.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                      Nenhum movimento neste dia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="no-print text-xs text-slate-400">
            Despesas pagas no dia (sacolas, lanche, motoboy…) você lança em{" "}
            <Link href="/financeiro" className="text-violet-600 hover:underline">Financeiro → Lançamento</Link> e elas aparecem aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
