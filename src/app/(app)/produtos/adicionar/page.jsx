"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, fmtBRL } from "@/lib/supabase";
import { Plus, Search, Pencil, Trash2, X, LayoutGrid, ScanLine } from "lucide-react";

const vazio = {
  codigo: "", nome: "", categoria: "Geral", tamanho: "", cor: "",
  preco_custo: "", preco_venda: "", estoque: 0, fornecedor: "",
};

// bip de confirmação ao ler um código de barras
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

export default function AdicionarProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [modalGrade, setModalGrade] = useState(false);
  const [grade, setGrade] = useState({
    nome: "", codigo: "", categoria: "Geral", fornecedor: "",
    preco_custo: "", preco_venda: "", tamanhos: "P, M, G", cores: "", estoque: 1,
  });

  // leitor de código de barras (câmera) — para preencher o campo Código/Ref
  const [scanner, setScanner] = useState(null); // null | "form" | "grade"
  const [scanMsg, setScanMsg] = useState("");
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  function codigoLido(codigo) {
    const c = (codigo || "").trim();
    if (!c) return;
    bip(true);
    if (scanner === "grade") setGrade((g) => ({ ...g, codigo: c }));
    else setForm((f) => ({ ...f, codigo: c }));
    setScanMsg(`✓ Código "${c}" lido`);
    setScanner(null);
  }

  // liga/desliga a câmera quando o leitor abre/fecha
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
            codigoLido(result.getText());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanner]);

  useEffect(() => {
    if (!scanMsg || scanner) return;
    const t = setTimeout(() => setScanMsg(""), 3000);
    return () => clearTimeout(t);
  }, [scanMsg, scanner]);

  async function carregar() {
    const { data } = await supabase.from("produtos").select("*").order("nome");
    setProdutos(data || []);
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setForm(vazio);
    setEditId(null);
    setModal(true);
  }

  function abrirEdicao(p) {
    setForm({ ...p, preco_custo: p.preco_custo ?? "", preco_venda: p.preco_venda ?? "" });
    setEditId(p.id);
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSalvando(true);
    const dados = {
      codigo: form.codigo || null,
      nome: form.nome,
      categoria: form.categoria || "Geral",
      tamanho: form.tamanho || null,
      cor: form.cor || null,
      preco_custo: Number(form.preco_custo || 0),
      preco_venda: Number(form.preco_venda || 0),
      estoque: Number(form.estoque || 0),
      fornecedor: form.fornecedor || null,
    };
    if (editId) await supabase.from("produtos").update(dados).eq("id", editId);
    else await supabase.from("produtos").insert(dados);
    setSalvando(false);
    setModal(false);
    carregar();
  }

  async function salvarGrade(e) {
    e.preventDefault();
    setSalvando(true);
    const tams = grade.tamanhos.split(",").map((t) => t.trim()).filter(Boolean);
    const cores = grade.cores.split(",").map((c) => c.trim()).filter(Boolean);
    const listaCores = cores.length ? cores : [null];
    const linhas = [];
    for (const tam of tams.length ? tams : [null]) {
      for (const cor of listaCores) {
        linhas.push({
          codigo: [grade.codigo || grade.nome.slice(0, 10).toUpperCase().replace(/\s/g, ""), tam, cor]
            .filter(Boolean).join("-"),
          nome: grade.nome,
          categoria: grade.categoria || "Geral",
          tamanho: tam,
          cor: cor,
          preco_custo: Number(grade.preco_custo || 0),
          preco_venda: Number(grade.preco_venda || 0),
          estoque: Number(grade.estoque || 0),
          fornecedor: grade.fornecedor || null,
        });
      }
    }
    await supabase.from("produtos").insert(linhas);
    setSalvando(false);
    setModalGrade(false);
    carregar();
  }

  async function excluir(p) {
    if (!confirm(`Excluir "${p.nome}"?`)) return;
    await supabase.from("produtos").delete().eq("id", p.id);
    carregar();
  }

  const filtrados = produtos.filter((p) =>
    [p.nome, p.codigo, p.categoria, p.tamanho, p.cor, p.fornecedor]
      .filter(Boolean).join(" ").toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Adicionar produtos</h1>
        <p className="text-slate-500">{produtos.length} roupas cadastradas</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Buscar por nome, código, categoria, tamanho, cor…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalGrade(true)} className="btn-ghost">
            <LayoutGrid className="w-4 h-4" /> Nova grade
          </button>
          <button onClick={abrirNovo} className="btn-primary">
            <Plus className="w-4 h-4" /> Novo produto
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="px-5 py-3.5">Produto</th>
              <th className="px-5 py-3.5">Código</th>
              <th className="px-5 py-3.5">Tam / Cor</th>
              <th className="px-5 py-3.5">Custo</th>
              <th className="px-5 py-3.5">Venda</th>
              <th className="px-5 py-3.5">Estoque</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-slate-900">{p.nome}</p>
                  <p className="text-xs text-slate-400">{p.categoria}{p.fornecedor ? ` · ${p.fornecedor}` : ""}</p>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{p.codigo || "—"}</td>
                <td className="px-5 py-3.5 text-slate-500">
                  {[p.tamanho, p.cor].filter(Boolean).join(" / ") || "—"}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{fmtBRL(p.preco_custo)}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-900">{fmtBRL(p.preco_venda)}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      p.estoque <= 0
                        ? "bg-red-100 text-red-600"
                        : p.estoque <= 3
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {p.estoque} un
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => abrirEdicao(p)} className="p-2.5 rounded-lg hover:bg-violet-100 text-slate-400 hover:text-violet-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => excluir(p)} className="p-2.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalGrade && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModalGrade(false)}>
          <form
            onSubmit={salvarGrade}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Nova grade</h2>
                <p className="text-xs text-slate-400">Cria um produto para cada combinação de tamanho e cor</p>
              </div>
              <button type="button" onClick={() => setModalGrade(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Nome da peça *</label>
              <input className="input" required value={grade.nome} onChange={(e) => setGrade({ ...grade, nome: e.target.value })} placeholder="Ex: Blusa de alcinha canelada" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Referência / Código de barras base</label>
                <div className="flex gap-1.5">
                  <input className="input" value={grade.codigo} onChange={(e) => setGrade({ ...grade, codigo: e.target.value })} placeholder="Ex: BLU001" />
                  <button
                    type="button"
                    onClick={() => { setScanMsg(""); setScanner("grade"); }}
                    className="btn-ghost shrink-0 px-3"
                    title="Ler código de barras com a câmera"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Categoria</label>
                <input className="input" value={grade.categoria} onChange={(e) => setGrade({ ...grade, categoria: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Tamanhos (separados por vírgula) *</label>
              <input className="input" required value={grade.tamanhos} onChange={(e) => setGrade({ ...grade, tamanhos: e.target.value })} placeholder="P, M, G, GG" />
            </div>
            <div>
              <label className="label">Cores (separadas por vírgula)</label>
              <input className="input" value={grade.cores} onChange={(e) => setGrade({ ...grade, cores: e.target.value })} placeholder="Preto, Branco, Rosa (deixe vazio se não tiver)" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Custo (R$)</label>
                <input className="input" type="number" step="0.01" min="0" value={grade.preco_custo} onChange={(e) => setGrade({ ...grade, preco_custo: e.target.value })} />
              </div>
              <div>
                <label className="label">Venda (R$) *</label>
                <input className="input" type="number" step="0.01" min="0" required value={grade.preco_venda} onChange={(e) => setGrade({ ...grade, preco_venda: e.target.value })} />
              </div>
              <div>
                <label className="label">Estoque p/ variante</label>
                <input className="input" type="number" min="0" value={grade.estoque} onChange={(e) => setGrade({ ...grade, estoque: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Fornecedor</label>
              <input className="input" value={grade.fornecedor} onChange={(e) => setGrade({ ...grade, fornecedor: e.target.value })} />
            </div>

            <p className="text-xs text-slate-500 bg-violet-50 rounded-xl p-3">
              Serão criadas{" "}
              <strong>
                {(grade.tamanhos.split(",").filter((t) => t.trim()).length || 1) *
                  (grade.cores.split(",").filter((c) => c.trim()).length || 1)}
              </strong>{" "}
              variações desta peça.
            </p>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModalGrade(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? "Criando…" : "Criar grade"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <form
            onSubmit={salvar}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? "Editar produto" : "Novo produto"}</h2>
              <button type="button" onClick={() => setModal(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Nome da peça *</label>
              <input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Vestido longo floral" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Código / Ref (código de barras)</label>
                <div className="flex gap-1.5">
                  <input className="input" value={form.codigo || ""} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
                  <button
                    type="button"
                    onClick={() => { setScanMsg(""); setScanner("form"); }}
                    className="btn-ghost shrink-0 px-3"
                    title="Ler código de barras com a câmera"
                  >
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Categoria</label>
                <input className="input" value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Vestidos, Calças…" />
              </div>
              <div>
                <label className="label">Tamanho</label>
                <input className="input" value={form.tamanho || ""} onChange={(e) => setForm({ ...form, tamanho: e.target.value })} placeholder="P, M, G, 42…" />
              </div>
              <div>
                <label className="label">Cor</label>
                <input className="input" value={form.cor || ""} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
              </div>
              <div>
                <label className="label">Preço de custo (R$)</label>
                <input className="input" type="number" step="0.01" min="0" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
              </div>
              <div>
                <label className="label">Preço de venda (R$) *</label>
                <input className="input" type="number" step="0.01" min="0" required value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
              </div>
              <div>
                <label className="label">Estoque (un)</label>
                <input className="input" type="number" min="0" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
              </div>
              <div>
                <label className="label">Fornecedor</label>
                <input className="input" value={form.fornecedor || ""} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={salvando} className="btn-primary flex-1 justify-center">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* aviso da leitura do código de barras */}
      {scanMsg && !scanner && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
            scanMsg.startsWith("✓") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {scanMsg}
        </div>
      )}

      {/* Leitor de código de barras (câmera) */}
      {scanner && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setScanner(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-violet-600" /> Ler código de barras
              </h2>
              <button onClick={() => setScanner(null)} className="p-2 rounded-lg hover:bg-slate-50">
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
              <p className="text-sm rounded-xl p-3 font-medium bg-amber-50 text-amber-700">{scanMsg}</p>
            )}

            <p className="text-xs text-slate-400">
              Aponte a câmera para o código de barras da etiqueta. O código será preenchido automaticamente no campo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
