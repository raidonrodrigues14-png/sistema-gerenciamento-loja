# 🚀 Como publicar o sistema (Supabase + Vercel)

Siga os passos na ordem. Leva uns 15 minutos no total.

---

## PARTE 1 — Supabase (banco de dados)

1. Acesse **https://supabase.com** e crie uma conta (pode usar o Google).
2. Clique em **New Project**:
   - Nome: `elta-variedades`
   - Database Password: crie uma senha forte e **guarde**
   - Region: `South America (São Paulo)`
3. Espere o projeto criar (1-2 min).
4. No menu lateral, clique em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` desta pasta, **copie tudo**, cole no editor e clique em **Run**. Deve aparecer "Success".
6. No menu lateral, vá em **Project Settings** (engrenagem) → **API** e copie:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public key** (um texto longo)

### Criar seu usuário de login
7. No menu lateral: **Authentication** → **Users** → **Add user** → **Create new user**.
   - Coloque seu e-mail e uma senha
   - Marque **Auto Confirm User** ✅
   - Esse será o login para entrar no sistema.

---

## PARTE 2 — Subir o código no GitHub

1. Crie uma conta em **https://github.com** (se não tiver).
2. Instale o **GitHub Desktop**: https://desktop.github.com
3. No GitHub Desktop: **File → Add local repository** → escolha esta pasta do projeto.
   - Se pedir para criar repositório, aceite.
4. Escreva uma mensagem (ex: "primeira versão") → **Commit** → **Publish repository**.
   - Pode deixar como **privado** ✅

---

## PARTE 3 — Vercel (colocar no ar)

1. Acesse **https://vercel.com** e entre com a conta do **GitHub**.
2. Clique em **Add New → Project**.
3. Selecione o repositório `elta-variedades` (ou o nome que você deu) → **Import**.
4. Antes de clicar em Deploy, abra **Environment Variables** e adicione as duas:

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | a Project URL que você copiou |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a anon public key que você copiou |

5. Clique em **Deploy** e aguarde (~2 min).
6. Pronto! A Vercel vai te dar um link tipo `https://elta-variedades.vercel.app` — esse é o endereço do seu sistema. Acesse e entre com o e-mail/senha que criou no passo 7 da Parte 1.

---

## 💻 Rodar no seu computador (opcional, para testar)

1. Instale o **Node.js**: https://nodejs.org (versão LTS)
2. Copie o arquivo `.env.local.example` para `.env.local` e preencha com a URL e a chave do Supabase.
3. Nesta pasta, abra o terminal e rode:
   ```
   npm install
   npm run dev
   ```
4. Abra http://localhost:3000

---

## ❓ Dúvidas comuns

- **Esqueci a senha do sistema** → Supabase → Authentication → Users → clique no usuário → Reset password.
- **Atualizei o código, como publicar de novo?** → Basta fazer Commit + Push no GitHub Desktop; a Vercel publica sozinha.
- **O XML do fornecedor não importa** → confira se o arquivo é o XML da NFe (não o PDF/DANFE).
