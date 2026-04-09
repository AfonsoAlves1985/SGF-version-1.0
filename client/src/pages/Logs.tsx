import { useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuditAction = "create" | "read" | "update" | "delete" | "login" | "logout";

type AuditRow = {
  id: number;
  action: string;
  module: string;
  recordId?: number | null;
  recordName?: string | null;
  changes?: unknown;
  status: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email?: string | null;
    role?: string;
  } | null;
};

type ChangeDetail = {
  field: string;
  before?: string;
  after: string;
};

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Cadastro",
  read: "Leitura",
  update: "Atualização",
  delete: "Exclusão",
  login: "Login",
  logout: "Logout",
};

const MODULE_LABELS: Record<string, string> = {
  auth: "Autenticação",
  accessManagement: "Acessos",
  auditLogs: "Auditoria",
  inventory: "Inventário",
  inventoryAssets: "Bens do Inventário",
  inventorySpaces: "Unidades do Inventário",
  consumables: "Consumíveis",
  consumablesWithSpace: "Consumíveis por Unidade",
  consumableWeeklyMovements: "Movimentação Semanal",
  consumableMonthlyMovements: "Movimentação Mensal",
  rooms: "Salas",
  maintenanceRequests: "Manutenção",
  suppliersWithSpace: "Fornecedores",
  purchaseRequests: "Solicitação de Compras",
  contractsWithSpace: "Contratos",
  users: "Usuários",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  title: "Título",
  email: "E-mail",
  role: "Perfil",
  isActive: "Ativo",
  status: "Status",
  category: "Categoria",
  unit: "Unidade",
  currentStock: "Estoque atual",
  minStock: "Estoque mínimo",
  maxStock: "Estoque máximo",
  replenishStock: "Ponto de reposição",
  filial: "Filial",
  nrBem: "Nº bem",
  descricao: "Descrição",
  marca: "Marca",
  modelo: "Modelo",
  conta: "Conta",
  centroCusto: "Centro de custo",
  local: "Local",
  responsavel: "Responsável",
  fornecedor: "Fornecedor",
  dtAquis: "Data aquisição",
  anoAquis: "Ano aquisição",
  vlrCusto: "Valor de custo",
  token: "Token",
  invitationId: "Convite",
  userId: "Usuário",
  documentNumber: "Número do documento",
  neededDate: "Data necessária",
  requestDate: "Data da solicitação",
  urgency: "Urgência",
  company: "Empresa",
  costCenter: "Centro de custo",
  purchaseType: "Tipo de compra",
  requesterName: "Solicitante",
  requesterEmail: "E-mail do solicitante",
  requesterRole: "Cargo do solicitante",
  requesterRegistration: "Matrícula",
  requesterPhone: "Telefone do solicitante",
  supplierName: "Fornecedor sugerido",
  supplierDocument: "Documento fornecedor",
  supplierContact: "Contato fornecedor",
  supplierDeliveryEstimate: "Prazo estimado",
  justification: "Justificativa",
  observations: "Observações",
  items: "Itens",
  totalAmount: "Valor total",
  itemsCount: "Quantidade de itens",
  billingCnpj: "CNPJ faturamento",
  paymentTerms: "Condição de pagamento",
  financeApproved: "Aprovado financeiro",
  externalRequestId: "ID externo",
  externalApprovalStatus: "Status externo",
  externalApprovedBy: "Aprovado por (externo)",
  externalApprovedAt: "Data aprovação externa",
  externalApprovalReason: "Motivo externo",
  externalApprovalPayload: "Payload externo",
};

const IGNORED_CHANGE_KEYS = new Set([
  "id",
  "userId",
  "invitationId",
  "token",
  "spaceId",
  "consumableId",
  "contractId",
  "supplierId",
]);

function formatAction(action: string) {
  if (action in ACTION_LABEL) {
    return ACTION_LABEL[action as AuditAction];
  }

  return action;
}

function formatModule(moduleName: string) {
  return MODULE_LABELS[moduleName] || moduleName;
}

