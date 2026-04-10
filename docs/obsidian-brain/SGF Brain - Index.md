# SGF Brain - Index

## Mapa central
- [[Acessos e Convites]]
- [[Regras de Permissao e Seguranca]]
- [[Inventario por Unidade e Bens]]
- [[Compras e Integracao FRZ COUNT]]
- [[Assistente Mr. Thinkker]]
- [[Descontinuacao do Modulo Contratos]]
- [[Pos-migracao Banco e Servidor]]
- [[Linha do Tempo de Entregas]]
- [[Padrao de Links do Brain]]
- [[Tema Visual Azul]]
- [[Deploy e Validacao]]

## Dependencias principais
- [[Acessos e Convites]] depende de [[Regras de Permissao e Seguranca]] para bloquear autoexclusao e proteger owner.
- [[Inventario por Unidade e Bens]] depende de [[Deploy e Validacao]] para aplicar migracoes SQL e disponibilizar tabelas.
- [[Compras e Integracao FRZ COUNT]] depende de [[Deploy e Validacao]] para variaveis de ambiente, callback e testes de ponta a ponta.
- [[Assistente Mr. Thinkker]] conecta consultas em linguagem natural aos dados dos modulos e respeita regras de seguranca.
- [[Descontinuacao do Modulo Contratos]] impacta navegacao e indicadores do dashboard.
- [[Pos-migracao Banco e Servidor]] consolida checklist operacional de banco/servico apos corte.
- [[Linha do Tempo de Entregas]] consolida a evolucao do projeto por fases.
- [[Padrao de Links do Brain]] define regra de conectividade e nomenclatura das notas.
- [[Tema Visual Azul]] impacta a leitura visual de [[Acessos e Convites]] e [[Inventario por Unidade e Bens]].

## Ordem de leitura recomendada
1. [[Regras de Permissao e Seguranca]]
2. [[Acessos e Convites]]
3. [[Inventario por Unidade e Bens]]
4. [[Compras e Integracao FRZ COUNT]]
5. [[Assistente Mr. Thinkker]]
6. [[Descontinuacao do Modulo Contratos]]
7. [[Pos-migracao Banco e Servidor]]
8. [[Linha do Tempo de Entregas]]
9. [[Padrao de Links do Brain]]
10. [[Tema Visual Azul]]
11. [[Deploy e Validacao]]

## Historico rapido de entregas
- Convites por link no login e uso unico do token.
- Owner como superadmin e bloqueio de exclusao do owner.
- Admin com acesso ao modulo de permissao (sem poder excluir usuarios).
- Inventario com unidades e tabela por unidade.
- Edicao inline de colunas e selecao guiada para departamento.
- Inventario com campo opcional `responsavel` no cadastro, edicao inline, busca e logs.
- Integracao assincrona de solicitacao de compras com callback seguro do FRZ COUNT.
- Integracao de compras com idempotencia de callback e telemetria operacional.
- Retry de webhook (ate 3 tentativas) e visibilidade de integracao no frontend.
- Mr. Thinkker com conversa interativa, leitura ampla de dados e restricao de seguranca para Owner em consultas sensiveis.
- Modulo de contratos removido de rotas, menu, dashboard e API tRPC.
- Operacao pos-migracao documentada para novo banco e novo servico backend.

## Backlog enxuto (restante)
- Hardening de deploy (check automatico de envs criticas).
- Validacao funcional completa pos-deploy das ultimas entregas.
- Opcional (por ultimo): varredura ampla de codigo morto/legado.
