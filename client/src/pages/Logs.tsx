import { useMemo, useState } from "react";
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

type AuditAction = "create" | "read" | "update" | "delete" | "login" | "logout";

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Cadastro",
  read: "Leitura",
  update: "Atualização",
  delete: "Exclusão",
  login: "Login",
  logout: "Logout",
};

function formatAction(action: string) {
  if (action in ACTION_LABEL) {
    return ACTION_LABEL[action as AuditAction];
  }

  return action;
}

function formatChanges(changes: unknown): string {
  if (!changes) return "-";

  let parsed: unknown = changes;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return String(parsed);
    }
  }

  try {
    const serialized = JSON.stringify(parsed);
    if (!serialized) return "-";
    return serialized.length > 180
      ? `${serialized.slice(0, 180)}...`
      : serialized;
  } catch {
    return String(parsed);
  }
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
  const logs = useMemo<any[]>(() => logsQuery.data || [], [logsQuery.data]);

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
                    <TableHead className="text-gray-300">Registro</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Alterações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((row: any) => (
                    <TableRow
                      key={row.id}
                      className="border-sky-700/20 hover:bg-slate-700/30"
                    >
                      <TableCell className="text-gray-300">
                        {formatDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="text-white">{row.module}</TableCell>
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
                      <TableCell className="text-gray-300">
                        {row.recordName
                          ? String(row.recordName)
                          : row.recordId !== null && row.recordId !== undefined
                            ? String(row.recordId)
                            : "-"}
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
                      <TableCell className="text-xs text-gray-300 max-w-[380px] whitespace-normal break-words">
                        {formatChanges(row.changes)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
