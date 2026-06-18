import { NextResponse } from "next/server";
import { simularPagamentoPix } from "@/lib/abacatepay";

// Disponível apenas para chaves de teste (sandbox/dev) da AbacatePay.
// Usado no painel para simular o pagamento durante testes, sem precisar de um Pix real.
export async function POST(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const data = await simularPagamentoPix(id);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Erro ao simular pagamento do Pix." },
      { status: 400 }
    );
  }
}
