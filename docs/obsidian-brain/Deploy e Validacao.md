# Deploy e Validacao

## Pre-requisitos
- Banco com `DATABASE_URL` valido.
- Build passando (`pnpm check` e `pnpm build`).
- Servico de servidor em producao com `NODE_ENV=production`.
- Validar env critico antes do deploy: `pnpm deploy:check-env`.

## Banco de dados
- Aplicar mudancas de schema/migracao.
- Garantir existencia de:
  - `inventory_spaces`
  - `inventory_assets`
  - `user_invitations` (convites)
  - campos externos em `purchase_requests` (callback FRZ COUNT)

## Pos-migracao para novo banco
- Roteiro: `docs/MIGRACAO_SUPABASE_JANELA.md`.
- Script oficial: `scripts/migrate-supabase-maintenance.sh`.
- Script npm: `pnpm db:migrate:supabase`.
- Trocar `DATABASE_URL` no ambiente e reimplantar backend.

## Smoke recomendados
- Convite:
  - gerar link
  - cadastrar usuario convidado
  - tentar reusar token (deve falhar)
- Inventario:
  - criar unidade
  - cadastrar bem
  - preencher `responsavel` (opcional)
  - editar inline
  - usar lista de Conta/Centro de Custo/Local
  - selecionar `+ Novo departamento`
- Compras + FRZ COUNT:
  - enviar solicitacao com webhook configurado
  - validar recebimento no FRZ COUNT
  - simular callback `approved` e confirmar status `aprovado`
  - simular callback `rejected` e confirmar status `cancelado`
- Assistente Mr. Thinkker:
  - perguntar "visao geral do sistema" e validar resposta com metricas no chat
  - validar resposta por modulo sem navegacao forcada
  - validar acao "Aplicar filtro sugerido" em compras
  - validar botao "Limpar" para reiniciar conversa
  - validar bloqueio de consultas sensiveis para nao-owner

## Variaveis de ambiente de integracao
- `FRZ_PURCHASE_CALLBACK_TOKEN` (obrigatoria)
- `FRZ_PURCHASE_CALLBACK_PATH` (opcional)
- `FRZ_PURCHASE_CALLBACK_URL` (opcional, recomendada)

## Status atual (aguardando deploy)
- Bloco recente enviado para `main` com:
  - Hardening de env em deploy (`deploy:check-env`)
  - Fluxo pos-deploy automatizado (`deploy:postcheck`)
  - Smoke atualizado para modulos ativos e `assistant.ask`
- Aguardar deploy e executar `pnpm deploy:postcheck`.

## Servidor / Deploy
- Render: validar `render.yaml` com `healthCheckPath: /healthz` e `startCommand: pnpm start`.
- Docker: imagem multi-stage com runtime em `NODE_ENV=production`.
- Sempre confirmar `GET /healthz` apos deploy.
- Pos-deploy automatizado: `pnpm deploy:postcheck`.

## Automacao de validacao
- Script de hardening de env: `scripts/validate-deploy-env.ts`.
- Script de smoke: `scripts/smoke-modules.ts`.
- `deploy:postcheck` combina validacao de env + smoke dos modulos principais.

## Dependencias
- Garante funcionamento de [[Acessos e Convites]].
- Garante funcionamento de [[Inventario por Unidade e Bens]].
- Garante funcionamento de [[Compras e Integracao FRZ COUNT]].
- Garante funcionamento de [[Assistente Mr. Thinkker]].
- Considerar [[Descontinuacao do Modulo Contratos]] para nao validar fluxos removidos.
- Complementa [[Pos-migracao Banco e Servidor]].

## Veja tambem
- [[Regras de Permissao e Seguranca]]
- [[Tema Visual Azul]]
- [[Assistente Mr. Thinkker]]
- [[Linha do Tempo de Entregas]]
- [[SGF Brain - Index]]
