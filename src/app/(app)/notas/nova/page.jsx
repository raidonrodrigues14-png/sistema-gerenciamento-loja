"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Search, Plus, Minus, Trash2, Receipt, ShoppingBag, ScanLine, X, Settings } from "lucide-react";
import PagamentoPixModal from "@/components/PagamentoPixModal";
import PagamentoPixEstaticoModal from "@/components/PagamentoPixEstaticoModal";
import PagamentoCartaoModal from "@/components/PagamentoCartaoModal";

// Gera um hash SHA-256 do PIN (não guardamos o PIN em texto puro)
async function hashPin(pin) {
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  const enc = new TextEncoder().encode(String(pin || "").trim());
  const buf = await window.crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Pedir o PIN antes de liberar a troca da chave Pix já configurada ────────
function VerificarPinModal({ pinHash, onConfirmar, onClose }) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");
  const [verificando, setVerificando] = useState(false);

  async function confirmar() {
    if (!pin || verificando) return;
    setVerificando(true);
    setErro("");
    const hash = await hashPin(pin);
    setVerificando(false);
    if (hash && hash === pinHash) onConfirmar();
    else setErro("PIN incorreto.");
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--tx)", margin: 0 }}>Digite o PIN</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--tx-3)", marginBottom: 12 }}>
          Para trocar a chave Pix da loja, digite o PIN cadastrado.
        </p>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }}
          placeholder="PIN"
        />
        {erro && <p style={{ color: "#e58d7b", fontSize: 12.5, marginTop: 8 }}>{erro}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn-primary" style={{ flex: 1, height: 40, justifyContent: "center" }} disabled={verificando || !pin} onClick={confirmar}>
            {verificando ? "Verificando…" : "Confirmar"}
          </button>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Configurar chave Pix da loja (usada no Pix manual/estático) ─────────────
function ConfigPixModal({ cfg, onSave, onClose }) {
  const [form, setForm] = useState({ ...cfg });
  const [trocarPin, setTrocarPin] = useState(false);
  const [novoPin, setNovoPin] = useState("");
  const [confirmaPin, setConfirmaPin] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const precisaCriarPin = !cfg?.pin_hash; // ainda não tem PIN cadastrado (1ª vez)

  async function salvar() {
    setErro("");
    if (precisaCriarPin || trocarPin) {
      if (novoPin.trim().length < 4) return setErro("O PIN precisa ter pelo menos 4 dígitos.");
      if (novoPin !== confirmaPin) return setErro("Os PINs digitados não coincidem.");
    }
    setSalvando(true);
    try {
      const payload = { ...form, taxa_pix_dinamico: Number(form.taxa_pix_dinamico || 0) };
      if (precisaCriarPin || trocarPin) payload.pin_hash = await hashPin(novoPin);
      await onSave(payload);
    } catch (e) {
      setErro(
        "Erro ao salvar: " + (e.message || e) +
        " — verifique se a migração supabase/pix_estatico_venda_pin.sql foi executada no Supabase."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: "var(--tx)", margin: 0 }}>Chave Pix da loja</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tx-3)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Tipo de chave PIX</label>
            <select className="input" value={form.tipo_chave || "aleatoria"} onChange={f("tipo_chave")}>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="telefone">Telefone</option>
              <option value="email">E-mail</option>
              <option value="aleatoria">Chave aleatória (EVP)</option>
            </select>
          </div>
          <div>
            <label className="label">Chave PIX</label>
            <input className="input" type="text" value={form.chave_pix || ""} onChange={f("chave_pix")} placeholder="Sem pontos, traços ou espaços" />
          </div>
          <div>
            <label className="label">Nome da loja no PIX (até 25 caracteres)</label>
            <input className="input" type="text" value={form.nome_loja || ""} onChange={f("nome_loja")} placeholder="Ex: Elta Variedades" />
          </div>
          <div>
            <label className="label">Cidade</label>
            <input className="input" type="text" value={form.cidade_loja || ""} onChange={f("cidade_loja")} placeholder="Ex: Fortaleza" />
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "var(--tx)", marginBottom: 6 }}>Pix dinâmico (AbacatePay)</p>
            <p style={{ fontSize: 11.5, color: "var(--tx-3)", marginBottom: 8, lineHeight: 1.5 }}>
              Quando você gerar o QR dinâmico (confirma sozinho), essa taxa é somada ao total e cobrada
              do cliente — serve pra cobrir a taxa que a AbacatePay cobra por Pix (hoje, R$ 0,80).
            </p>
            <label className="label">Taxa cobrada do cliente no QR dinâmico (R$)</label>
            <input className="input" type="number" min="0" step="0.01" value={form.taxa_pix_dinamico ?? 0.9} onChange={f("taxa_pix_dinamico")} />
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            {precisaCriarPin ? (
              <>
                <p style={{ fontSize: 12.5, color: "var(--tx-3)", marginBottom: 8 }}>
                  Crie um PIN para proteger a troca dessa chave no futuro.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label className="label">Criar PIN (mín. 4 dígitos)</label>
                    <input className="input" type="password" inputMode="numeric" value={novoPin} onChange={(e) => setNovoPin(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Confirmar PIN</label>
                    <input className="input" type="password" inputMode="numeric" value={confirmaPin} onChange={(e) => setConfirmaPin(e.target.value)} />
                  </div>
                </div>
              </>
            ) : trocarPin ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label className="label">Novo PIN (mín. 4 dígitos)</label>
                  <input className="input" type="password" inputMode="numeric" value={novoPin} onChange={(e) => setNovoPin(e.target.value)} />
                </div>
                <div>
                  <label className="label">Confirmar novo PIN</label>
                  <input className="input" type="password" inputMode="numeric" value={confirmaPin} onChange={(e) => setConfirmaPin(e.target.value)} />
                </div>
                <button
                  type="button"
                  onClick={() => { setTrocarPin(false); setNovoPin(""); setConfirmaPin(""); }}
                  className="text-xs text-slate-400 hover:underline"
                  style={{ alignSelf: "flex-start" }}
                >
                  Cancelar troca de PIN
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setTrocarPin(true)}
                className="text-xs text-violet-600 font-medium hover:underline"
              >
                Trocar PIN de proteção
              </button>
            )}
          </div>

          {erro && <p style={{ color: "#e58d7b", fontSize: 12.5 }}>{erro}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="btn-primary" style={{ flex: 1, height: 42, justifyContent: "center" }} disabled={salvando} onClick={salvar}>
              {salvando ? "Salvando…" : "Salvar"}
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
  const [showPix, setShowPix] = useState(false);
  const [tipoPix, setTipoPix] = useState("manual"); // "manual" = QR fixo sem taxa; "automatico" = QR dinâmico AbacatePay, confirma só, soma a taxa configurada
  const [showPixEstatico, setShowPixEstatico] = useState(false);
  const [showCartao, setShowCartao] = useState(false);
  const [showConfigPix, setShowConfigPix] = useState(false);
  const [showPinCheck, setShowPinCheck] = useState(false);
  const [pixCfg, setPixCfg] = useState({ chave_pix: "", tipo_chave: "aleatoria", nome_loja: "Elta Variedades", cidade_loja: "Fortaleza", taxa_pix_dinamico: 0.9 });
  const [scanner, setScanner] = useState(false);
  const [scanMsg, setScanMsg] = useState("");
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const ultimoRef = useRef({ codigo: "", t: 0 });
  const produtosRef = useRef([]);
  useEffect(() => { produtosRef.current = produtos; }, [produtos]);

  // processa um código lido (câmera ou scanner USB)
  function tratarCodigo(codigo) {
    const c = (codigo || "").trim();
    if (!c) return;
    const p = produtosRef.current.find(
      (x) => (x.codigo || "").trim().toUpperCase() === c.toUpperCase()
    );
    if (!p) {
      bip(false);
      setScanMsg(`Código "${c}" não encontrado no estoque.`);
    } else if (p.estoque <= 0) {
      bip(false);
      setScanMsg(`${p.nome} está sem estoque!`);
    } else {
      bip(true);
      adicionar(p);
      setScanMsg(`✓ ${p.nome} ${[p.tamanho, p.cor].filter(Boolean).join(" ")} adicionado`);
    }
  }

  // scanner físico (USB): digita o código muito rápido e termina com Enter
  useEffect(() => {
    let buf = "";
    let ultimaTecla = 0;
    function onKey(e) {
      const agora = Date.now();
      if (agora - ultimaTecla > 100) buf = ""; // digitação humana zera o buffer
      ultimaTecla = agora;
      if (e.key === "Enter") {
        if (buf.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          tratarCodigo(buf);
          setBusca(""); // limpa o que o scanner "digitou" na busca
        }
        buf = "";
      } else if (e.key.length === 1) {
        buf += e.key;
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // aviso do scanner some sozinho depois de 3s
  useEffect(() => {
    if (!scanMsg || scanner) return;
    const t = setTimeout(() => setScanMsg(""), 3000);
    return () => clearTimeout(t);
  }, [scanMsg, scanner]);

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
            tratarCodigo(codigo);
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
    supabase.from("config_pix_venda").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) setPixCfg(data);
    });
  }, []);

  async function salvarPixCfg(novo) {
    const { error } = await supabase.from("config_pix_venda").upsert({ id: 1, ...novo });
    if (error) throw error;
    setPixCfg((p) => ({ ...p, ...novo }));
    setShowConfigPix(false);
  }

  // Abre a configuração da chave Pix — se já existe um PIN cadastrado, pede o
  // PIN antes de liberar a edição.
  function abrirConfigPix() {
    if (pixCfg?.pin_hash) setShowPinCheck(true);
    else setShowConfigPix(true);
  }

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
  const taxaPixDinamico = Number(pixCfg?.taxa_pix_dinamico ?? 0.9);

  // Cria de fato a nota no Supabase (itens, baixa de estoque, parcelas do
  // crediário) e navega para o recibo. Usada tanto pelo fluxo normal quanto
  // pela confirmação automática do pagamento Pix.
  async function criarNotaNoSupabase({ formaPagamentoFinal = pagamento, observacaoFinal = obs } = {}) {
    const cliente = clientes.find((c) => c.id === clienteId);
    const { data: nota, error } = await supabase
      .from("notas")
      .insert({
        cliente_id: clienteId || null,
        cliente_nome: cliente ? cliente.nome : "Consumidor Final",
        subtotal,
        desconto: Number(desconto || 0),
        total,
        forma_pagamento: formaPagamentoFinal,
        observacao: observacaoFinal || null,
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
    if (formaPagamentoFinal === "Crediário") {
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
    return nota;
  }

  async function gerarNota() {
    if (!carrinho.length) return;

    // Pix: abre a tela de pagamento. A nota só é criada quando o pagamento
    // é confirmado (ver onConfirmado do PagamentoPixModal mais abaixo) — assim
    // o Fechamento de Caixa só recebe vendas realmente pagas.
    if (pagamento === "Pix") {
      if (tipoPix === "manual") setShowPixEstatico(true);
      else setShowPix(true);
      return;
    }

    // Cartão de crédito: não há integração com a maquininha, então a atendente
    // processa o pagamento nela mesma e só confirma aqui depois — daí a nota é
    // criada e entra no Caixa do dia (mesma lógica do Pix manual acima).
    if (pagamento === "Cartão de crédito") {
      setShowCartao(true);
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      await criarNotaNoSupabase();
    } catch (e) {
      setErro("Erro ao gerar nota: " + (e.message || e));
      setSalvando(false);
    }
  }

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Nova venda</h1>
        <p className="text-slate-500">
          Selecione as roupas, bipe com o leitor de código de barras, ou use a câmera
        </p>
      </div>

      {/* aviso do scanner USB */}
      {scanMsg && !scanner && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            scanMsg.startsWith("✓") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {scanMsg}
        </div>
      )}

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
            {pagamento === "Pix" && (
              <div className="bg-violet-50 rounded-xl p-3 space-y-2">
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input type="radio" name="tipoPix" checked={tipoPix === "manual"} onChange={() => setTipoPix("manual")} />
                    QR fixo (sem taxa, confirma na mão)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input type="radio" name="tipoPix" checked={tipoPix === "automatico"} onChange={() => setTipoPix("automatico")} />
                    QR dinâmico (confirma sozinho)
                  </label>
                </div>
                {tipoPix === "automatico" && (
                  <p className="text-xs text-violet-700">
                    Taxa de {fmtBRL(taxaPixDinamico)} somada ao total — o cliente paga {fmtBRL(total + taxaPixDinamico)} no QR.
                  </p>
                )}
                <button
                  type="button"
                  onClick={abrirConfigPix}
                  className="text-xs text-violet-600 font-medium flex items-center gap-1 hover:underline"
                >
                  <Settings className="w-3 h-3" /> Configurar chave Pix da loja
                </button>
              </div>
            )}
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
              {salvando
                ? "Gerando nota…"
                : pagamento === "Pix"
                ? "Gerar QR Code Pix"
                : pagamento === "Cartão de crédito"
                ? "Processar no cartão"
                : "Gerar nota"}
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

      {/* Tela de pagamento Pix — QR code + confirmação automática */}
      {showPix && (
        <PagamentoPixModal
          valor={total + taxaPixDinamico}
          taxa={taxaPixDinamico}
          descricao={`Venda${clienteSelecionado ? " - " + clienteSelecionado.nome : ""}`}
          cliente={clienteSelecionado}
          onConfirmado={async () => {
            const notaTaxa = `Pix dinâmico: taxa de ${fmtBRL(taxaPixDinamico)} cobrada do cliente (total no QR: ${fmtBRL(total + taxaPixDinamico)})`;
            await criarNotaNoSupabase({ formaPagamentoFinal: "Pix", observacaoFinal: obs ? `${obs} — ${notaTaxa}` : notaTaxa });
          }}
          onClose={() => setShowPix(false)}
        />
      )}

      {/* Tela de pagamento Pix manual — QR fixo + confirmação manual */}
      {showPixEstatico && (
        <PagamentoPixEstaticoModal
          valor={total}
          txid="***"
          cfg={pixCfg}
          onConfirmar={async () => {
            await criarNotaNoSupabase({ formaPagamentoFinal: "Pix" });
            setShowPixEstatico(false);
          }}
          onClose={() => setShowPixEstatico(false)}
          onConfigurar={() => { setShowPixEstatico(false); setShowConfigPix(true); }}
        />
      )}

      {/* Tela de confirmação do cartão de crédito — pagamento processado na maquininha física */}
      {showCartao && (
        <PagamentoCartaoModal
          valor={total}
          onConfirmar={async (parcelas) => {
            const obsParcelas = parcelas > 1 ? `Cartão em ${parcelas}x na maquininha` : "Cartão à vista na maquininha";
            const observacaoFinal = obs ? `${obs} — ${obsParcelas}` : obsParcelas;
            await criarNotaNoSupabase({ formaPagamentoFinal: "Cartão de crédito", observacaoFinal });
            setShowCartao(false);
          }}
          onClose={() => setShowCartao(false)}
        />
      )}

      {/* Configuração da chave Pix fixa da loja */}
      {showConfigPix && (
        <ConfigPixModal cfg={pixCfg} onSave={salvarPixCfg} onClose={() => setShowConfigPix(false)} />
      )}

      {/* Pede o PIN antes de liberar a troca da chave Pix já configurada */}
      {showPinCheck && (
        <VerificarPinModal
          pinHash={pixCfg.pin_hash}
          onConfirmar={() => { setShowPinCheck(false); setShowConfigPix(true); }}
          onClose={() => setShowPinCheck(false)}
        />
      )}
    </div>
  );
}
