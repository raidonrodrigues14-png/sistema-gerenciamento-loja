"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, fmtBRL } from "@/lib/supabase";
import { FileUp, CheckCircle2, AlertCircle, PackagePlus } from "lucide-react";

function tag(el, nome) {
  const t = el.getElementsByTagName(nome);
  return t.length ? t[0].textContent : "";
}

export default function ImportarXML() {
  const router = useRouter();
  const [nfe, setNfe] = useState(null);
  const [itens, setItens] = useState([]);
  const [margem, setMargem] = useState(100);
  const [erro, setErro] = useState("");
  const [importando, setImportando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  function lerArquivo(file) {
    setErro("");
    setSucesso(false);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const xml = new DOMParser().parseFromString(reader.result, "text/xml");
        const inf = xml.getElementsByTagName("infNFe")[0];
        if (!inf) throw new Error("Este arquivo não parece ser um XML de NFe válido.");

        const emit = xml.getElementsByTagName("emit")[0];
        const fornecedor = emit ? tag(emit, "xNome") : "Fornecedor";
        const numero = tag(xml.getElementsByTagName("ide")[0] || xml, "nNF");
        const chave = (inf.getAttribute("Id") || "").replace("NFe", "");
        const totalEl = xml.getElementsByTagName("ICMSTot")[0];
        const totalNF = totalEl ? Number(tag(totalEl, "vNF")) : 0;

        const dets = Array.from(xml.getElementsByTagName("det"));
        const lista = dets.map((det, i) => {
          const prod = det.getElementsByTagName("prod")[0];
          const custo = Number(tag(prod, "vUnCom")) || 0;
          return {
            sel: true,
            idx: i,
            codigo: tag(prod, "cProd"),
            nome: tag(prod, "xProd"),
            ncm: tag(prod, "NCM"),
            qtd: Math.round(Number(tag(prod, "qCom")) || 1),
            custo,
          };
        });
        if (!lista.length) throw new Error("Nenhum produto encontrado no XML.");

        setNfe({ fornecedor, numero, chave, totalNF, arquivo: file.name });
        setItens(lista);
      } catch (e) {
        setNfe(null);
        setItens([]);
        setErro(e.message || "Erro ao ler o XML.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function precoVenda(custo) {
    return Math.round(custo * (1 + Number(margem || 0) / 100) * 100) / 100;
  }

  async function importar() {
    setImportando(true);
    setErro("");
    try {
      const selecionados = itens.filter((i) => i.sel);

      for (const item of selecionados) {
        const { data: existentes } = await supabase
          .from("produtos")
          .select("id, estoque")
          .eq("codigo", item.codigo)
          .limit(1);

        if (existentes && existentes.length) {
          await supabase
            .from("produtos")
            .update({
              estoque: (existentes[0].estoque || 0) + item.qtd,
              preco_custo: item.custo,
              fornecedor: nfe.fornecedor,
            })
            .eq("id", existentes[0].id);
        } else {
          await supabase.from("produtos").insert({
            codigo: item.codigo,
            nome: item.nome,
            categoria: "Geral",
            preco_custo: item.custo,
            preco_venda: precoVenda(item.custo),
            estoque: item.qtd,
            ncm: item.ncm || null,
            fornecedor: nfe.fornecedor,
          });
        }
      }

      await supabase.from("entradas_xml").insert({
        chave: nfe.chave || null,
        fornecedor: nfe.fornecedor,
        numero_nfe: nfe.numero || null,
        total: nfe.totalNF,
        qtd_itens: selecionados.length,
      });

      setSucesso(true);
      setTimeout(() => router.push("/produtos"), 1500);
    } catch (e) {
      setErro("Erro ao importar: " + (e.message || e));
    }
    setImportando(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Importar XML do fornecedor</h1>
        <p className="text-slate-500">
          Envie o XML da NFe que o fornecedor mandou e as roupas entram direto no estoque.
        </p>
      </div>

      <label className="card border-2 border-dashed border-violet-300 bg-violet-50/50 hover:bg-violet-50 transition cursor-pointer flex flex-col items-center justify-center py-12 px-6 text-center">
        <FileUp className="w-10 h-10 text-violet-500 mb-3" />
        <p className="font-semibold text-slate-700">Clique para escolher o arquivo XML</p>
        <p className="text-sm text-slate-400 mt-1">Arquivo .xml da nota fiscal eletrônica (NFe)</p>
        <input
          type="file"
          accept=".xml,text/xml"
          className="hidden"
          onChange={(e) => e.target.files[0] && lerArquivo(e.target.files[0])}
        />
      </label>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl p-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" /> {erro}
        </div>
      )}

      {sucesso && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl p-4 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> Produtos importados com sucesso! Redirecionando…
        </div>
      )}

      {nfe && !sucesso && (
        <>
          <div className="card p-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div><span className="text-slate-400">Fornecedor:</span> <strong>{nfe.fornecedor}</strong></div>
            <div><span className="text-slate-400">NFe nº:</span> <strong>{nfe.numero || "—"}</strong></div>
            <div><span className="text-slate-400">Total da nota:</span> <strong>{fmtBRL(nfe.totalNF)}</strong></div>
            <div><span className="text-slate-400">Itens:</span> <strong>{itens.length}</strong></div>
          </div>

          <div className="card p-5">
            <label className="label">Margem de lucro para preço de venda (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                className="input max-w-[140px]"
                value={margem}
                onChange={(e) => setMargem(e.target.value)}
              />
              <p className="text-sm text-slate-500">
                Ex: custo R$ 50,00 + {margem || 0}% = venda {fmtBRL(precoVenda(50))}
              </p>
            </div>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={itens.every((i) => i.sel)}
                      onChange={(e) => setItens(itens.map((i) => ({ ...i, sel: e.target.checked })))}
                    />
                  </th>
                  <th className="px-5 py-3.5">Código</th>
                  <th className="px-5 py-3.5">Produto</th>
                  <th className="px-5 py-3.5">Qtd</th>
                  <th className="px-5 py-3.5">Custo un.</th>
                  <th className="px-5 py-3.5">Venda sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itens.map((item) => (
                  <tr key={item.idx} className={item.sel ? "" : "opacity-40"}>
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={item.sel}
                        onChange={(e) =>
                          setItens(itens.map((i) => (i.idx === item.idx ? { ...i, sel: e.target.checked } : i)))
                        }
                      />
                    </td>
                    <td className="px-5 py-3 text-slate-500">{item.codigo}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">{item.nome}</td>
                    <td className="px-5 py-3">{item.qtd}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtBRL(item.custo)}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-600">{fmtBRL(precoVenda(item.custo))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={importar}
            disabled={importando || !itens.some((i) => i.sel)}
            className="btn-primary"
          >
            <PackagePlus className="w-4 h-4" />
            {importando ? "Importando…" : `Importar ${itens.filter((i) => i.sel).length} produtos para o estoque`}
          </button>
        </>
      )}
    </div>
  );
}
