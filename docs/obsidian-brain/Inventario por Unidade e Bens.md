# Inventario por Unidade e Bens

## Estrutura funcional
- Unidade (filial) como agrupador.
- Cada unidade tem sua propria tabela de bens.
- Colunas implementadas:
  - Filial
  - Nr. bem
  - Descricao
  - Marca
  - Modelo
  - Conta
  - Centro de Custo
  - Local
  - Responsavel (opcional)
  - Fornecedor
  - Dt. Aquis.
  - Ano Aquis.
  - Vlr. Custo

## Edicao
- Edicao inline em todas as colunas.
- Data com mascara `DD-MM-YYYY` + calendario.
- Conta, Centro de Custo e Local com selecao de lista.
- Opcao `+ Novo departamento` ao final da lista.
- Responsavel pode ser preenchido/alterado sem ser campo obrigatorio.

## Persistencia de departamentos
- Novos valores salvos ao salvar item/edicao.
- Opcoes da lista sao recalculadas a partir dos dados existentes da unidade.

## SQL e dependencia de banco
- Tabelas:
  - `inventory_spaces`
  - `inventory_assets`
- Migracao: `drizzle/0005_inventory_units_assets.sql`
- Migracao complementar: `drizzle/0007_inventory_assets_responsavel.sql`
- Depende de [[Deploy e Validacao]] para aplicacao no ambiente.

## Importacao de dados
- Script: `scripts/import-inventory-assets-febracis-pa.ts`.
- Suporta TSV (stdin) e CSV por URL.
- Mapeamento de planilha em colunas A..N, incluindo responsavel.
- Fluxo de upsert por chave (`spaceId + nrBem + descricao`).

## Dependencias cruzadas
- Herda regras de acesso de [[Regras de Permissao e Seguranca]] para futuras restricoes finas.
- Em producao, validar junto com [[Pos-migracao Banco e Servidor]].

## Veja tambem
- [[Tema Visual Azul]]
- [[SGF Brain - Index]]
