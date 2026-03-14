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
