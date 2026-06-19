import { NextResponse } from "next/server";
import { criarPixQrCodeLicenca } from "@/lib/abacatepay";

// Gera a cobrança Pix da mensalidade do sistema — cai na conta AbacatePay do
// desenvolvedor (ABACATEPAY_API_KEY_LICENCA), separada da conta da loja.
export async function POST(req) {
  try {
    const body = await req.json();
    const { amountReais, description, expiresIn, metadata } = body || {};

    const data = await criarPixQrCodeLicenca({
      amountReais,
      description,
      expiresIn,
      metadata,
    });

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Erro ao criar cobrança Pix da mensalidade." },
      { status: 400 }
    );
  }
}
