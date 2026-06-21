"use client";

import { useEffect } from "react";

// Registra o service worker que permite instalar o sistema como app
// ("Adicionar à tela de início") no celular. Não faz nada visível —
// só precisa existir para o navegador considerar o site instalável.
export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
