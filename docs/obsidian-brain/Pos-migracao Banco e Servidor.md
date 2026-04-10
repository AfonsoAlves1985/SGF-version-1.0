# Pos-migracao Banco e Servidor

## Objetivo
- Consolidar checklist e estado operacional apos troca para novo banco e novo servico de servidor.

## Banco (novo Supabase)
- `DATABASE_URL` deve apontar para o projeto novo.
- Aplicar migracoes pendentes antes de abrir operacao:
  - `pnpm db:push`
- Validar existencia de tabelas e colunas recentes:
  - `inventory_assets.responsavel`
  - campos externos de compras em `purchase_requests`

## Servidor (novo servico)
- Render:
  - `render.yaml` com `startCommand: pnpm start`
  - `NODE_ENV=production`
  - `healthCheckPath: /healthz`
- Docker:
  - `Dockerfile` multi-stage
  - runtime com `NODE_ENV=production`
  - `CMD` forcando `NODE_ENV=production node dist/index.js`

## Variaveis obrigatorias em producao
- `DATABASE_URL`
- `JWT_SECRET`
- `FRZ_PURCHASE_CALLBACK_TOKEN` (integracao compras)

## Variaveis recomendadas (compras FRZ COUNT)
- `FRZ_PURCHASE_CALLBACK_URL`
- `FRZ_PURCHASE_CALLBACK_PATH` (quando nao usar o padrao)

## Validacao pos-corte
- Health:
  - `GET /healthz` retorna 200.
- Smoke:
  - `pnpm smoke:modules`
- Fluxo funcional:
  - login e convites
  - inventario (com responsavel)
  - solicitacao de compras + webhook
  - callback FRZ COUNT (`approved/rejected`)
  - logs de auditoria

## Rollback rapido
- Reapontar `DATABASE_URL` para o banco anterior.
- Reimplantar servico backend.
- Revalidar `/healthz` e login.

## Referencias
- [[Deploy e Validacao]]
- [[Compras e Integracao FRZ COUNT]]
- [[Acessos e Convites]]
- [[Inventario por Unidade e Bens]]
