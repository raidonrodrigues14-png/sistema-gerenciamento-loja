import { NextResponse } from "next/server";
import { checarStatusPix } from "@/lib/abacatepay";

export async function GET(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const data = await checarStatusPix(id);
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e.message || "Erro ao checar status do Pix." },
      { status: 400 }
    );
  }
}
