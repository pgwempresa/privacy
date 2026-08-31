# Privacy Checkout

Checkout multi-idioma com painel administrativo, páginas públicas por modelo e pagamentos server-side. Preparado para Vercel + Supabase.

## O que já está pronto

- Idiomas e moedas: Brasil (`pt-BR`/BRL), Portugal (`pt-PT`/EUR) e México (`es-MX`/MXN).
- Gateways: NexusPag, WayMB e XPag.
- XPag México: SPEI/CLABE e referência OXXO.
- Planos mexicanos padrão: 1 mês por $99 MXN, 3 meses por $199 MXN e 6 meses por $329 MXN, com descontos exibidos.
- Upload direto de imagens e vídeos para o Supabase Storage, sem passar arquivos grandes pelas Functions da Vercel.
- Meta Pixel, TikTok Pixel, UTMfy e webhooks próprios.
- No fluxo XPag, o Meta Pixel dispara `Purchase` quando uma referência SPEI ou OXXO válida é gerada. A confirmação do pagamento continua registrada pelo webhook.
- Credenciais dos gateways ficam no banco e nunca são devolvidas ao navegador.

## Rodar localmente

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra `http://127.0.0.1:3000`. O servidor local usa `.data/` e lê `.env.local`; ambos são ignorados pelo Git.
O arquivo `dev-server.js` existe somente para desenvolvimento local; a Vercel usa os HTMLs, `vercel.json` e as funções da pasta `api/`.

Para executar os testes:

```bash
npm test
```

## Configurar o Supabase

Crie um projeto no Supabase e execute, nesta ordem, no SQL Editor:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_gateways.sql`

As migrações criam as tabelas `models`, `gateway_settings` e `deposits`, além do bucket público `model-images`. As tabelas administrativas usam RLS e são acessadas pela API com a service role.

## Variáveis da Vercel

Cadastre em **Project Settings → Environment Variables**:

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `ADMIN_USERNAME` | sim | Usuário do painel |
| `ADMIN_PASSWORD` | sim | Senha forte do painel |
| `JWT_SECRET` | sim | Assinatura da sessão; use um valor aleatório longo |
| `SUPABASE_URL` | sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave server-side; nunca exponha no front-end |
| `PUBLIC_BASE_URL` | recomendado | URL final, por exemplo `https://seudominio.com`, usada nos callbacks |

O arquivo `.env.example` serve como modelo. Não envie `.env.local` ao Git.

## Primeiro deploy na Vercel

1. Importe o repositório GitHub na Vercel.
2. Configure as variáveis acima para **Production** (e Preview, se usar previews).
3. Faça o deploy e, se houver domínio próprio, defina `PUBLIC_BASE_URL` com esse domínio e redeploy.
4. Entre em `/admin/integracoes` e salve as credenciais de NexusPag, WayMB e/ou XPag.
5. Na XPag, confirme conta de produção habilitada para SPEI e OXXO. A aplicação envia automaticamente o webhook de cada cobrança. Consulte a [documentação oficial da XPag](https://xpagamentos.com/docs).
6. Configure os Pixel IDs, UTMfy e URLs de notificação no mesmo painel.
7. Crie uma página de teste e valide uma geração SPEI e uma OXXO com credenciais de produção antes de liberar tráfego.

## Checklist antes de anunciar

- Domínio e HTTPS funcionando.
- Migrações executadas no Supabase.
- Bucket `model-images` criado e público.
- Senha administrativa exclusiva e `JWT_SECRET` forte.
- Credenciais de produção dos gateways salvas.
- SPEI retornando CLABE/referência válida e OXXO retornando referência/código de barras.
- Webhooks dos gateways chegando ao domínio de produção.
- Meta Pixel conferido no Events Manager: `Purchase` na geração de SPEI/OXXO.
- Política de privacidade, termos, suporte e regras de reembolso publicados para o negócio.
- Retenção e tratamento dos dados do pagador revisados conforme a legislação aplicável.

## Rotas principais

| Rota | Acesso | Finalidade |
| --- | --- | --- |
| `/login` | público | Login administrativo |
| `/admin` | admin | Lista de páginas/modelos |
| `/admin/edit/:slug` | admin | Editor |
| `/admin/integracoes` | admin | Gateways e rastreamento |
| `/m/:slug` | público | Página de checkout |
| `/api/deposits` | público | Criação de cobrança |
| `/api/webhooks/waymb` | gateway | Atualização WayMB |
| `/api/webhooks/nexuspag` | gateway | Atualização NexusPag |
| `/api/webhooks/xpag` | gateway | Atualização SPEI/OXXO |

## Observações de segurança

`SUPABASE_SERVICE_ROLE_KEY`, segredos dos gateways e tokens nunca devem ser colocados em HTML/JS público. O painel permite um script personalizado no `<head>`; trate esse campo como código com privilégio total e dê acesso administrativo apenas a pessoas confiáveis.
