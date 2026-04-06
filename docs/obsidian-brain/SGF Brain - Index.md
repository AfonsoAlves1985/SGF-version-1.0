# SGF Brain - Index

## Mapa central
- [[Acessos e Convites]]
- [[Regras de Permissao e Seguranca]]
- [[Inventario por Unidade e Bens]]
- [[Tema Visual Azul]]
- [[Deploy e Validacao]]

## Dependencias principais
- [[Acessos e Convites]] depende de [[Regras de Permissao e Seguranca]] para bloquear autoexclusao e proteger owner.
- [[Inventario por Unidade e Bens]] depende de [[Deploy e Validacao]] para aplicar migracoes SQL e disponibilizar tabelas.
- [[Tema Visual Azul]] impacta a leitura visual de [[Acessos e Convites]] e [[Inventario por Unidade e Bens]].

## Ordem de leitura recomendada
1. [[Regras de Permissao e Seguranca]]
2. [[Acessos e Convites]]
3. [[Inventario por Unidade e Bens]]
4. [[Tema Visual Azul]]
5. [[Deploy e Validacao]]

## Historico rapido de entregas
- Convites por link no login e uso unico do token.
- Owner como superadmin e bloqueio de exclusao do owner.
- Admin com acesso ao modulo de permissao (sem poder excluir usuarios).
- Inventario com unidades e tabela por unidade.
- Edicao inline de colunas e selecao guiada para departamento.
