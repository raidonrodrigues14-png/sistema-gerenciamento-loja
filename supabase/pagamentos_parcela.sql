-- Tabela de pagamentos parciais de parcelas
CREATE TABLE IF NOT EXISTS pagamentos_parcela (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parcela_id  uuid REFERENCES parcelas(id) ON DELETE CASCADE NOT NULL,
  data        date NOT NULL,
  valor       numeric(10,2) NOT NULL,
  forma       text NOT NULL,
  observacao  text,
  criado_em   timestamptz DEFAULT now()
);

-- Habilita RLS igual às outras tabelas
ALTER TABLE pagamentos_parcela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acesso total autenticado" ON pagamentos_parcela
  FOR ALL USING (auth.role() = 'authenticated');
