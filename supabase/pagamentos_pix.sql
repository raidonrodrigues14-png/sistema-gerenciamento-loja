-- Log/auditoria das cobranças Pix geradas pela AbacatePay.
-- Cada linha representa um QRCode Pix gerado na tela de pagamento.
-- Quando o cliente paga, o status muda para 'PAID' e a nota é criada/vinculada
-- automaticamente (ver tela Nova Nota e a página Fechamento de Caixa).
CREATE TABLE IF NOT EXISTS pagamentos_pix (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pix_id      text UNIQUE NOT NULL,        -- id retornado pela AbacatePay (ex: pix_char_123456)
  valor       numeric(10,2) NOT NULL DEFAULT 0,
  descricao   text,
  status      text NOT NULL DEFAULT 'PENDING', -- PENDING | PAID | EXPIRED | CANCELLED | REFUNDED
  dev_mode    boolean DEFAULT false,
  nota_id     uuid REFERENCES notas(id) ON DELETE SET NULL,
  cliente_nome text,
  criado_em   timestamptz DEFAULT now(),
  pago_em     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_pix_status ON pagamentos_pix(status);

ALTER TABLE pagamentos_pix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso total autenticado" ON pagamentos_pix
  FOR ALL USING (auth.role() = 'authenticated');
