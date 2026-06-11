# Loja Joselane — Sistema de Gerenciamento de Loja de Roupas

Sistema moderno e completo para gerenciar loja de roupas, feito com **Next.js + Supabase**, pronto para publicar na **Vercel**.

## Funcionalidades

- 🔐 **Login** com e-mail e senha (Supabase Auth)
- 📊 **Dashboard** — vendas do mês, peças em estoque, alertas de estoque baixo
- 👗 **Produtos** — cadastro de roupas (tamanho, cor, categoria, custo, venda, estoque)
- 📥 **Importar XML** — lê a NFe (XML) que o fornecedor manda e joga as roupas direto no estoque, com margem de lucro configurável
- 🧾 **Notas / Vendas** — gera notas escolhendo entre **todas as roupas do sistema** (busca rápida), com desconto, forma de pagamento, baixa automática de estoque e impressão
- 👥 **Clientes** — cadastro completo, vinculado às notas

## Como publicar

Veja o passo a passo em **[COMO-PUBLICAR.md](COMO-PUBLICAR.md)**.

## Estrutura

```
src/app/login        → tela de login
src/app/(app)/dashboard  → visão geral
src/app/(app)/produtos   → estoque de roupas
src/app/(app)/importar   → importação de XML de NFe
src/app/(app)/notas      → vendas e notas (com impressão)
src/app/(app)/clientes   → clientes
supabase/schema.sql      → banco de dados (rodar no Supabase)
```