function normalizeFieldLabel(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];

  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/^./, char => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(vazio)";

  if (typeof value === "boolean") return value ? "Sim" : "Não";

  if (typeof value === "number") return String(value);

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const parsedDate = new Date(trimmed);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleString("pt-BR");
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-");
      return `${day}/${month}/${year}`;
    }

    return trimmed;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "(lista vazia)";
    return value.map(item => formatValue(item)).join(", ");
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeChanges(changes: unknown): unknown {
  if (!changes) return null;

  if (typeof changes === "string") {
    try {
      return JSON.parse(changes);
    } catch {
      return changes;
    }
  }

  if (
    typeof changes === "object" &&
    changes &&
    "raw" in (changes as Record<string, unknown>)
  ) {
    const rawValue = (changes as Record<string, unknown>).raw;
    if (rawValue === "undefined" || rawValue === undefined || rawValue === null) {
      return null;
    }
  }

  return changes;
}

function buildChangedColumns(changes: unknown): string[] {
  const parsed = normalizeChanges(changes);
  if (!parsed) return [];

  if (typeof parsed === "string") return [];
  if (typeof parsed !== "object") return [];

  const parsedObject = parsed as Record<string, unknown>;
  const before =
    parsedObject.before && typeof parsedObject.before === "object"
      ? (parsedObject.before as Record<string, unknown>)
      : null;
  const after =
    parsedObject.after && typeof parsedObject.after === "object"
      ? (parsedObject.after as Record<string, unknown>)
      : null;

  if (before && after) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .filter(key => !IGNORED_CHANGE_KEYS.has(key));

    return keys.map(normalizeFieldLabel);
  }

  return Object.keys(parsedObject)
    .filter(key => !IGNORED_CHANGE_KEYS.has(key))
    .map(normalizeFieldLabel);
}

function buildChangedInfo(changes: unknown): string[] {
  const parsed = normalizeChanges(changes);
  if (!parsed) return [];

  if (typeof parsed === "string") {
    return [parsed];
  }

  if (typeof parsed !== "object") {
    return [formatValue(parsed)];
  }

  const parsedObject = parsed as Record<string, unknown>;
  const before =
    parsedObject.before && typeof parsedObject.before === "object"
      ? (parsedObject.before as Record<string, unknown>)
      : null;
  const after =
    parsedObject.after && typeof parsedObject.after === "object"
      ? (parsedObject.after as Record<string, unknown>)
      : null;

  if (before && after) {
    const lines = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .filter(key => !IGNORED_CHANGE_KEYS.has(key))
      .map(key => `De ${formatValue(before[key])} para ${formatValue(after[key])}`);

    return lines;
  }

  const lines = Object.entries(parsedObject)
    .filter(([key]) => !IGNORED_CHANGE_KEYS.has(key))
    .map(([_key, value]) => formatValue(value));

  return lines;
}

function renderRecordInfo(row: AuditRow): ReactNode {
  const lines = buildChangedInfo(row.changes);

  if (lines.length === 0) {
    return formatRecordFallback(row);
  }

  const visible = lines.slice(0, 2);
  const hasMore = lines.length > visible.length;

  return (
    <div className="space-y-1">
      {visible.map((line, index) => (
        <p
          key={`${index}-${line}`}
          className="text-xs text-gray-300 whitespace-normal break-words"
        >
          {line}
        </p>
      ))}
      {hasMore && (
        <p className="text-[11px] text-sky-300">+{lines.length - visible.length} valor(es)</p>
      )}
    </div>
  );
}

function renderChangedColumns(changes: unknown): ReactNode {
  const columns = buildChangedColumns(changes);

  if (columns.length === 0) {
    return "-";
  }

  const visible = columns.slice(0, 3);
  const hasMore = columns.length > visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(columnName => (
        <Badge
          key={columnName}
          variant="outline"
          className="border-sky-600/40 text-sky-200"
        >
          {columnName}
        </Badge>
      ))}
      {hasMore && (
        <Badge variant="outline" className="border-slate-600 text-gray-300">
          +{columns.length - visible.length}
        </Badge>
      )}
    </div>
  );
}

