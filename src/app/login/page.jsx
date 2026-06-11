"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Shirt, LogIn, UserPlus } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 shadow-lg shadow-violet-600/40 mb-4">
            <Shirt className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Loja Joselane</h1>
          <p className="text-slate-400 mt-1">Sistema de gerenciamento da loja</p>
        </div>

        <form onSubmit={enviar} className="bg-white rounded-3xl shadow-2xl p-8 space-y-4">
          <div>
            <label className="label">E-mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
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

          <button type="submit" disabled={carregando} className="btn-primary w-full justify-center">
            {modo === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {carregando ? "Aguarde…" : modo === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => { setModo(modo === "login" ? "cadastro" : "login"); setErro(""); setAviso(""); }}
            className="w-full text-center text-sm text-violet-600 hover:underline font-medium"
          >
            {modo === "login" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
