create table if not exists malinhas (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nome text not null,
  status text not null default 'aberta',
  observacao text,
  criado_em timestamptz default now(),
  fechado_em timestamptz
);

create table if not exists malinha_itens (
  id uuid primary key default gen_random_uuid(),
  malinha_id uuid not null references malinhas(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  descricao text not null,
  quantidade integer not null default 1,
  preco numeric(10,2) not null default 0,
  situacao text not null default 'enviado'
);

create table if not exists parcelas (
  id uuid primary key default gen_random_uuid(),
  nota_id uuid not null references notas(id) on delete cascade,
  numero integer not null,
  vencimento date not null,
  valor numeric(10,2) not null default 0,
  pago boolean not null default false,
  pago_em date
);

create table if not exists lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'saida',
  descricao text not null,
  categoria text default 'Geral',
  valor numeric(10,2) not null default 0,
  data date not null default current_date,
  pago boolean not null default true,
  criado_em timestamptz default now()
);

alter table malinhas enable row level security;
alter table malinha_itens enable row level security;
alter table parcelas enable row level security;
alter table lancamentos enable row level security;

create policy "auth_all_malinhas" on malinhas for all to authenticated using (true) with check (true);
create policy "auth_all_malinha_itens" on malinha_itens for all to authenticated using (true) with check (true);
create policy "auth_all_parcelas" on parcelas for all to authenticated using (true) with check (true);
create policy "auth_all_lancamentos" on lancamentos for all to authenticated using (true) with check (true);
