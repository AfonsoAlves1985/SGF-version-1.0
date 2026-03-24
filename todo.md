# SGA Grupo FRZ - TODO

## Fase 1: Arquitetura e Base de Dados
- [x] Implementar schema Drizzle com todas as tabelas
- [x] Gerar migrations SQL
- [x] Executar migrations na BD
- [x] Criar helpers de query em server/db.ts
- [x] Criar procedures tRPC para todos os módulos

## Fase 2: Design Visual e Componentes Base
- [x] Definir paleta de cores e tipografia
- [x] Configurar Tailwind CSS 4 com tema profissional
- [x] DashboardLayout com sidebar (já existe no template)
- [x] Implementar componentes base (cards, buttons, forms)
- [x] Configurar navegação principal

## Fase 3: Módulo de Inventário
- [ ] Criar tRPC procedures (list, create, update, delete, addMovement)
- [ ] Implementar página de listagem com filtros
- [ ] Implementar formulário de criação/edição
- [ ] Implementar histórico de movimentações
- [ ] Adicionar alertas de stock crítico

## Fase 3: Módulo de Escala
- [ ] Criar tRPC procedures (list, create, update, delete, generateSchedule)
- [ ] Implementar página com calendário visual
- [ ] Implementar atribuição manual por sector/turno
- [ ] Implementar geração automática de escala
- [ ] Adicionar visualização de turnos

## Fase 3: Módulo de Reserva de Salas
- [ ] Criar tRPC procedures (list, create, update, delete, checkAvailability)
- [ ] Implementar calendário visual com disponibilidade
- [ ] Implementar formulário de reserva
- [ ] Implementar visualização de status em tempo real
- [ ] Adicionar histórico de utilizações

## Fase 4: Módulo de Manutenção
- [ ] Criar tRPC procedures (list, create, update, delete, assign, complete)
- [ ] Implementar página de listagem com filtros por prioridade/status
- [ ] Implementar formulário de criação de chamado
- [ ] Implementar atribuição a técnicos
- [ ] Implementar histórico e conclusão com notas
- [ ] Adicionar priorização visual (cores por prioridade)

## Fase 4: Módulo de Fornecedores
- [ ] Criar tRPC procedures (list, create, update, delete)
- [ ] Implementar página de gestão de fornecedores
- [ ] Implementar gestão de contratos
- [ ] Adicionar alertas de vencimento próximo
- [ ] Implementar histórico de contratos

## Fase 4: Sistema de Notificações
- [ ] Configurar notificações para chamados urgentes
- [ ] Configurar alertas de stock baixo
- [ ] Configurar lembretes de vencimento de contratos
- [ ] Implementar UI para notificações (toast/bell icon)
- [ ] Adicionar histórico de notificações

## Fase 5: Dashboard Executivo
- [ ] Implementar KPI de economia (cálculo baseado em chamados resolvidos)
- [ ] Implementar KPI de chamados abertos
- [ ] Implementar KPI de ocupação de salas
- [ ] Implementar KPI de stock crítico
- [ ] Criar gráficos de tendências (Recharts)
- [ ] Implementar alertas prioritários

## Fase 5: Exportação de Relatórios
- [ ] Implementar exportação de inventário em PDF/Excel
- [ ] Implementar exportação de manutenção em PDF/Excel
- [ ] Implementar exportação de escala em PDF/Excel
- [ ] Implementar exportação de auditoria em PDF/Excel
- [ ] Adicionar filtros de data para relatórios

## Fase 6: Testes e Otimizações
- [ ] Escrever testes Vitest para procedures críticas
- [ ] Testar fluxos de autenticação
- [ ] Testar CRUD de cada módulo
- [ ] Otimizar queries de BD
- [ ] Testar responsividade em mobile
- [ ] Testar performance do dashboard

## Fase 4: Melhorias Adicionais
- [x] Adicionar funcionalidade de edição de salas cadastradas
- [x] Adicionar edição para módulo de Inventário
- [x] Adicionar edição para módulo de Escala
- [x] Adicionar edição para módulo de Manutenção
- [x] Adicionar edição para módulo de Fornecedores
- [ ] Adicionar histórico de movimentações de inventário com rastreamento de utilizador
- [ ] Implementar sistema de notificações em tempo real (stock baixo, chamados urgentes)
- [ ] Adicionar exportação de relatórios em PDF/Excel
- [ ] Implementar filtros avançados em todas as páginas
- [ ] Adicionar gráficos de tendências e análises

## Bugs Conhecidos
(Nenhum registado até ao momento)

## Fase 3: Implementar Páginas Funcionais
- [x] Página de Inventário com listagem, filtros e movimentações
- [x] Página de Escala com calendário e atribuição de turnos
- [x] Página de Salas com reservas e calendário visual
- [x] Página de Manutenção com listagem e priorização
- [x] Página de Fornecedores com gestão de contratos
- [x] Dashboard Executivo com métricas e gráficos
- [x] Navegação no DashboardLayout para todos os módulos
- [x] Corrigir erro 404 na Página 2 (agora é "Início")
- [x] Tornar quadros da página Início clicáveis com navegação funcional
- [x] Renomear projeto de SGA G4 Belém para SGA Grupo FRZ
- [x] Implementar tema dark com paleta de laranja vibrante
- [x] Adicionar logo FRZ nas telas de login e principal

