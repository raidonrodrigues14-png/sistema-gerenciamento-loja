"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Search, Plus, Minus, Trash2, Receipt, ShoppingBag, ScanLine, X } from "lucide-react";

// bip de confirmação
function bip(ok = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = ok ? 1200 : 280;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
  } catch {}
}

export default function NovaNota() {
  const router = useRouter();
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [pagamento, setPagamento] = useState("Dinheiro");
  const [desconto, setDesconto] = useState("");
  const [obs, setObs] = useState("");
  const [numParcelas, setNumParcelas] = useState(3);
  const [primeiroVenc, setPrimeiroVenc] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [scanner, setScanner] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const ultimoRef = useRef({ codigo: "", t: 0 });
  const produtosRef = useRef([]);
  useEffect(() => { produtosRef.current = produtos; }, [produtos]);

  // liga/desliga a câmera quando o scanner abre/fecha
  useEffect(() => {
    if (!scanner) return;
    let ativo = true;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result || !ativo) return;
            const codigo = result.getText().trim();
            const agora = Date.now();
            // evita bipar o mesmo código várias vezes seguidas
            if (ultimoRef.current.codigo === codigo && agora - ultimoRef.current.t < 2000) return;
            ultimoRef.current = { codigo, t: agora };

            const p = produtosRef.current.find(
              (x) => (x.codigo || "").trim().toUpperCase() === codigo.toUpperCase()
            );
            if (!p) {
              bip(false);
              setScanMsg(`Código "${codigo}" não encontrado no estoque.`);
            } else if (p.estoque <= 0) {
              bip(false);
              setScanMsg(`${p.nome} está sem estoque!`);
            } else {
              bip(true);
              adicionar(p);
              setScanMsg(`✓ ${p.nome} ${[p.tamanho, p.cor].filter(Boolean).join(" ")} adicionado`);
            }
          }
        );
        if (!ativo) controls.stop();
        else controlsRef.current = controls;
      } catch (e) {
        setScanMsg("Não consegui acessar a câmera. Verifique a permissão no navegador.");
      }
    })();

    return () => {
      ativo = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [scanner]);

  useEffect(() => {
    supabase.from("produtos").select("*").order("nome").then(({ data }) => setProdutos(data || []));
    supabase.from("clientes").select("*").order("nome").then(({ data }) => setClientes(data || []));
  }, []);

  const filtrados = useMemo(
    () =>
      produtos.filter((p) =>
        [p.nome, p.codigo, p.categoria, p.tamanho, p.cor]
          .filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase())
      ),
    [produtos, busca]
  );

  function adicionar(p) {
    setCarrinho((c) => {
      const existe = c.find((i) => i.produto_id === p.id);
      if (existe) {
        return c.map((i) =>
          i.produto_id === p.id ? { ...i, qtd: i.qtd + 1 } : i
        );
      }
      return [
        ...c,
        {
          produto_id: p.id,
          descricao: [p.nome, p.tamanho, p.cor].filter(Boolean).join(" "),
          preco: Number(p.preco_venda),
          qtd: 1,
          estoque: p.estoque,
        },
      ];
    });
  }

  function mudarQtd(id, delta) {
    setCarrinho((c) =>
      c
        .map((i) => (i.produto_id === id ? { ...i, qtd: i.qtd + delta } : i))
        .filter((i) => i.qtd > 0)
    );
  }

  const subtotal = carrinho.reduce((s, i) => s + i.preco * i.qtd, 0);
  const total = Math.max(0, subtotal - Number(desconto || 0));

  async function gerarNota() {
    if (!carrinho.length) return;
    setSalvando(true);
    setErro("");
    try {
      const cliente = clientes.find((c) => c.id === clienteId);
      const { data: nota, error } = await supabase
        .from("notas")
        .insert({
          cliente_id: clienteId || null,
          cliente_nome: cliente ? cliente.nome : "Consumidor Final",
          subtotal,
          desconto: Number(desconto || 0),
          total,
          forma_pagamento: pagamento,
          observacao: obs || null,
        })
        .select()
        .single();
      if (error) throw error;

      const itens = carrinho.map((i) => ({
        nota_id: nota.id,
        produto_id: i.produto_id,
        descricao: i.descricao,
        quantidade: i.qtd,
        preco_unit: i.preco,
        total: i.preco * i.qtd,
      }));
      const { error: erroItens } = await supabase.from("nota_itens").insert(itens);
      if (erroItens) throw erroItens;

      // baixa estoque
      for (const i of carrinho) {
        await supabase.rpc("baixar_estoque", { p_produto_id: i.produto_id, p_qtd: i.qtd });
      }

      // gera parcelas do crediário
      if (pagamento === "Crediário") {
        const n = Math.max(1, Number(numParcelas));
        const valorBase = Math.floor((total / n) * 100) / 100;
        const linhas = [];
        for (let p = 0; p < n; p++) {
          const venc = new Date(primeiroVenc + "T12:00:00");
          venc.setMonth(venc.getMonth() + p);
          linhas.push({
            nota_id: nota.id,
            numero: p + 1,
            vencimento: venc.toISOString().slice(0, 10),
            valor: p === n - 1 ? Math.round((total - valorBase * (n - 1)) * 100) / 100 : valorBase,
          });
        }
        await supabase.from("parcelas").insert(linhas);
      }

      router.push(`/notas/${nota.id}`);
    } catch (e) {
      setErro("Erro ao gerar nota: " + (e.message || e));
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Nova nota</h1>
        <p className="text-slate-500">Selecione as roupas do sistema e gere a nota da venda</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Catálogo de produtos */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Buscar roupa por nome, código, tamanho, cor…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setScanMsg(""); setScanner(true); }}
              className="btn-primary shrink-0"
              title="Ler código de barras com a câmera"
            >
              <ScanLine className="w-4 h-4" /> Escanear
            </button>
          </div>

          <div className="card divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => adicionar(p)}
                disabled={p.estoque <= 0}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-violet-50 transition text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.nome}</p>
                  <p className="text-xs text-slate-400">
                    {[p.codigo, p.tamanho, p.cor].filter(Boolean).join(" · ")}
                    {" · "}
                    <span className={p.estoque <= 0 ? "text-red-500 font-semibold" : ""}>
                      {p.estoque} em estoque
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="font-bold text-slate-900">{fmtBRL(p.preco_venda)}</span>
                  <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
            {filtrados.length === 0 && (
              <p className="px-5 py-10 text-center text-slate-400 text-sm">
                Nenhuma roupa encontrada no sistema.
              </p>
            )}
          </div>
        </div>

        {/* Carrinho / resumo */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-violet-600" />
              Itens da nota ({carrinho.reduce((s, i) => s + i.qtd, 0)})
            </h2>

            {carrinho.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Clique nas roupas ao lado para adicionar.
              </p>
            ) : (
              <div className="space-y-3">
                {carrinho.map((i) => (
                  <div key={i.produto_id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{i.descricao}</p>
                      <p className="text-xs text-slate-400">{fmtBRL(i.preco)} cada</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => mudarQtd(i.produto_id, -1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{i.qtd}</span>
                      <button onClick={() => mudarQtd(i.produto_id, 1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setCarrinho((c) => c.filter((x) => x.produto_id !== i.produto_id))} className="w-7 h-7 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 flex items-center justify-center">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-3">
            <div>
              <label className="label">Cliente</label>
              <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Consumidor Final</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Pagamento</label>
                <select className="input" value={pagamento} onChange={(e) => setPagamento(e.target.value)}>
                  {["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito", "Crediário"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Desconto (R$)</label>
                <input className="input" type="number" min="0" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            {pagamento === "Crediário" && (
              <div className="grid grid-cols-2 gap-3 bg-violet-50 rounded-xl p-3">
                <div>
                  <label className="label">Nº de parcelas</label>
                  <input className="input" type="number" min="1" max="24" value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
                </div>
                <div>
                  <label className="label">1º vencimento</label>
                  <input className="input" type="date" value={primeiroVenc} onChange={(e) => setPrimeiroVenc(e.target.value)} />
                </div>
                <p className="col-span-2 text-xs text-slate-500">
                  {Math.max(1, Number(numParcelas))}x de {fmtBRL(total / Math.max(1, Number(numParcelas)))}
                </p>
              </div>
            )}

            <div>
              <label className="label">Observação</label>
              <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Desconto</span><span>- {fmtBRL(desconto || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-extrabold text-slate-900">
                <span>Total</span><span>{fmtBRL(total)}</span>
              </div>
            </div>

            {erro && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{erro}</p>}

            <button
              onClick={gerarNota}
              disabled={salvando || carrinho.length === 0}
              className="btn-primary w-full justify-center"
            >
              <Receipt className="w-4 h-4" />
              {salvando ? "Gerando nota…" : "Gerar nota"}
            </button>
          </div>
        </div>
      </div>

      {/* Scanner de código de barras */}
      {scanner && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setScanner(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-violet-600" /> Escanear etiqueta
              </h2>
              <button onClick={() => setScanner(false)} className="p-2 rounded-lg hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden" style={{ background: "#000" }}>
              <video ref={videoRef} className="w-full" style={{ maxHeight: 320, objectFit: "cover" }} />
              <div
                className="absolute left-6 right-6 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ height: 2, background: "rgba(220,60,60,0.85)", boxShadow: "0 0 12px rgba(220,60,60,0.8)" }}
              />
            </div>

            {scanMsg && (
              <p
                className={`text-sm rounded-xl p-3 font-medium ${
                  scanMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {scanMsg}
              </p>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {carrinho.reduce((s, i) => s + i.qtd, 0)} peças · {fmtBRL(subtotal)}
              </span>
              <button onClick={() => setScanner(false)} className="btn-ghost">
                Concluir
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Aponte a câmera para o código de barras da etiqueta. Cada leitura adiciona 1 peça à nota — pode bipar a mesma etiqueta de novo para adicionar outra.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
