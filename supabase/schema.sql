-- =============================================================
-- SISTEMA DE GERENCIAMENTO DE LOJA DE ROUPAS
-- Execute este arquivo no Supabase: SQL Editor > New query > colar > Run
-- =============================================================

-- PRODUTOS (roupas)
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  nome text not null,
  categoria text default 'Geral',
  tamanho text,
  cor text,
  preco_custo numeric(10,2) default 0,
  preco_venda numeric(10,2) not null default 0,
  estoque integer not null default 0,
  ncm text,
  fornecedor text,
  criado_em timestamptz default now()
);

-- CLIENTES
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  endereco text,
  criado_em timestamptz default now()
);

-- NOTAS (vendas / notas geradas)
create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nome text default 'Consumidor Final',
  subtotal numeric(10,2) not null default 0,
  desconto numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  forma_pagamento text default 'Dinheiro',
  observacao text,
  criado_em timestamptz default now()
);

-- ITENS DAS NOTAS
create table if not exists nota_itens (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references notas(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  descricao text not null,
  quantidade integer not null default 1,
  preco_unit numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0
);

-- NOTAS DE ENTRADA (XML importados do fornecedor)
create table if not exists entradas_xml (
  id uuid primary key default gen_random_uuid(),
  chave text,
  fornecedor text,
  numero_nfe text,
  total numeric(10,2) default 0,
  qtd_itens integer default 0,
  criado_em timestamptz default now()
);

-- Função para baixar estoque ao vender
create or replace function baixar_estoque(p_produto_id uuid, p_qtd integer)
returns void language sql as $$
  update produtos set estoque = estoque - p_qtd where id = p_produto_id;
$$;

-- Segurança (RLS): apenas usuários logados acessam
alter table produtos enable row level security;
alter table clientes enable row level security;
alter table notas enable row level security;
alter table nota_itens enable row level security;
alter table entradas_xml enable row level security;

create policy "auth_all_produtos" on produtos for all to authenticated using (true) with check (true);
create policy "auth_all_clientes" on clientes for all to authenticated using (true) with check (true);
create policy "auth_all_notas" on notas for all to authenticated using (true) with check (true);
create policy "auth_all_nota_itens" on nota_itens for all to authenticated using (true) with check (true);
create policy "auth_all_entradas_xml" on entradas_xml for all to authenticated using (true) with check (true);