## Fase 5: Melhorias de Autenticação
- [x] Remover tela 404 antes do login
- [x] Redirecionar utilizadores não autenticados para página de login

## Fase 6: Edição Inline
- [x] Implementar edição inline para Tipo em Manutenção
- [x] Implementar edição inline para Prioridade em Manutenção
- [x] Implementar edição inline para Status em Manutenção
- [x] Implementar edição inline para Data em Manutenção

## Fase 7: Edição Inline em Todos os Módulos
- [x] Implementar edição inline em Inventário
- [x] Implementar edição inline em Salas
- [x] Implementar edição inline em Escala
- [x] Implementar edição inline em Fornecedores

## Fase 8: Melhorias de Usabilidade
- [x] Adicionar criação de novos tipos de consumíveis inline na categoria do Inventário

## Fase 9: Sistema de Idiomas
- [x] Criar contexto de idioma com suporte a PT-PT, PT-BR, EN-US, ES
- [x] Implementar seletor de idioma com bandeiras no canto superior
- [x] Traduzir conteúdo de página Home para os 4 idiomas
- [x] Persistir escolha de idioma no localStorage

## Fase 10: Ajustes de UI
- [x] Corrigir seletor de idioma para mostrar apenas bandeiras
- [x] Adicionar logo com fundo transparente no header da página Home
- [x] Tornar seletor de idioma mais discreto e menor

## Fase 11: Correções Finais
- [x] Mover logo para o lugar de "Navigation" na sidebar
- [x] Corrigir seletor de idioma para mostrar apenas bandeiras (sem siglas)

## Fase 12: Histórico de Movimentações
- [x] Criar tabela de histórico de movimentações no inventário
- [x] Adicionar gráficos de consumo por período
- [x] Implementar filtros de data e categoria no histórico
- [x] Criar análise de tendências de consumo

## Fase 13: Estoque de Consumíveis
- [x] Criar schema Drizzle para tabela de consumíveis
- [x] Implementar procedures tRPC para CRUD de consumíveis
- [x] Criar página de Estoque de Consumíveis com tabelas semanais e mensais
- [x] Implementar cálculo automático de status (ESTOQUE OK, ACIMA DO ESTOQUE, REPOR ESTOQUE)
- [x] Implementar sincronização entre tabelas semanais e mensais
- [ ] Adicionar edição inline para campos de consumíveis
- [x] Adicionar testes Vitest para o módulo de consumíveis
- [x] Adicionar navegação para Estoque de Consumíveis no DashboardLayout


## Fase 14: CRUD de Membros na Escala
- [x] Implementar funcionalidade de cadastro de membros na página Schedule
- [x] Implementar funcionalidade de edição de membros
- [x] Implementar funcionalidade de exclusão de membros
- [x] Adicionar testes Vitest para CRUD de membros
- [ ] Integrar com geração automática de escala


## Fase 15: Alertas de Stock Crítico para Consumíveis
- [x] Remover alertas de stock crítico do Inventário
- [x] Implementar alertas de stock crítico para Consumíveis (abaixo do mínimo)
- [x] Adicionar widget de alertas na página Home
- [x] Implementar filtro de alertas críticos na página Consumíveis


## Fase 16: Sistema de Múltiplas Unidades em Consumíveis
- [x] Criar schema Drizzle para tabela de unidades (spaces)
- [x] Implementar procedures tRPC para CRUD de unidades
- [x] Atualizar página Consumables com seletor de unidades
- [x] Implementar CRUD de unidades (cadastro, edição, exclusão)
- [x] Associar consumíveis a unidades específicas
- [x] Adicionar testes Vitest para o novo sistema


## Fase 17: Edição Inline em Consumíveis
- [x] Criar componente de célula editável para tabela
- [x] Integrar edição inline na tabela de consumíveis
- [x] Implementar salvamento automático ao perder foco
- [x] Adicionar testes Vitest para edição inline


## Fase 18: Cálculo Automático de Repor Estoque
- [x] Implementar cálculo automático de Repor Estoque no formulário
- [x] Atualizar testes Vitest para validar novo cálculo


## Fase 19: Dashboard - Estoque Crítico de Consumíveis
- [x] Ler página Dashboard e entender estrutura atual
- [x] Atualizar Dashboard para consultar estoque crítico de Consumíveis por unidade
- [x] Remover referências ao Inventário no Dashboard
- [x] Testar e validar exibição de alertas de estoque crítico


## Fase 20: Tabelas Semanais Interdependentes em Consumíveis
- [x] Criar schema Drizzle para tabelas semanais de consumíveis
- [x] Implementar procedures tRPC para CRUD de movimentações semanais
- [x] Criar interface de tabelas semanais na página Consumables
- [x] Implementar sincronização entre tabela base e tabelas semanais
- [x] Adicionar testes Vitest para tabelas semanais
