// ─── AbacatePay — integração Pix com confirmação automática de pagamento ─────
// Documentação: https://docs.abacatepay.com
//
// IMPORTANTE: este arquivo só deve ser importado em código que roda no
// servidor (rotas /api/*). A chave de API nunca deve chegar ao navegador.

const BASE_URL = "https://api.abacatepay.com/v1";

// envName permite usar uma conta AbacatePay diferente da conta padrão da loja —
// usado pela mensalidade da licença, que precisa cair na conta de quem desenvolveu
// o sistema, e não na conta da loja (que recebe pelas vendas das roupas).
function getApiKey(envName = "ABACATEPAY_API_KEY") {
  const key = process.env[envName];
  if (!key) {
    throw new Error(
      `${envName} não configurada. Defina essa variável de ambiente (.env.local em desenvolvimento, ou em Project Settings > Environment Variables na Vercel).`
    );
  }
  return key;
}

async function abacateFetch(path, options = {}, envName = "ABACATEPAY_API_KEY") {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey(envName)}`,
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Resposta inválida da AbacatePay (status ${res.status})`);
  }

  if (!res.ok || json.error) {
    throw new Error(json.error || `Erro AbacatePay (status ${res.status})`);
  }
  return json.data;
}

// Cria um QRCode Pix (copia-e-cola + imagem base64).
// amountReais: valor em reais (ex.: 49.9). description: até 37 caracteres.
// customer (opcional): { name, cellphone, email, taxId } — se informado, TODOS são obrigatórios.
export async function criarPixQrCode({ amountReais, description, expiresIn = 1800, customer, metadata }, envName = "ABACATEPAY_API_KEY") {
  const amount = Math.round(Number(amountReais || 0) * 100); // centavos
  if (!amount || amount <= 0) throw new Error("Valor inválido para gerar o Pix.");

  const body = {
    amount,
    expiresIn,
    description: String(description || "Pagamento").slice(0, 37),
  };

  if (customer && customer.name && customer.cellphone && customer.email && customer.taxId) {
    body.customer = customer;
  }
  if (metadata) body.metadata = metadata;

  return abacateFetch("/pixQrCode/create", {
    method: "POST",
    body: JSON.stringify(body),
  }, envName);
}

// Checa o status atual de um QRCode Pix: PENDING | PAID | EXPIRED | CANCELLED | REFUNDED
export async function checarStatusPix(id, envName = "ABACATEPAY_API_KEY") {
  if (!id) throw new Error("id do QRCode Pix é obrigatório.");
  return abacateFetch(`/pixQrCode/check?id=${encodeURIComponent(id)}`, {
    method: "GET",
  }, envName);
}

// Simula o pagamento de um QRCode Pix — só funciona com chaves de teste (sandbox/dev).
// Útil para testar o fluxo completo sem precisar de um pagamento real.
export async function simularPagamentoPix(id, envName = "ABACATEPAY_API_KEY") {
  if (!id) throw new Error("id do QRCode Pix é obrigatório.");
  return abacateFetch(`/pixQrCode/simulate-payment?id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify({ metadata: {} }),
  }, envName);
}

// ─── Conta da mensalidade da licença (conta de quem desenvolveu o sistema) ───
// Usa ABACATEPAY_API_KEY_LICENCA em vez de ABACATEPAY_API_KEY, pra que o
// pagamento da mensalidade caia na conta do desenvolvedor, não na da loja.
export async function criarPixQrCodeLicenca(params) {
  return criarPixQrCode(params, "ABACATEPAY_API_KEY_LICENCA");
}
export async function checarStatusPixLicenca(id) {
  return checarStatusPix(id, "ABACATEPAY_API_KEY_LICENCA");
}
export async function simularPagamentoPixLicenca(id) {
  return simularPagamentoPix(id, "ABACATEPAY_API_KEY_LICENCA");
}
