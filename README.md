# Loja Joselane — Sistema de Gerenciamento de Loja de Roupas

Sistema moderno e completo para gerenciar loja de roupas, feito com **Next.js + Supabase**, pronto para publicar na **Vercel**.

## Funcionalidades

- 🔐 **Login** com e-mail e senha (Supabase Auth)
- 📊 **Dashboard** — vendas do mês, peças em estoque, alertas de estoque baixo
- 👗 **Produtos** — cadastro de roupas (tamanho, cor, categoria, custo, venda, estoque)
- 📥 **Importar XML** — lê a NFe (XML) que o fornecedor manda e joga as roupas direto no estoque, com margem de lucro configurável
- 🧾 **Notas / Vendas** — gera notas escolhendo entre **todas as roupas do sistema** (busca rápida), com desconto, forma de pagamento, baixa automática de estoque e impressão
- 👥 **Clientes** — cadastro completo, vinculado às notas
- 📐 **Grade de tamanhos e cores** — cria todas as variações da peça de uma vez
- 🏷️ **Etiquetas** — impressão de etiquetas com código de barras e preço
- 👜 **Malinhas (fashion delivery)** — peças enviadas para o cliente provar em casa; ao fechar, gera a nota do que foi comprado
- 💳 **Crediário** — venda parcelada no carnê com controle de parcelas pagas e vencidas
- 💰 **Financeiro** — fluxo de caixa do mês: vendas, parcelas recebidas, despesas e receitas manuais

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
src/app/(app)/malinhas   → fashion delivery
src/app/(app)/crediario  → parcelas do carnê
src/app/(app)/financeiro → fluxo de caixa
src/app/(app)/etiquetas  → etiquetas com código de barras
supabase/schema.sql          → banco de dados (rodar no Supabase)
supabase/atualizacao-2.sql   → tabelas novas (rodar depois do schema.sql)
```
