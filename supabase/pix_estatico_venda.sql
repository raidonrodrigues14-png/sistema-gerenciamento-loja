-- Configuração da chave Pix estática usada na tela de Venda (Nova Venda).
-- É a mesma chave Pix da conta bancária da loja/cliente — usada para gerar um
-- QR Code fixo (sem AbacatePay), com confirmação manual da venda.
CREATE TABLE IF NOT EXISTS config_pix_venda (
  id          int PRIMARY KEY DEFAULT 1,
  chave_pix   text DEFAULT '',
  tipo_chave  text DEFAULT 'aleatoria',
  nome_loja   text DEFAULT 'Elta Variedades',
  cidade_loja text DEFAULT 'Fortaleza',
  CONSTRAINT config_pix_venda_unica CHECK (id = 1)
);
INSERT INTO config_pix_venda (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE config_pix_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso total autenticado" ON config_pix_venda
  FOR ALL USING (auth.role() = 'authenticated');