function buildChangeDetails(changes: unknown): ChangeDetail[] {
  const parsed = normalizeChanges(changes);
  if (!parsed) return [];

  if (typeof parsed === "string") {
    return [{ field: "Mensagem", after: parsed }];
  }

  if (typeof parsed !== "object") {
    return [{ field: "Valor", after: formatValue(parsed) }];
  }

  const parsedObject = parsed as Record<string, unknown>;
  const before =
    parsedObject.before && typeof parsedObject.before === "object"
      ? (parsedObject.before as Record<string, unknown>)
      : null;
  const after =
    parsedObject.after && typeof parsedObject.after === "object"
      ? (parsedObject.after as Record<string, unknown>)
      : null;

  if (before && after) {
    return Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
      .filter(key => !IGNORED_CHANGE_KEYS.has(key))
      .map(key => ({
        field: normalizeFieldLabel(key),
        before: formatValue(before[key]),
        after: formatValue(after[key]),
      }));
  }

  return Object.entries(parsedObject)
    .filter(([key]) => !IGNORED_CHANGE_KEYS.has(key))
    .map(([key, value]) => ({
      field: normalizeFieldLabel(key),
      after: formatValue(value),
    }));
}

function formatRecordFallback(row: AuditRow): string {
  if (row.recordName && row.recordId !== null && row.recordId !== undefined) {
    return `${row.recordName} (#${row.recordId})`;
  }

  if (row.recordName) {
    return row.recordName;
  }

  if (row.recordId !== null && row.recordId !== undefined) {
    return `ID #${row.recordId}`;
  }

  if (row.action === "login") return "Autenticação";
  if (row.action === "logout") return "Sessão";

  return "-";
}

