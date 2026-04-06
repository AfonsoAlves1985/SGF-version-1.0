# Deploy e Validacao

## Pre-requisitos
- Banco com `DATABASE_URL` valido.
- Build passando (`pnpm check` e `pnpm build`).

## Banco de dados
- Aplicar mudancas de schema/migracao.
- Garantir existencia de:
  - `inventory_spaces`
  - `inventory_assets`
  - `user_invitations` (convites)

## Smoke recomendados
- Convite:
  - gerar link
  - cadastrar usuario convidado
  - tentar reusar token (deve falhar)
- Inventario:
  - criar unidade
  - cadastrar bem
  - editar inline
  - usar lista de Conta/Centro de Custo/Local
  - selecionar `+ Novo departamento`

## Dependencias
- Garante funcionamento de [[Acessos e Convites]].
- Garante funcionamento de [[Inventario por Unidade e Bens]].
