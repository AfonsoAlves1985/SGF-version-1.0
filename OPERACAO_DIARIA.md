# Checklist diario de saude (2 minutos)

Objetivo: validar rapidamente se o SGF online esta saudavel.

Horario recomendado: entre **10:00 e 16:00 (BRT)**.

## Passo a passo

1. Abrir `https://sgf-online.onrender.com/healthz` e confirmar resposta HTTP 200.
2. Na raiz do projeto, executar:
   - exportar credenciais de smoke:
     - `SMOKE_USER=<usuario>`
     - `SMOKE_PASSWORD=<senha>`
   - `pnpm health:daily`
3. Confirmar no resultado:
   - `failures=0`
   - `schema_related_failures=0`
4. Abrir o app e fazer login de validacao.
5. Verificar rapidamente Dashboard, Salas e Contratos.

## Acao se falhar

- Falha de auth: validar `JWT_SECRET` no Render.
- Falha de modulo/schema: validar `DATABASE_URL` do Render e aplicar migracoes no banco correto.
- Falha intermitente de rede/5xx: repetir em 5 minutos antes de agir.

## Automacao no GitHub

- O workflow `Daily SGF Health Check` roda 1x por dia para lembrar e validar automaticamente.
- Tambem pode ser executado manualmente em **Actions > Daily SGF Health Check > Run workflow**.
- Para smoke autenticado no Actions, configurar secrets `SMOKE_USER` e `SMOKE_PASSWORD`.
