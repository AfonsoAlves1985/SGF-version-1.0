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
  - Fornecedor
  - Dt. Aquis.
  - Ano Aquis.
  - Vlr. Custo

## Edicao
- Edicao inline em todas as colunas.
- Data com mascara `DD-MM-YYYY` + calendario.
- Conta, Centro de Custo e Local com selecao de lista.
- Opcao `+ Novo departamento` ao final da lista.

## Persistencia de departamentos
- Novos valores salvos ao salvar item/edicao.
- Opcoes da lista sao recalculadas a partir dos dados existentes da unidade.

## SQL e dependencia de banco
- Tabelas:
  - `inventory_spaces`
  - `inventory_assets`
- Migracao: `drizzle/0005_inventory_units_assets.sql`
- Depende de [[Deploy e Validacao]] para aplicacao no ambiente.

## Dependencias cruzadas
- Herda regras de acesso de [[Regras de Permissao e Seguranca]] para futuras restricoes finas.
