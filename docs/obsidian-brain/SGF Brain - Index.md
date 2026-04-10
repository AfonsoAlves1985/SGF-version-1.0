# SGF Brain - Index

## Mapa central
- [[Acessos e Convites]]
- [[Regras de Permissao e Seguranca]]
- [[Inventario por Unidade e Bens]]
- [[Compras e Integracao FRZ COUNT]]
- [[Descontinuacao do Modulo Contratos]]
- [[Pos-migracao Banco e Servidor]]
- [[Tema Visual Azul]]
- [[Deploy e Validacao]]

## Dependencias principais
- [[Acessos e Convites]] depende de [[Regras de Permissao e Seguranca]] para bloquear autoexclusao e proteger owner.
- [[Inventario por Unidade e Bens]] depende de [[Deploy e Validacao]] para aplicar migracoes SQL e disponibilizar tabelas.
- [[Compras e Integracao FRZ COUNT]] depende de [[Deploy e Validacao]] para variaveis de ambiente, callback e testes de ponta a ponta.
- [[Descontinuacao do Modulo Contratos]] impacta navegacao e indicadores do dashboard.
- [[Pos-migracao Banco e Servidor]] consolida checklist operacional de banco/servico apos corte.
- [[Tema Visual Azul]] impacta a leitura visual de [[Acessos e Convites]] e [[Inventario por Unidade e Bens]].

## Ordem de leitura recomendada
1. [[Regras de Permissao e Seguranca]]
2. [[Acessos e Convites]]
3. [[Inventario por Unidade e Bens]]
4. [[Compras e Integracao FRZ COUNT]]
5. [[Descontinuacao do Modulo Contratos]]
6. [[Pos-migracao Banco e Servidor]]
7. [[Tema Visual Azul]]
8. [[Deploy e Validacao]]

## Historico rapido de entregas
- Convites por link no login e uso unico do token.
- Owner como superadmin e bloqueio de exclusao do owner.
- Admin com acesso ao modulo de permissao (sem poder excluir usuarios).
- Inventario com unidades e tabela por unidade.
- Edicao inline de colunas e selecao guiada para departamento.
- Inventario com campo opcional `responsavel` no cadastro, edicao inline, busca e logs.
- Integracao assincrona de solicitacao de compras com callback seguro do FRZ COUNT.
- Modulo de contratos removido de rotas, menu, dashboard e API tRPC.
- Operacao pos-migracao documentada para novo banco e novo servico backend.
