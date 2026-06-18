-- Configuração da licença do sistema (chave Pix do dono, valor da mensalidade, validade)
CREATE TABLE IF NOT EXISTS licenca_config (
  id                 int PRIMARY KEY DEFAULT 1,
  chave_pix          text DEFAULT '',
  tipo_chave         text DEFAULT 'aleatoria',
  nome_beneficiario  text DEFAULT 'Elta Variedades',
  cidade             text DEFAULT 'Fortaleza',
  valor_mensalidade  numeric(10,2) DEFAULT 0,
  dias_validade      int DEFAULT 30,
  CONSTRAINT licenca_config_unica CHECK (id = 1)
);
INSERT INTO licenca_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE licenca_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso total autenticado" ON licenca_config
  FOR ALL USING (auth.role() = 'authenticated');

-- Histórico de pagamentos da licença — cada pagamento renova por "dias_validade" dias
-- a partir da data do pagamento
CREATE TABLE IF NOT EXISTS pagamentos_licenca (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data        date NOT NULL,
  valor       numeric(10,2) NOT NULL DEFAULT 0,
  observacao  text,
  criado_em   timestamptz DEFAULT now()
);

ALTER TABLE pagamentos_licenca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acesso total autenticado" ON pagamentos_licenca
  FOR ALL USING (auth.role() = 'authenticated');

-- Garante que o sistema comece liberado por 30 dias a partir de hoje
-- (sem isso, o sistema ficaria bloqueado assim que essa tabela for criada)
INSERT INTO pagamentos_licenca (data, valor, observacao)
SELECT CURRENT_DATE, 0, 'Liberação inicial do sistema'
WHERE NOT EXISTS (SELECT 1 FROM pagamentos_licenca);