function formatDateTime(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Logs() {
  const { user } = useAuth();
  const canAccess = user?.role === "superadmin" || user?.role === "admin";

  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditRow | null>(null);

  const usersQuery = trpc.auditLogs.listUsers.useQuery(undefined, {
    enabled: canAccess,
  });

  const modulesQuery = trpc.auditLogs.listModules.useQuery(undefined, {
    enabled: canAccess,
  });

  const logsQuery = trpc.auditLogs.list.useQuery(
    {
      userId: selectedUserId !== "all" ? Number(selectedUserId) : undefined,
      module: selectedModule !== "all" ? selectedModule : undefined,
      action: selectedAction !== "all" ? (selectedAction as any) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit: 300,
    },
    {
      enabled: canAccess,
    }
  );

  const users = useMemo<any[]>(() => usersQuery.data || [], [usersQuery.data]);
  const modules = useMemo<string[]>(
    () => (modulesQuery.data || []) as string[],
    [modulesQuery.data]
  );
  const logs = useMemo<AuditRow[]>(() => logsQuery.data || [], [logsQuery.data]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Logs de Auditoria</h1>
        <Card className="bg-slate-800/50 border-sky-700/30">
          <CardContent className="py-8">
            <p className="text-gray-300">
              Apenas usuários owner e admin podem acessar esta tela.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Logs de Auditoria</h1>
        <p className="text-gray-400 mt-1">
          Consulte cadastros e alterações por módulo, usuário e período.
        </p>
      </div>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">
            Refine a visualização dos eventos de auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Módulo</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Todos os módulos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os módulos</SelectItem>
                  {modules.map(moduleName => (
                    <SelectItem key={moduleName} value={moduleName}>
                      {moduleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Usuário</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((item: any) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} ({item.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Ação</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="create">Cadastro</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                Data inicial
              </label>
              <DateInputWithCalendar
                value={startDate}
                onChange={setStartDate}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                Data final
              </label>
              <DateInputWithCalendar
                value={endDate}
                onChange={setEndDate}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              className="border-slate-600 text-gray-300 hover:bg-slate-700"
              onClick={() => {
                setSelectedModule("all");
                setSelectedUserId("all");
                setSelectedAction("all");
                setStartDate("");
                setEndDate("");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Eventos</CardTitle>
          <CardDescription className="text-gray-400">
            {logs.length} registro(s) encontrado(s).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Nenhum log encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-sky-700/30 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Data/Hora</TableHead>
                    <TableHead className="text-gray-300">Módulo</TableHead>
                    <TableHead className="text-gray-300">Ação</TableHead>
                    <TableHead className="text-gray-300">Usuário</TableHead>
                    <TableHead className="text-gray-300">Registro (informação)</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Alterações (coluna)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(row => (
                    <TableRow
                      key={row.id}
                      className="border-sky-700/20 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => setSelectedLog(row)}
                    >
                      <TableCell className="text-gray-300">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-white">{formatModule(row.module)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-sky-600/40 text-sky-300"
                        >
                          {formatAction(row.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {row.user
                          ? `${row.user.name} (${row.user.email || "sem e-mail"})`
                          : "Sistema / removido"}
                      </TableCell>
                      <TableCell className="max-w-[360px] align-top">
                        {renderRecordInfo(row)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            row.status === "success"
                              ? "border-emerald-500/40 text-emerald-300"
                              : "border-red-500/40 text-red-300"
                          }
                        >
                          {row.status === "success" ? "Sucesso" : "Falha"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[380px] align-top">
                        {renderChangedColumns(row.changes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={open => !open && setSelectedLog(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[1100px] max-h-[92vh] min-h-[360px] md:min-h-[520px] md:min-w-[760px] overflow-auto md:resize bg-slate-900 border-slate-700 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes do evento de auditoria</DialogTitle>
            <DialogDescription className="text-gray-400">
              Visualização completa das informações do evento selecionado. Em
              desktop, arraste o canto inferior direito para redimensionar.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Data/Hora</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {formatDateTime(selectedLog.createdAt)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Módulo</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {formatModule(selectedLog.module)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Ação</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {formatAction(selectedLog.action)}
                  </p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Status</p>
                  <p
                    className={`text-sm mt-1 ${
                      selectedLog.status === "success"
                        ? "text-emerald-300"
                        : "text-red-300"
                    }`}
                  >
                    {selectedLog.status === "success" ? "Sucesso" : "Falha"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400">Usuário</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {selectedLog.user
                      ? `${selectedLog.user.name} (${selectedLog.user.email || "sem e-mail"})`
                      : "Sistema / removido"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400">Registro</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {formatRecordFallback(selectedLog)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-white mb-3">Alterações detalhadas</p>
                {buildChangeDetails(selectedLog.changes).length === 0 ? (
                  <p className="text-sm text-gray-400">Sem detalhes de alteração para este evento.</p>
                ) : (
                  <>
                    <div className="md:hidden space-y-2">
                      {buildChangeDetails(selectedLog.changes).map(detail => (
                        <div
                          key={`${detail.field}-${detail.before || ""}-${detail.after}-mobile`}
                          className="rounded-md border border-slate-700 bg-slate-900/60 p-3"
                        >
                          <p className="text-xs text-gray-400">Coluna</p>
                          <p className="text-sm text-white break-words">{detail.field}</p>
                          <p className="text-xs text-gray-400 mt-2">Valor anterior</p>
                          <p className="text-sm text-gray-300 break-words">{detail.before || "-"}</p>
                          <p className="text-xs text-gray-400 mt-2">Valor novo</p>
                          <p className="text-sm text-sky-300 break-words">{detail.after}</p>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-gray-300">Coluna</TableHead>
                          <TableHead className="text-gray-300">Valor anterior</TableHead>
                          <TableHead className="text-gray-300">Valor novo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildChangeDetails(selectedLog.changes).map(detail => (
                          <TableRow
                            key={`${detail.field}-${detail.before || ""}-${detail.after}`}
                            className="border-slate-700"
                          >
                            <TableCell className="text-white">{detail.field}</TableCell>
                            <TableCell className="text-gray-300 break-words max-w-[260px]">
                              {detail.before || "-"}
                            </TableCell>
                            <TableCell className="text-sky-300 break-words max-w-[260px]">
                              {detail.after}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">IP</p>
                  <p className="text-sm text-gray-200 mt-1">{selectedLog.ipAddress || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">User Agent</p>
                  <p className="text-sm text-gray-200 mt-1 break-words">
                    {selectedLog.userAgent || "-"}
                  </p>
                </div>
                {selectedLog.errorMessage && (
                  <div className="rounded-md border border-red-500/40 bg-red-900/20 p-3 md:col-span-2">
                    <p className="text-xs text-red-300">Mensagem de erro</p>
                    <p className="text-sm text-red-200 mt-1 break-words">
                      {selectedLog.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
