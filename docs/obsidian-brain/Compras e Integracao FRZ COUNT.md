# Compras e Integracao FRZ COUNT

## Cenario
- O SGF envia solicitacoes de compra para o FRZ COUNT.
- A aprovacao/reprovacao acontece depois, por analise do gestor.
- O retorno e assincrono e volta para o SGF via callback HTTP.

## Saida SGF -> FRZ COUNT
- Procedimento: `purchaseRequests.sendWebhook`.
- Envia envelope com `event`, `requestId`, `actor`, `data` e `integration.callbackUrl`.
- `callbackUrl` depende de `FRZ_PURCHASE_CALLBACK_URL` no ambiente.

## Retorno FRZ COUNT -> SGF (callback)
- Endpoint padrao: `/api/integrations/frz-count/purchase-approvals`.
- Header obrigatorio: `Authorization: Bearer <FRZ_PURCHASE_CALLBACK_TOKEN>`.
- Payload minimo:
  - `requestId` ou `documentNumber`
  - `decision` (`approved`, `rejected`, `pending`)
- Campos opcionais: `externalRequestId`, `decidedBy`, `decidedAt`, `reason`, `message`.

## Regras de mapeamento
- `approved` -> `status=aprovado`, `financeApproved=true`.
- `rejected` -> `status=cancelado`, `financeApproved=false`.
- `pending` -> `status=financeiro`, `financeApproved=false`.

## Persistencia adicionada em `purchase_requests`
- `externalRequestId`
- `externalApprovalStatus`
- `externalApprovedBy`
- `externalApprovedAt`
- `externalApprovalReason`
- `externalApprovalPayload`

## Arquivos chave
- `server/routers.ts` (envio webhook de compras)
- `server/_core/index.ts` (endpoint callback FRZ COUNT)
- `server/_core/env.ts` (variaveis de ambiente)
- `server/db.ts` (aplicacao de decisao externa)
- `drizzle/0008_purchase_requests_external_approval.sql` (migracao)
- `docs/INTEGRACAO_FRZ_COUNT_SOLICITACOES_COMPRA.md` (contrato tecnico)

## Dependencias
- Depende de [[Deploy e Validacao]] para configurar token/path/url e testar callback.

## Veja tambem
- [[Pos-migracao Banco e Servidor]]
- [[SGF Brain - Index]]
