import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PurchaseRequestStatus =
  | "rascunho"
  | "solicitado"
  | "cotacao"
  | "financeiro"
  | "aprovado"
  | "pedido_emitido"
  | "recebido"
  | "cancelado";

type PurchaseRequestUrgency = "baixa" | "normal" | "alta";

const STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  rascunho: "Rascunho",
  solicitado: "Solicitado",
  cotacao: "Cotação",
  financeiro: "Financeiro",
  aprovado: "Aprovado",
  pedido_emitido: "Pedido emitido",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

const URGENCY_LABELS: Record<PurchaseRequestUrgency, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
};

const WEBHOOK_URL_KEY = "purchase-management-webhook-url";
const RESPONSIBLE_EMAIL_KEY = "purchase-management-responsible-email";

function getStatusTagClass(status: PurchaseRequestStatus) {
  if (status === "cancelado") return "bg-red-600/20 text-red-300";
  if (status === "recebido") return "bg-emerald-600/20 text-emerald-300";
  if (status === "aprovado") return "bg-sky-600/20 text-sky-300";
  return "bg-slate-600/30 text-slate-200";
}

function getWebhookTag(request: any) {
  const callbackStatus = request.integrationCallbackLastStatus;
  const webhookStatus = request.integrationWebhookLastStatus;

  if (callbackStatus === "applied") return "Retorno aplicado";
  if (callbackStatus === "duplicate") return "Retorno duplicado";
  if (webhookStatus === "failed") return "Falha no webhook";
  if (webhookStatus === "delivered") return "Enviado";
  return "Não enviado";
}

