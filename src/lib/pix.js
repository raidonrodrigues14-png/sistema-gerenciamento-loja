// ─── Helpers Pix (EMV / BR Code) — compartilhado entre Carnê e Licença ────────

export function tlv(id, value) {
  const v = String(value);
  return `${id}${String(v.length).padStart(2, "0")}${v}`;
}

export function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

// Remove acentos e caracteres não permitidos pelo padrão Pix (apenas A-Z 0-9 espaço)
export function limparTexto(str, max) {
  const combining = new RegExp("[\\u0300-\\u036f]", "g");
  const semAcento = String(str || "")
    .normalize("NFD")
    .replace(combining, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
  return (semAcento || "NA").slice(0, max);
}

// Formata a chave Pix de acordo com o tipo (regra do Bacen p/ a chave ser reconhecida)
export function formatarChavePix(chave, tipo) {
  const v = String(chave || "").trim();
  const digitos = v.replace(/\D/g, "");
  switch (tipo) {
    case "cpf":
    case "cnpj":
      return digitos; // só números, sem ponto/traço/barra
    case "telefone": {
      let d = digitos.replace(/^0+/, "");
      if (d.startsWith("55") && d.length > 11) d = d.slice(2);
      return `+55${d}`;
    }
    case "email":
      return v.toLowerCase();
    case "aleatoria":
    default:
      return v; // chave aleatória (EVP) já vem no formato correto (uuid)
  }
}

export function gerarPixPayload({ chave, nome, cidade, valor, txid }) {
  const chaveLimpa = String(chave || "").trim();
  const ma = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", chaveLimpa);
  const txidLimpo = (txid || "***").toUpperCase().replace(/[^A-Z0-9*]/g, "").slice(0, 25) || "***";
  const ad = tlv("05", txidLimpo);
  const body =
    tlv("00", "01") + tlv("26", ma) + tlv("52", "0000") + tlv("53", "986") +
    (valor ? tlv("54", Number(valor).toFixed(2)) : "") +
    tlv("58", "BR") + tlv("59", limparTexto(nome, 25)) +
    tlv("60", limparTexto(cidade, 15)) + tlv("62", ad) + "6304";
  return body + crc16(body);
}

export function qrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(text)}&size=500x500&margin=10&ecc=H&format=png`;
}
