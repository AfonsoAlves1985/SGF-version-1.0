# Arquitetura - SGA G4 Belém

## Visão Geral

A aplicação é uma plataforma web de gestão de facilities construída com:
- **Frontend:** React 19 + Tailwind CSS 4 + shadcn/ui
- **Backend:** Express 4 + tRPC 11
- **Base de Dados:** MySQL/TiDB com Drizzle ORM
- **Autenticação:** Manus OAuth

## Modelo de Dados

### Tabelas Principais

1. **users** - Utilizadores da plataforma (já existe)
   - id, openId, name, email, role (admin/user), createdAt, updatedAt

2. **inventory** - Itens de inventário
   - id, name, category, quantity, minQuantity, unit, location, status, lastUpdated

3. **inventory_movements** - Histórico de entrada/saída
   - id, inventoryId, type (entrada/saída), quantity, reason, userId, createdAt

4. **teams** - Equipa de facilities
   - id, name, email, phone, role (limpeza/manutenção/admin), sector, status

5. **schedules** - Escala de equipa
   - id, teamId, date, shift (manhã/tarde/noite), sector, status

6. **rooms** - Salas e espaços
   - id, name, capacity, location, type (sala/auditório/cozinha), status

7. **room_reservations** - Reservas de salas
   - id, roomId, userId, startTime, endTime, purpose, status, createdAt

8. **maintenance_requests** - Chamados de manutenção
   - id, title, description, priority (baixa/média/alta/urgente), type (preventiva/correctiva)
   - status (aberto/em progresso/concluído/cancelado), assignedTo, createdBy, createdAt, completedAt

9. **suppliers** - Fornecedores
   - id, name, email, phone, category, status, createdAt

10. **contracts** - Contratos com fornecedores
    - id, supplierId, title, startDate, endDate, value, status, notes

### Relações

- inventory_movements → inventory (foreignKey)
- inventory_movements → users (foreignKey)
- schedules → teams (foreignKey)
- room_reservations → rooms (foreignKey)
- room_reservations → users (foreignKey)
- maintenance_requests → teams (foreignKey, assignedTo)
- maintenance_requests → users (foreignKey, createdBy)
- contracts → suppliers (foreignKey)

## Módulos Funcionais

### 1. Inventário
- CRUD de itens
- Controlo de entrada/saída com histórico
- Alertas de stock crítico
- Filtros por categoria e localização

### 2. Escala de Equipa
- Atribuição manual e automática por sector/turno
- Visualização em calendário
- Gestão de turnos (manhã/tarde/noite)
- Histórico de escalas

### 3. Reserva de Salas
- Calendário visual com disponibilidade
- Reservas com data/hora
- Status em tempo real
- Histórico de utilizações

### 4. Manutenção
- Criação de chamados (preventiva/correctiva)
- Priorização (baixa/média/alta/urgente)
- Atribuição a técnicos
- Histórico e conclusão com notas

### 5. Fornecedores
- Gestão de contactos
- Contratos com datas de vencimento
- Alertas de vencimento próximo

### 6. Dashboard Executivo
- KPIs: economia, chamados abertos, ocupação de salas, stock crítico
- Gráficos de tendências
- Alertas prioritários

### 7. Notificações
- Alertas de chamados urgentes
- Notificações de stock baixo
- Lembretes de vencimento de contratos

### 8. Relatórios
- Exportação em PDF/Excel
- Relatórios de inventário, manutenção, escala
- Auditoria de movimentações

## Fluxo de Autenticação

1. Utilizador acessa a aplicação
2. Se não autenticado, redireciona para login Manus OAuth
3. Após autenticação, cria/atualiza utilizador na BD
4. Session cookie armazenado
5. Acesso a funcionalidades conforme role (admin/user)

## Segurança

- Autenticação via Manus OAuth
- Autorização baseada em roles
- Validação de entrada em tRPC procedures
- CORS configurado
- Variáveis de ambiente para credenciais

## Deployment

- Frontend: Vite build → estático
- Backend: Node.js + Express
- BD: MySQL/TiDB gerida pela plataforma
- Hosting: Manus

## Próximas Fases

1. Implementar schema Drizzle
2. Criar procedures tRPC
3. Desenvolver componentes React
4. Integrar notificações
5. Testes e otimizações