export default function PurchaseManagement() {
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseRequestStatus>(
    "all"
  );
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | PurchaseRequestUrgency>(
    "all"
  );
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(
    () => localStorage.getItem(WEBHOOK_URL_KEY) || ""
  );
  const [responsibleEmail, setResponsibleEmail] = useState(
    () => localStorage.getItem(RESPONSIBLE_EMAIL_KEY) || ""
  );

  const input = useMemo(() => {
    const payload: {
      status?: PurchaseRequestStatus;
      urgency?: PurchaseRequestUrgency;
      search?: string;
    } = {};

    if (statusFilter !== "all") payload.status = statusFilter;
    if (urgencyFilter !== "all") payload.urgency = urgencyFilter;
    if (search.trim()) payload.search = search.trim();

    return Object.keys(payload).length > 0 ? payload : undefined;
  }, [search, statusFilter, urgencyFilter]);

  const requestsQuery = trpc.purchaseRequests.list.useQuery(input);
  const requestDetailsQuery = trpc.purchaseRequests.getById.useQuery(selectedId || 0, {
    enabled: !!selectedId,
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.purchaseRequests.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      requestsQuery.refetch();
      if (selectedId) {
        requestDetailsQuery.refetch();
      }
    },
    onError: error => toast.error(error.message),
  });

  const webhookMutation = trpc.purchaseRequests.sendWebhook.useMutation();

  const persistWebhookConfig = () => {
    localStorage.setItem(WEBHOOK_URL_KEY, webhookUrl);
    localStorage.setItem(RESPONSIBLE_EMAIL_KEY, responsibleEmail);
    toast.success("Webhook salvo para o módulo de gestão");
  };

  const sendWebhook = async (requestId: number) => {
    if (!webhookUrl.trim()) {
      toast.error("Configure a URL de webhook");
      return;
    }

    try {
      const result = await webhookMutation.mutateAsync({
        requestId,
        action: "updated",
        webhookUrl: webhookUrl.trim(),
        responsibleEmail: responsibleEmail.trim() || undefined,
      });

      if (!result.delivered) {
        toast.warning(result.errorMessage || "Falha ao enviar webhook");
        return;
      }

      toast.success("Webhook enviado");
      requestsQuery.refetch();
      if (selectedId === requestId) {
        requestDetailsQuery.refetch();
      }
    } catch {
      toast.error("Erro ao enviar webhook");
    }
  };

  const updateStatus = async (requestId: number, status: PurchaseRequestStatus) => {
    await updateMutation.mutateAsync({ id: requestId, status });
    await sendWebhook(requestId);
  };

  const requests = requestsQuery.data || [];
  const selected = requestDetailsQuery.data as any;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Gestão de Solicitações</h1>
        <p className="mt-2 text-gray-400">
          Módulo do setor de compras com gestão operacional e comunicação via webhook.
        </p>
      </div>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Integração webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-gray-300">URL webhook</Label>
            <Input
              value={webhookUrl}
              onChange={event => setWebhookUrl(event.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="mt-1 border-slate-600 bg-slate-900 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">E-mail responsável (opcional)</Label>
            <Input
              value={responsibleEmail}
              onChange={event => setResponsibleEmail(event.target.value)}
              placeholder="compras@empresa.com"
              className="mt-1 border-slate-600 bg-slate-900 text-white"
            />
          </div>
          <Button
            onClick={persistWebhookConfig}
            className="bg-sky-600 text-white hover:bg-sky-700"
          >
            Salvar integração
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Fila de solicitações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por documento, empresa, solicitante..."
              className="border-slate-600 bg-slate-900 text-white md:col-span-2"
            />
            <select
              value={statusFilter}
              onChange={event =>
                setStatusFilter(event.target.value as "all" | PurchaseRequestStatus)
              }
              className="h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white"
            >
              <option value="all">Todos status</option>
              {(Object.keys(STATUS_LABELS) as PurchaseRequestStatus[]).map(status => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              value={urgencyFilter}
              onChange={event =>
                setUrgencyFilter(event.target.value as "all" | PurchaseRequestUrgency)
              }
              className="h-10 rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-white"
            >
              <option value="all">Todas urgências</option>
              {(Object.keys(URGENCY_LABELS) as PurchaseRequestUrgency[]).map(urgency => (
                <option key={urgency} value={urgency}>
                  {URGENCY_LABELS[urgency]}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-gray-300">Documento</TableHead>
                  <TableHead className="text-gray-300">Solicitante</TableHead>
                  <TableHead className="text-gray-300">Empresa</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Urgência</TableHead>
                  <TableHead className="text-gray-300">Webhook</TableHead>
                  <TableHead className="text-right text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsQuery.isLoading ? (
                  <TableRow className="border-slate-700">
                    <TableCell colSpan={7} className="text-center text-gray-400">
                      Carregando solicitações...
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow className="border-slate-700">
                    <TableCell colSpan={7} className="text-center text-gray-400">
                      Nenhuma solicitação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request: any) => (
                    <TableRow key={request.id} className="border-slate-700">
                      <TableCell className="font-medium text-white">
                        {request.documentNumber}
                      </TableCell>
                      <TableCell className="text-gray-300">{request.requesterName}</TableCell>
                      <TableCell className="text-gray-300">{request.company}</TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getStatusTagClass(
                            request.status
                          )}`}
                        >
                          {STATUS_LABELS[request.status as PurchaseRequestStatus]}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {URGENCY_LABELS[request.urgency as PurchaseRequestUrgency]}
                      </TableCell>
                      <TableCell className="text-gray-300">{getWebhookTag(request)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-gray-200 hover:bg-slate-700"
                            onClick={() => setSelectedId(request.id)}
                          >
                            Detalhes
                          </Button>
                          <Button
                            size="sm"
                            className="bg-sky-600 text-white hover:bg-sky-700"
                            onClick={() => sendWebhook(request.id)}
                            disabled={webhookMutation.isPending}
                          >
                            Reenviar webhook
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selectedId !== null}
        onOpenChange={open => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-slate-700 bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-white">Gestão da solicitação</DialogTitle>
            <DialogDescription className="text-gray-400">
              Atualize o status e dispare webhook para o setor de compras.
            </DialogDescription>
          </DialogHeader>

          {requestDetailsQuery.isLoading || !selected ? (
            <p className="text-sm text-gray-400">Carregando detalhes...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Documento</p>
                  <p className="text-sm font-medium text-white">{selected.documentNumber}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Solicitante</p>
                  <p className="text-sm font-medium text-white">{selected.requesterName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Empresa</p>
                  <p className="text-sm font-medium text-white">{selected.company}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Total</p>
                  <p className="text-sm font-medium text-white">
                    R$ {Number(selected.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                  Itens da solicitação
                </p>
                <div className="space-y-2">
                  {(selected.items || []).map((item: any, index: number) => (
                    <div
                      key={`${selected.id}-${index}`}
                      className="rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                    >
                      <p className="text-sm font-medium text-white">{item.description}</p>
                      <p className="text-xs text-gray-400">
                        {item.quantity} {item.unit} x R$ {Number(item.unitPrice || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                {(Object.keys(STATUS_LABELS) as PurchaseRequestStatus[]).map(status => (
                  <Button
                    key={status}
                    variant={selected.status === status ? "default" : "outline"}
                    className={
                      selected.status === status
                        ? "bg-sky-600 text-white hover:bg-sky-700"
                        : "border-slate-600 text-gray-200 hover:bg-slate-700"
                    }
                    onClick={() => {
                      void updateStatus(selected.id, status);
                    }}
                    disabled={updateMutation.isPending || webhookMutation.isPending}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
