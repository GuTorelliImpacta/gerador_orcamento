# Orçamento Rápido para Oficinas

Web app responsivo (mobile-first, instalável como PWA) para donos de oficinas mecânicas criarem **orçamentos em PDF com a marca da própria oficina em menos de 2 minutos** — e entregarem o PDF pronto para o cliente (download, WhatsApp ou link público).

**Stack:** Next.js 16 (App Router) · TypeScript estrito · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage) · `@react-pdf/renderer` (PDF gerado no navegador) · TanStack Query · react-hook-form + zod · Vitest.

## O que o app faz

| Área | Recursos |
| --- | --- |
| Acesso | Login por link no e-mail (sem senha) · cada usuário tem a sua oficina, isolada por RLS |
| Onboarding | 3 passos (pulável): dados da oficina com busca de endereço por CEP e logo (redimensionada no navegador, ≤ 500 KB) → valores padrão → escolha do layout com pré-visualização |
| Novo orçamento | Wizard de 4 etapas com **rascunho salvo automaticamente**: veículo/cliente (placa preenche tudo se o carro já passou por aqui, máscara antiga/Mercosul, busca FIPE opcional) → itens (catálogo com busca, arrastar para reordenar, totais ao vivo) → condições → revisão e envio |
| PDF | 3 layouts (clássico, moderno, compacto), cores/fonte/blocos configuráveis, quebra de página com cabeçalho repetido, rodapé "página X de Y", nome `Orcamento-{numero}-{placa}.pdf` |
| Envio | **Baixar PDF** · **WhatsApp** (menu nativo de compartilhar no celular; no computador baixa o PDF e abre o `wa.me` com a mensagem pronta) · **Copiar link** (página pública `/o/{token}` onde o cliente vê e baixa o PDF) |
| Dashboard | Indicadores do mês, busca por placa/cliente, filtro por status, duplicar, aprovar/recusar, baixar PDF direto da lista |
| Cadastros | Modelos de veículo, catálogo de peças/serviços (importação por CSV), clientes (com exclusão LGPD) — o catálogo "aprende" com cada item digitado |

Regras importantes: valores em **centavos** no banco · o orçamento **congela** valor/hora, desconto e preços (mudar as configurações não altera orçamentos antigos) · peças fornecidas pelo cliente aparecem no PDF mas não somam no total.

---

## 1. Rodar localmente

Pré-requisitos: Node.js 20+ (recomendado 22) e npm.

```bash
git clone https://github.com/GuTorelliImpacta/gerador_orcamento.git
cd gerador_orcamento
npm install
cp .env.example .env.local      # preencha com as chaves do seu projeto Supabase (passo 2)
npm run dev                     # http://localhost:3000
```

Comandos úteis:

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Vitest (cálculos, máscaras, validação de CPF/CNPJ, CSV)
npm run build       # build de produção
```

## 2. Configurar o Supabase

Você precisa de **um projeto Supabase** (grátis serve para começar).

1. Em <https://supabase.com/dashboard> crie um projeto (região `South America (São Paulo)` é a mais próxima).
2. **Aplique as migrations** da pasta `supabase/migrations/`, na ordem dos nomes (`20260929000001_…` até `…000006_…`). Duas formas:
   - **SQL Editor** do dashboard: abra cada arquivo, cole e rode, um por vez, em ordem; ou
   - **Supabase CLI**: `npx supabase login && npx supabase link --project-ref SEU_REF && npx supabase db push`.
3. **Chaves**: em *Project Settings → API* copie a **Project URL** e a **publishable key** (`sb_publishable_…`; a *anon key* legada também funciona) para o `.env.local` / Vercel. Não existe chave secreta no cliente — a segurança vem do RLS.
4. **Autenticação** (*Authentication → URL Configuration*):
   - **Site URL**: a URL de produção (ex.: `https://seu-app.vercel.app`; localmente `http://localhost:3000`).
   - **Redirect URLs**: adicione `https://seu-app.vercel.app/**` e `http://localhost:3000/**`.
