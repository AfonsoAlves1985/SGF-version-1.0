# Script de Teste QA - Módulo Consumíveis

## Problema Identificado
O módulo de consumíveis tem um problema de cache onde ao atualizar o estoque semanal, os dados não aparecem atualizados na primeira tentativa - é necessário atualizar novamente ou recarregar a página.

## Causa Raiz
- React Query faz cache das requisições
- Após mutation, o cache não é invalidado corretamente
- A função `invalidate()` não força refetch imediato

## Rotina de Teste

### 1. Criar Espaço (se não existir)
```bash
# No banco já existe: "Febracis" (ID: 1)
```

### 2. Criar Consumível
1. Acessar módulo "Consumíveis"
2. Selecionar espaço "Febracis"
3. Clicar em "Novo Consumível"
4. Preencher:
   - Nome: "Papel Toalha"
   - Categoria: "Higiene"
   - Unidade: "Pacote"
   - Estoque Mínimo: 10
   - Estoque Máximo: 100
   - Estoque Atual: 50
5. Salvar

### 3. Atualizar Estoque Semanal
1. Na linha do consumível, clicar no campo "Estoque Atual"
2. Digitar novo valor (ex: 25)
3. Pressionar Enter ou clicar fora
4. Observar se o valor atualiza na tela

### 4. Verificação do Bug (Frequência)
- **Primeira tentativa**: O valor pode não aparecer atualizado
- **Segunda tentativa**: O valor aparece atualizado
- **Solução de contorno**: Recarregar a página (F5)

### 5. Verificação no Banco
```sql
SELECT * FROM consumable_weekly_movements 
WHERE consumableId = 1 
ORDER BY id DESC LIMIT 5;
```

## Rotina de Correção Implementada

### Backend (db.ts)
1. Conversão de datas para formato DD-MM-YYYY
2. Tratamento adequado de weekStartDate
3. upsertConsumableWeeklyStock com lógica de insert/update

### Frontend (Consumables.tsx)
1. useQueryClient para manipulação de cache
2. refreshKey para forçar remontagem do componente
3. invalidate após mutation

## Comandos Úteis

### Verificar dados no banco:
```bash
cd sga-g4-belem
node -e "
require('dotenv').config();
const postgres = require('postgres');
const sql = postgres(process.env.DATABASE_URL);
sql\`SELECT * FROM consumable_weekly_movements ORDER BY id DESC LIMIT 3\`.then(r => { 
  console.log(JSON.stringify(r, null, 2)); 
  sql.end(); 
}).catch(e => { console.log(e.message); sql.end(); });
"
```

### Limpar cache do navegador:
- Chrome: DevTools → Application → Storage → Clear site data
- Firefox: DevTools → Storage → Clear

## Status Atual
- ✅ Dados são salvos no banco corretamente
- ⚠️ Atualização em tempo real precisa de 2 tentativas
- 🔄 O refreshKey força remontagem mas não resolve 100%

## Próximos Passos Sugeridos
1. Investigar deeper o cache do tRPC
2. Verificar se há conflito entre queries
3. Considerar usar window.location.reload() como solução temporária
4. Implementar refetch manual após mutation bem-sucedida