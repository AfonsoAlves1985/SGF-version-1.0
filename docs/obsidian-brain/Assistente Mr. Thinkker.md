# Assistente Mr. Thinkker

## Objetivo
- Disponibilizar um assistente lateral global para consulta em linguagem natural.
- Responder com contexto da tela atual e sugerir acao imediata no sistema.

## Escopo atual (MVP funcional)
- Botao flutuante global com abertura em sidebar (sheet).
- Pergunta livre do usuario com envio para backend (`assistant.ask`).
- Respostas contextuais para:
  - Compras (solicitacoes)
  - Inventario (bens)
  - Manutencao (chamados)
  - Salas
  - Fornecedores
  - Consumiveis
  - Visao geral do sistema
- Acoes sugeridas:
  - navegar para modulo
  - aplicar filtro em Solicitacao de Compras

## Experiencia de conversa
- Resposta textual enriquecida no chat (resumo + blocos + destaque).
- Prompts rapidos para perguntas frequentes.
- Botao "Limpar" para iniciar nova conversa na mesma tela.
- Quando possivel, responde no chat sem obrigar abrir modulo.
- Mantem memoria operacional local (modulo preferido + termos frequentes) para melhorar follow-ups.
- Exibe profundidade da analise (`inicial`, `media`, `profunda`).

## Comportamento por modulo
- Compras:
  - interpreta termos de status (financeiro, aprovado, cancelado, rascunho)
  - detecta ideia de atraso/travado por dias
  - retorna itens mais relevantes e filtro sugerido
- Inventario:
  - busca por palavras-chave em nr bem, descricao, responsavel, fornecedor e local
  - suporta pergunta sobre itens sem responsavel
- Manutencao:
  - destaca chamados urgentes/alta prioridade
- Salas:
  - resume disponibilidade, uso e manutencao
- Fornecedores:
  - resume ativos/inativos e unidade vinculada
- Consumiveis:
  - identifica itens com reposicao necessaria
- Busca global:
  - faz varredura de leitura no sistema e agrupa resultados por modulo
  - devolve itens estruturados com `modulo`, `unidade` e `informacao` quando disponivel

## Capacidade de pesquisa
- Pesquisa profunda em multiplos modulos com consolidacao por relevancia.
- Usa historico curto da conversa para interpretar perguntas de continuidade.
- Sugere proximos passos em `followUps` para guiar a investigacao.

## Regra de seguranca
- Consultas de seguranca (usuarios, acessos e auditoria) sao restritas ao Owner.
- Para perfis nao-owner, o assistente informa bloqueio de acesso a esse tipo de consulta.

## Arquivos implementados
- `client/src/components/AssistantSidebar.tsx`
- `client/src/components/DashboardLayout.tsx`
- `server/routers.ts` (`assistant.ask`)
- `client/src/pages/PurchaseRequests.tsx` (recebe e aplica filtro do assistente)
- `scripts/smoke-modules.ts` (inclui validacao do `assistant.ask` no pos-deploy)

## Limites atuais
- Nao executa alteracoes destrutivas automaticamente.
- Nao substitui logs/auditoria formal; atua como copiloto de consulta.
- Acesso do assistente e de leitura para resposta rapida; sem escrita automatica em dados.
- Aprendizado e contextual (memoria local de uso), sem treino global do modelo.

## Proximas evolucoes sugeridas
- Persistir historico de perguntas e respostas por usuario.
- Expandir para Salas e Fornecedores com filtros nativos.
- Adicionar confirmacao explicita para qualquer acao de escrita futura.

## Dependencias
- Depende de [[Regras de Permissao e Seguranca]] para respeitar controles atuais.
- Depende de [[Deploy e Validacao]] para smoke dos fluxos assistidos.

## Veja tambem
- [[Compras e Integracao FRZ COUNT]]
- [[Inventario por Unidade e Bens]]
- [[Pos-migracao Banco e Servidor]]
- [[Acessos e Convites]]
- [[Tema Visual Azul]]
- [[Linha do Tempo de Entregas]]
- [[SGF Brain - Index]]