5. **Template do link mágico** (*Authentication → Email Templates → Magic Link*) — **necessário para o link funcionar no celular**, mesmo quando o e-mail abre em outro navegador. Troque o link do template por:

   ```html
   <h2>Seu acesso ao Orçamento Rápido</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Entrar no app</a></p>
   <p>Ou digite este código na tela de login: <strong>{{ .Token }}</strong></p>
   ```

   O link é montado a partir da **Site URL** (passo 4): se ela ainda estiver como `http://localhost:3000`, o link do e-mail abre uma página "localhost" e não funciona. O código de 6 dígitos funciona de qualquer forma, em qualquer navegador.
6. **E-mails em produção**: o remetente padrão do Supabase tem limite baixíssimo (poucos e-mails por hora) e serve só para testes. Antes de divulgar, configure um **SMTP próprio** em *Authentication → SMTP Settings* (Resend, Brevo, SendGrid, Amazon SES…).
7. *(Opcional)* Para ver dados de exemplo, entre no app e use **Configurações → Carregar exemplos** (10 peças, 5 serviços, 3 modelos). O arquivo `supabase/seed.sql` faz o mesmo em ambiente local.

### Testes do banco

`supabase/tests/rls.sql` (isolamento entre oficinas) e `supabase/tests/functions.sql` (numeração, catálogo que aprende, LGPD, página pública) rodam em uma transação e são desfeitos no final. Cole no SQL Editor: devem retornar `OK`.

---

## 3. Hospedar na Vercel — passo a passo

> Pré-requisito: o projeto Supabase já criado e com as migrations aplicadas (passo 2), e o código num repositório no GitHub (este repositório).

### 3.1 Importar o projeto

1. Acesse <https://vercel.com> e entre com sua conta do GitHub (crie uma conta grátis se precisar).
2. Clique em **Add New… → Project**.
3. Em *Import Git Repository* escolha **`gerador_orcamento`**. Se não aparecer, clique em *Adjust GitHub App Permissions* e autorize o repositório.
4. Na tela *Configure Project*:
   - **Framework Preset**: `Next.js` (detectado sozinho).
   - **Root Directory**: `./` (padrão).
   - **Build / Output / Install Command**: deixe os padrões.
   - **Branch de produção**: por padrão é a branch principal do repositório. Se o código ainda está só na branch `claude/new-session-ly8d0u`, faça o merge dela na principal (ou, em *Settings → Git → Production Branch*, aponte para ela).

### 3.2 Variáveis de ambiente

Ainda em *Configure Project*, abra **Environment Variables** e cadastre (marque *Production*, *Preview* e *Development*):

