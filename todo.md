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


## Fase 21: Refatoração da Interface de Consumíveis
- [x] Remover abas (semanal/mensal) da página Consumables
- [x] Manter tabela única de consumíveis com colunas padrão
- [x] Implementar seletor de semana (date picker)
- [x] Criar drawer/painel lateral para movimentações diárias
- [x] Implementar edição de movimentações diárias no drawer
- [x] Remover tabela mensal por enquanto
- [x] Testar sincronização automática com drawer
- [x] Adicionar calendário visual para seleção de semanas


## Fase 22: Refatoração de Usabilidade do Drawer de Movimentações
- [x] Reorganizar layout do drawer para melhor legibilidade
- [x] Aumentar e melhorar visualização do calendário
- [x] Melhorar campos de entrada de movimentações
- [x] Adicionar feedback visual claro
- [x] Remover sobreposição de elementos
- [x] Testar usabilidade do drawer


## Fase 23: Refatoração para Tabela Única com Seletor de Semana
- [x] Remover drawers individuais de cada consumível
- [x] Adicionar seletor de semana no topo/canto da página
- [x] Implementar carregamento de movimentações por semana
- [x] Adicionar coluna(s) de movimentações semanais na tabela
- [x] Implementar comparação entre semanas (atual vs. anteriores)
- [x] Permitir edição de movimentações diretamente na tabela
- [x] Testar navegação entre semanas
- [x] Testar sincronização de dados


## Fase 24: Melhorias na Seleção de Unidades
- [x] Garantir que adicionar unidades seja fácil e acessível
- [x] Implementar edição de unidades na interface de seleção
- [x] Implementar exclusão de unidades na interface de seleção
- [x] Melhorar feedback visual das ações (adicionar, editar, excluir)
- [x] Testar fluxo completo de gerenciamento de unidades


## Fase 25: Simplificação e Edição Inline de Estoque
- [x] Remover colunas de movimentações diárias (Seg-Dom)
- [x] Implementar edição inline de "Est. Atual"
- [x] Carregar estoque correto ao mudar de semana
- [x] Implementar cálculo automático de "Repor Estoque" (Máx - Atual)
- [x] Atualizar status de estoque com base na reposição
- [x] Testar edição inline e sincronização


## Fase 26: Tabelas Semanais Independentes
- [x] Criar tabela de estoque semanal no schema Drizzle
- [x] Implementar procedures tRPC para carregar estoque por semana
- [x] Implementar mutations para salvar estoque por semana
- [x] Modificar UI para carregar dados semanais independentes
- [x] Testar navegação entre semanas com dados diferentes
- [x] Garantir que cada semana tem seus próprios dados


## Fase 27: Histórico de Alterações de Estoque
- [x] Criar schema Drizzle para tabela de histórico de alterações
- [x] Implementar procedures tRPC para listar histórico
- [x] Implementar mutations para registrar alterações
- [x] Integrar registro automático ao editar estoque
- [x] Criar interface de visualização do histórico
- [x] Adicionar filtros de data e usuário no histórico
- [x] Adicionar testes Vitest para histórico


## Fase 28: Correção de Edição Inline e Independência Semanal
- [x] Debugar por que edição inline não está salvando
- [x] Verificar mutation updateWeeklyStock
- [x] Corrigir query de carregamento semanal
- [x] Garantir que dados sejam independentes por semana
- [x] Testar persistência de dados no banco
- [x] Validar sincronização entre semanas


## Fase 29: Rastreamento de Estoque Mensal
- [x] Criar queries para calcular consumo mensal do histórico semanal
- [x] Adicionar coluna "Consumo Mensal" na tabela de consumíveis
- [x] Implementar cálculo automático de reposição mensal (baseado em consumo real)
- [x] Integrar histórico de alterações no cálculo mensal
- [x] Adicionar indicador visual de consumo vs. reposição recomendada
- [x] Testar coerência de dados entre semanas e mês


## Fase 30: Correção de Exclusão de Unidades
- [x] Criar função para deletar unidade com cascata de dependências
- [x] Remover consumíveis vinculados à unidade
- [x] Remover movimentações semanais vinculadas
- [x] Remover histórico de auditoria vinculado
- [x] Testar exclusão de unidades com dependências
- [x] Validar integridade referencial


