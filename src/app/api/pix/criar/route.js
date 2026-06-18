import { NextResponse } from "next/server";
import { criarPixQrCode } from "@/lib/abacatepay";

export async function POST(req) {
  try {
    const body = await req.json();
    const { amountReais, description, expiresIn, customer, metadata } = body || {};

    const data = await criarPixQrCode({
      amountReais,
      description,
      expiresIn,
      customer,
      metadata,
    });

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Erro ao criar cobrança Pix." },
      { status: 400 }
    );
  }
}