| Nome | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase (ex.: `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key (`sb_publishable_…`) ou anon key |

Clique em **Deploy** e aguarde (1–3 minutos). Ao terminar, a Vercel mostra a URL, algo como `https://gerador-orcamento.vercel.app`.

### 3.3 Voltar ao Supabase e liberar o domínio

Sem este passo o login por e-mail **não funciona** em produção.

1. No Supabase: *Authentication → URL Configuration*.
2. **Site URL** → a URL da Vercel (ex.: `https://gerador-orcamento.vercel.app`).
3. **Redirect URLs** → adicione `https://gerador-orcamento.vercel.app/**`. Para deploys de preview (branches/PRs) adicione também `https://*-SEU-USUARIO-OU-TIME.vercel.app/**`.
4. Confirme que o template do *Magic Link* foi trocado (passo 2.5) e que o SMTP próprio está configurado (2.6).

### 3.4 Testar em produção

1. Abra a URL da Vercel → você deve cair em `/login`.
2. Informe seu e-mail, abra o link recebido (pode ser no celular) → cai no onboarding.
3. Complete o onboarding (ou "Pular"), abra **Configurações → Carregar exemplos**.
4. Crie um orçamento em **+ Novo orçamento**, vá até a última etapa e clique em **Baixar PDF**. Teste também **Copiar link** e abra o link numa janela anônima: a página pública deve mostrar o orçamento e permitir baixar o PDF.
5. No celular, abra a URL e use *Adicionar à tela inicial* para instalar o app (PWA).

### 3.5 Domínio próprio (opcional)

1. Na Vercel: *Project → Settings → Domains → Add* e informe seu domínio (ex.: `orcamentos.suaoficina.com.br`).
2. Crie no seu provedor de DNS o registro que a Vercel indicar (`CNAME` para `cname.vercel-dns.com` em subdomínios, ou `A` em domínio raiz).
3. Depois que o domínio validar, **atualize a Site URL e as Redirect URLs no Supabase** (passo 3.3) para o novo domínio.

### 3.6 Atualizações

Cada `git push` na branch de produção gera um novo deploy automático; cada branch/PR gera um *preview*. Migrations novas **não** são aplicadas pela Vercel — rode-as no Supabase (passo 2.2) antes de publicar código que dependa delas.

### 3.7 Problemas comuns

| Sintoma | Causa provável e solução |
| --- | --- |
| Login: "Não foi possível enviar o link" | Limite de e-mails do Supabase (configure SMTP próprio) ou e-mail inválido |
| Clicar no link volta para `/login?erro=link` | Link expirado/usado, ou template do Magic Link não foi trocado (passo 2.5), ou domínio ausente nas *Redirect URLs* |
| Link do e-mail aponta para `localhost` | *Site URL* do Supabase ainda está como `http://localhost:3000` |
| Tela de "Bem-vindo" ou erro ao criar oficina | Migrations não foram aplicadas por completo (rode todas, na ordem) |
| Build falha na Vercel | Confira *Deployments → Build Logs*; rode `npm run build` localmente para reproduzir |
| PDF sem a logo | Logo em formato não suportado; reenvie em PNG ou JPG em *Configurações* |
| "Buscar FIPE" sem resultado | A BrasilAPI pode estar fora do ar; preencha o valor manualmente (o app segue funcionando) |

---

## Estrutura do projeto

```
src/app/            rotas (login, onboarding, (app)/ protegidas, o/[token] pública, auth/*)
src/components/     ui/, quote/ (wizard), pdf/, settings/, templates/, dashboard/, crud/
src/lib/            calculations.ts (+testes), masks.ts, format.ts, quote-service.ts,
                    pdf/ (document.tsx, build.ts, generate.ts), supabase/
src/proxy.ts        proteção de rotas + renovação da sessão (Next 16: "proxy" substitui "middleware")
supabase/           migrations/, seed.sql, tests/
```

## Limitações conhecidas

- **Fontes do PDF**: usa as fontes padrão do formato PDF (Helvetica, Times, Courier), que não são "embutidas" no arquivo. Para embutir fontes próprias, registre-as com `Font.register` em `src/lib/pdf/document.tsx`.
- **Validação no servidor**: os dados vão do navegador direto ao Supabase; a validação do servidor é feita pelas *constraints* e pelo RLS do Postgres (além do zod no cliente). Não há API própria.
- **Página pública**: quem tem o link (token aleatório e não adivinhável) vê o orçamento, incluindo os dados do cliente que constam nele. Rascunhos nunca são públicos.
- **Auditoria Lighthouse** e testes de ponta a ponta no navegador não foram executados neste ambiente de desenvolvimento (sem acesso de rede ao Supabase); rode-os após o deploy.
- A consulta **FIPE** usa a BrasilAPI e não pôde ser testada durante o desenvolvimento; o app tem fallback manual.

## Melhorias sugeridas para a próxima versão

- Busca de veículo por placa via API paga (preencher marca/modelo/ano/cor automaticamente)
- Aprovação do orçamento pelo cliente direto no link público (botões aprovar/recusar + assinatura)
- Envio automático por WhatsApp Business API e por e-mail
- Multiusuário por oficina (convites, papéis: dono, atendente, mecânico)
- Planos de assinatura (Stripe/Asaas) e limites por plano
- Fotos e anexos por orçamento (danos, peças), e histórico do veículo
- Fontes embutidas no PDF e QR Code de pagamento PIX no rodapé
- Relatórios (faturamento por período, ticket médio, peças mais usadas)
- Testes ponta a ponta (Playwright) e monitoramento de erros (Sentry)