## Fase 31: Estoque Cumulativo por Timeline Semanal
- [ ] Modificar queries para carregar estoque inicial da semana anterior
- [ ] Implementar cálculo de estoque cumulativo
- [ ] Atualizar UI para mostrar estoque inicial da semana anterior
- [ ] Garantir que estoque final de uma semana = estoque inicial da próxima
- [ ] Testar timeline de estoque em múltiplas semanas
- [ ] Validar histórico cumulativo de consumo


## Fase 32: Correção de Estoque Cumulativo Semanal
- [x] Modificar query listConsumablesWithWeeklyData para carregar estoque da semana anterior
- [x] Atualizar UI para mostrar estoque inicial da semana anterior
- [x] Garantir que estoque final de uma semana = estoque inicial da próxima
- [x] Testar timeline de estoque em múltiplas semanas
- [x] Validar que edições refletem corretamente na próxima semana


## Fase 33: Histórico Visual de Estoque
- [x] Criar queries para buscar histórico de estoque de 8-12 semanas anteriores
- [x] Implementar cálculo de consumo semanal (estoque anterior - estoque atual)
- [x] Criar componente de gráfico de tendência com Recharts
- [x] Integrar gráfico na página de consumíveis (modal ou drawer)
- [x] Adicionar filtros de período (últimas 4, 8, 12 semanas)
- [x] Implementar análise de padrões de consumo
- [ ] Adicionar testes Vitest para cálculos de consumo
- [x] Testar visualização em diferentes tamanhos de tela


## Bugs Encontrados

### Bug: Estoque Zero Não É Permitido
- [x] Investigar por que estoque 0 retorna ao valor inicial
- [x] Corrigir lógica de atualização de estoque
- [x] Permitir valores zero sem restrição
- [x] Testar sequência: 7 → 5 → 3 → 0
- [x] Validar que 0 é salvo corretamente no banco


## Fase 34: Exportação de Relatórios de Consumo Semanal em PDF
- [ ] Criar queries para gerar dados completos de relatório semanal
- [ ] Implementar helper de geração de PDF com ReportLab
- [ ] Adicionar tabela de consumíveis com dados semanais no PDF
- [ ] Incluir gráficos de tendência no PDF
- [ ] Adicionar análise de padrões e insights no relatório
- [ ] Implementar botão de exportação na página de consumíveis
- [ ] Testar geração e download de PDF
- [ ] Validar formatação e legibilidade do PDF


## Fase 35: Exportação de Relatórios em Excel
- [x] Instalar biblioteca xlsx para geração de Excel
- [x] Criar helper para formatar dados de consumíveis para Excel
- [x] Implementar função de geração de arquivo Excel
- [x] Adicionar procedimento tRPC para exportação
- [x] Integrar botão de exportação na página Consumíveis
- [x] Testar download e validar arquivo Excel
- [x] Adicionar formatação visual (cores, bordas, cabeçalhos)
- [x] Validar compatibilidade com Excel/LibreOffice


## Fase 35: Módulo de Fornecedores Avançado
- [ ] Atualizar schema Drizzle com tabela de fornecedores (nome empresa, tipo de serviço, contato, responsável, status)
- [ ] Implementar seleção múltipla de tipos de serviço
- [ ] Criar procedures tRPC para CRUD de fornecedores
- [ ] Implementar página de gestão de fornecedores com edição inline
- [ ] Adicionar campos: nome empresa (texto), tipo de serviço (seleção múltipla), contato (texto), responsável (texto), status (select)
- [ ] Implementar edição inline para todos os campos
- [ ] Adicionar testes Vitest para procedures de fornecedores
- [ ] Integrar módulo ao menu lateral
- [ ] Testar funcionalidade completa e salvar checkpoint


## Fase 35: Módulo de Fornecedores (Atualizado)
- [x] Atualizar schema com novos campos (companyName, serviceTypes, contact, contactPerson, status, notes)
- [x] Criar queries e mutations tRPC para fornecedores
- [x] Implementar página UI com edição inline e seleção múltipla
- [x] Adicionar testes Vitest para procedimentos de fornecedores
- [x] Integrar ao menu lateral (já estava integrado)
- [x] Validar funcionalidade completa do módulo
