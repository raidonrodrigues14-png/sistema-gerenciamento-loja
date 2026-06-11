"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Package, Receipt, Users, ChevronRight } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setCarregando(true);

    if (modo === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErro("E-mail ou senha incorretos.");
      else router.replace("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({ email, password: senha });
      if (error) setErro(error.message);
      else setAviso("Conta criada! Verifique seu e-mail para confirmar (ou faça login se a confirmação estiver desativada).");
    }
    setCarregando(false);
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Painel da marca */}
      <div
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: "radial-gradient(130% 100% at 30% 20%, #2a2724 0%, #161311 55%, #0e0c0b 100%)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: 520, height: 520, right: -160, bottom: -220,
            background: "radial-gradient(circle, oklch(0.5 0.07 60 / 0.35), transparent 65%)",
            filter: "blur(20px)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.045) 50%, transparent 60%)" }}
        />

        <div className="relative flex items-center gap-3">
          <Image
            src="/superbonita.png"
            alt="Super Bonita"
            width={50}
            height={50}
            className="rounded-full"
            style={{ border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 0 0 1px rgba(0,0,0,0.6)" }}
          />
          <div className="leading-snug">
            <p className="serif" style={{ fontWeight: 700, fontSize: 16, color: "var(--tx)" }}>Loja Super Bonita</p>
            <p className="eyebrow" style={{ fontSize: 9.5 }}>Gestão da loja</p>
          </div>
        </div>

        <div className="relative">
          <div className="mb-14 flex flex-col" style={{ lineHeight: 0.85 }}>
            <span className="chrome-text serif" style={{ fontStyle: "italic", fontWeight: 500, fontSize: 32, marginBottom: 6 }}>
              Super
            </span>
            <span className="chrome-text serif" style={{ fontStyle: "italic", fontWeight: 800, fontSize: 74 }}>
              Bonita
            </span>
          </div>
          <p className="serif" style={{ fontSize: 26, lineHeight: 1.3, color: "var(--tx)", maxWidth: 380, fontWeight: 500 }}>
            Sua loja, do estoque à venda,{" "}
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>num só lugar.</span>
          </p>
          <p style={{ marginTop: 14, maxWidth: 360, fontSize: 14.5, color: "var(--tx-2)" }}>
            Controle de peças, importação de notas do fornecedor e fechamento de vendas — pensado para o balcão.
          </p>
        </div>

        <div className="relative flex gap-6 text-sm" style={{ color: "var(--tx-3)", fontSize: 12.5 }}>
          <span className="flex items-center gap-2"><Package className="w-4 h-4" /> Estoque vivo</span>
          <span className="flex items-center gap-2"><Receipt className="w-4 h-4" /> Notas & impressão</span>
          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Clientes</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-8" style={{ background: "var(--bg)" }}>
        <form onSubmit={enviar} className="w-full max-w-sm space-y-4">
          <div className="lg:hidden flex justify-center mb-6">
            <Image
              src="/superbonita.png"
              alt="Super Bonita"
              width={72}
              height={72}
              className="rounded-full"
              style={{ border: "1px solid rgba(255,255,255,0.14)" }}
            />
          </div>

          <div>
            <p className="eyebrow mb-2">{modo === "login" ? "Bem-vinda de volta" : "Criar acesso"}</p>
            <h1 className="text-3xl mb-1" style={{ color: "var(--tx)" }}>
              {modo === "login" ? "Entrar" : "Nova conta"}
            </h1>
            <p style={{ color: "var(--tx-2)", fontSize: 14 }}>Acesse o painel da Loja Joselane.</p>
          </div>

          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{erro}</p>}
          {aviso && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3">{aviso}</p>}

          <button type="submit" disabled={carregando} className="btn-primary w-full" style={{ height: 46 }}>
            {carregando ? "Entrando…" : modo === "login" ? "Entrar no painel" : "Criar conta"}
            {!carregando && <ChevronRight className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => { setModo(modo === "login" ? "cadastro" : "login"); setErro(""); setAviso(""); }}
            className="w-full text-center text-sm"
            style={{ color: "var(--tx-3)" }}
          >
            {modo === "login" ? "Não tem conta? " : "Já tem conta? "}
            <span style={{ color: "var(--gold)", fontWeight: 600 }}>
              {modo === "login" ? "Criar acesso" : "Entrar"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
