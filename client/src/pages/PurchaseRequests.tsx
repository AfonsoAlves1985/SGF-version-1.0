import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  FilePlus2,
  LoaderCircle,
  Paperclip,
  Plus,
  Send,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

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

type AttachmentMeta = {
  name: string;
  size: number;
  type?: string;
  url?: string;
};

type RequestItemForm = {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  supplierSuggestion: string;
};

type RequestFormState = {
  documentNumber: string;
  requestDate: string;
  neededDate: string;
  urgency: PurchaseRequestUrgency;
  company: string;
  costCenter: string;
  purchaseType: string;
  requesterName: string;
  requesterRegistration: string;
  requesterRole: string;
  requesterEmail: string;
  requesterPhone: string;
  supplierName: string;
  supplierDocument: string;
  supplierContact: string;
  supplierDeliveryEstimate: string;
  justification: string;
  observations: string;
  financeApproved: boolean;
  billingCnpj: string;
  paymentTerms: string;
  status: PurchaseRequestStatus;
};

type PurchaseRequestDetail = {
  id: number;
  documentNumber: string;
  requestDate: string;
  neededDate: string;
  urgency: PurchaseRequestUrgency;
  company: string;
  costCenter: string;
  purchaseType: string;
  requesterName: string;
  requesterRegistration?: string | null;
  requesterRole?: string | null;
  requesterEmail: string;
  requesterPhone?: string | null;
  supplierName?: string | null;
  supplierDocument?: string | null;
  supplierContact?: string | null;
  supplierDeliveryEstimate?: string | null;
  justification: string;
  observations?: string | null;
  financeApproved?: boolean;
  externalRequestId?: string | null;
  externalApprovalStatus?: string | null;
  externalApprovedBy?: string | null;
  externalApprovedAt?: string | Date | null;
  externalApprovalReason?: string | null;
  externalApprovalPayload?: unknown;
  integrationWebhookAttempts?: number;
  integrationWebhookLastAttemptAt?: string | Date | null;
  integrationWebhookLastDeliveredAt?: string | Date | null;
  integrationWebhookLastStatus?: string | null;
  integrationWebhookLastStatusCode?: number | null;
  integrationWebhookLastError?: string | null;
  integrationCallbackAttempts?: number;
  integrationCallbackLastAt?: string | Date | null;
  integrationCallbackLastStatus?: string | null;
  integrationCallbackLastDecision?: string | null;
  integrationCallbackLastError?: string | null;
  billingCnpj?: string | null;
  paymentTerms?: string | null;
  status: PurchaseRequestStatus;
  itemsCount?: number;
  totalAmount?: number | string;
  attachments?: unknown;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  completedAt?: string | Date | null;
  items?: Array<{
    itemOrder?: number;
    description: string;
    unit: string;
    quantity: number | string;
    unitPrice: number | string;
    totalPrice?: number | string;
    supplierSuggestion?: string | null;
  }>;
};

type RequestDialogEditState = {
  status: PurchaseRequestStatus;
  neededDate: string;
  urgency: PurchaseRequestUrgency;
  supplierName: string;
  supplierContact: string;
  supplierDeliveryEstimate: string;
  justification: string;
  observations: string;
  financeApproved: boolean;
  billingCnpj: string;
  paymentTerms: string;
};

const WEBHOOK_URL_KEY = "frz_purchase_webhook_url";
const RESPONSIBLE_EMAIL_KEY = "frz_purchase_responsible_email";
const ASSISTANT_PURCHASE_FILTER_EVENT = "assistant:purchase-filters";
const ASSISTANT_PURCHASE_FILTER_STORAGE_KEY = "assistant:purchase-filters";

const COMPANY_OPTIONS = [
  "GRUPO FRZ MATRIZ",
  "FRZ ABA",
  "GRUPO FRZ 02 VIX",
  "GRUPO FRZ 03 TERESINA",
  "BABA",
  "KABA",
  "LEAD FIT",
];

const COST_CENTER_OPTIONS = [
  "Administrativo",
  "Comercial / Vendas",
  "Financeiro",
  "Operacional",
  "Marketing",
  "RH e Pessoal",
  "TI e Tecnologia",
  "Manutenção",
];

const PURCHASE_TYPE_OPTIONS = [
  "Material de Escritório",
  "Equipamentos e TI",
  "Serviços",
  "Material de Limpeza",
  "Marketing e Publicidade",
  "Manutenção e Reparos",
  "Treinamento e Capacitação",
  "Outros",
];

const UNIT_OPTIONS = ["UN", "CX", "PC", "KG", "LT", "M²", "HR", "MÊS"];

const INITIAL_ITEM: RequestItemForm = {
  description: "",
  unit: "UN",
  quantity: 1,
  unitPrice: 0,
  supplierSuggestion: "",
};

const INITIAL_FORM: RequestFormState = {
  documentNumber: "",
  requestDate: "",
  neededDate: "",
  urgency: "normal",
  company: "",
  costCenter: "",
  purchaseType: "",
  requesterName: "",
  requesterRegistration: "",
  requesterRole: "",
  requesterEmail: "",
  requesterPhone: "",
  supplierName: "",
  supplierDocument: "",
  supplierContact: "",
  supplierDeliveryEstimate: "",
  justification: "",
  observations: "",
  financeApproved: false,
  billingCnpj: "",
  paymentTerms: "",
  status: "solicitado",
};

const STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  rascunho: "Rascunho",
  solicitado: "Solicitado",
  cotacao: "Cotação",
  financeiro: "Financeiro",
  aprovado: "Aprovado",
  pedido_emitido: "Pedido Emitido",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

const URGENCY_LABELS: Record<PurchaseRequestUrgency, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
};

const APPROVAL_FLOW: Array<{ key: PurchaseRequestStatus; label: string }> = [
  { key: "solicitado", label: "Gestor analisa" },
  { key: "cotacao", label: "Compras cotação" },
  { key: "financeiro", label: "Financeiro valida" },
  { key: "aprovado", label: "Direção aprova" },
  { key: "pedido_emitido", label: "Pedido emitido" },
  { key: "recebido", label: "Recebimento" },
];

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-BR");
}

function getStatusBadgeClass(status: PurchaseRequestStatus) {
  if (status === "recebido") return "bg-green-600/20 text-green-300";
  if (status === "cancelado") return "bg-red-600/20 text-red-300";
  if (status === "rascunho") return "bg-slate-600/20 text-slate-300";
  if (status === "aprovado" || status === "pedido_emitido") {
    return "bg-sky-600/20 text-sky-300";
  }
  return "bg-yellow-600/20 text-yellow-300";
}

function getIntegrationBadgeClass(status?: string | null) {
  if (status === "delivered" || status === "applied") {
    return "bg-emerald-600/20 text-emerald-300";
  }

  if (status === "duplicate") {
    return "bg-slate-600/30 text-slate-200";
  }

  if (status === "failed") {
    return "bg-red-600/20 text-red-300";
  }

  return "bg-slate-700/40 text-slate-300";
}

function getIntegrationSummary(request: Partial<PurchaseRequestDetail>) {
  const callbackStatus = request.integrationCallbackLastStatus;
  const webhookStatus = request.integrationWebhookLastStatus;

  if (callbackStatus === "applied") return "Retorno aplicado";
  if (callbackStatus === "duplicate") return "Retorno duplicado";
  if (webhookStatus === "failed") return "Envio com falha";
  if (webhookStatus === "delivered") return "Enviado ao FRZ";
  return "Não enviado";
}

function toAttachmentMeta(files: FileList | null): AttachmentMeta[] {
  if (!files) return [];
  return Array.from(files).map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    url: URL.createObjectURL(file),
  }));
}

export default function PurchaseRequests() {
  const utils = trpc.useUtils();
  const [isWebhookDialogOpen, setIsWebhookDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(
    () => localStorage.getItem(WEBHOOK_URL_KEY) || ""
  );
  const [responsibleEmail, setResponsibleEmail] = useState(
    () => localStorage.getItem(RESPONSIBLE_EMAIL_KEY) || ""
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RequestFormState>(INITIAL_FORM);
  const [items, setItems] = useState<RequestItemForm[]>([INITIAL_ITEM]);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [selectedRequest, setSelectedRequest] =
    useState<PurchaseRequestDetail | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isRequestDialogLoading, setIsRequestDialogLoading] = useState(false);
  const [isRequestDialogEditing, setIsRequestDialogEditing] = useState(false);
  const [dialogEdit, setDialogEdit] = useState<RequestDialogEditState | null>(null);
  const [listFilters, setListFilters] = useState<{
    status: "all" | PurchaseRequestStatus;
    urgency: "all" | PurchaseRequestUrgency;
    company: string;
    search: string;
  }>({
    status: "all",
    urgency: "all",
    company: "all",
    search: "",
  });

  const requestsQueryInput = useMemo(() => {
    const searchTerm = listFilters.search.trim();
    const input: {
      status?: PurchaseRequestStatus;
      urgency?: PurchaseRequestUrgency;
      company?: string;
      search?: string;
    } = {};

    if (listFilters.status !== "all") {
      input.status = listFilters.status;
    }

    if (listFilters.urgency !== "all") {
      input.urgency = listFilters.urgency;
    }

    if (listFilters.company !== "all") {
      input.company = listFilters.company;
    }

    if (searchTerm.length > 0) {
      input.search = searchTerm;
    }

    return Object.keys(input).length > 0 ? input : undefined;
  }, [listFilters]);

  const requestsQuery = trpc.purchaseRequests.list.useQuery(requestsQueryInput);
  const lookupQuery = trpc.purchaseRequests.lookupValues.useQuery();
  const nextDocQuery = trpc.purchaseRequests.getNextDocumentNumber.useQuery(
    undefined,
    { enabled: !editingId }
  );

  const createMutation = trpc.purchaseRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação criada com sucesso");
      requestsQuery.refetch();
      resetForm();
      nextDocQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.purchaseRequests.update.useMutation({
    onSuccess: () => {
      toast.success("Solicitação atualizada com sucesso");
      requestsQuery.refetch();
      resetForm();
      nextDocQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const deleteMutation = trpc.purchaseRequests.delete.useMutation({
    onSuccess: () => {
      toast.success("Solicitação removida");
      requestsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const webhookMutation = trpc.purchaseRequests.sendWebhook.useMutation();

  const isSaving =
    createMutation.isPending || updateMutation.isPending || webhookMutation.isPending;

  const mergedCompanies = useMemo(
    () =>
      Array.from(
        new Set([
          ...COMPANY_OPTIONS,
          ...(lookupQuery.data?.companies || []),
        ])
      ),
    [lookupQuery.data?.companies]
  );

  const mergedCostCenters = useMemo(
    () =>
      Array.from(
        new Set([
          ...COST_CENTER_OPTIONS,
          ...(lookupQuery.data?.costCenters || []),
        ])
      ),
    [lookupQuery.data?.costCenters]
  );

  const mergedPurchaseTypes = useMemo(
    () =>
      Array.from(
        new Set([
          ...PURCHASE_TYPE_OPTIONS,
          ...(lookupQuery.data?.purchaseTypes || []),
        ])
      ),
    [lookupQuery.data?.purchaseTypes]
  );

  const totals = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );

    return {
      totalQuantity,
      totalAmount,
    };
  }, [items]);

  useEffect(() => {
    if (!editingId && nextDocQuery.data && !form.documentNumber) {
      setForm(current => ({
        ...current,
        documentNumber: nextDocQuery.data,
      }));
    }
  }, [editingId, form.documentNumber, nextDocQuery.data]);

  useEffect(() => {
    if (!form.requestDate) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      setForm(current => ({ ...current, requestDate: `${day}-${month}-${year}` }));
    }
  }, [form.requestDate]);

  useEffect(() => {
    const applyFilters = (incoming: unknown) => {
      if (!incoming || typeof incoming !== "object") return;
      const payload = incoming as {
        status?: unknown;
        urgency?: unknown;
        company?: unknown;
        search?: unknown;
      };

      setListFilters(current => ({
        status:
          typeof payload.status === "string" && payload.status.length > 0
            ? (payload.status as "all" | PurchaseRequestStatus)
            : current.status,
        urgency:
          typeof payload.urgency === "string" && payload.urgency.length > 0
            ? (payload.urgency as "all" | PurchaseRequestUrgency)
            : current.urgency,
        company:
          typeof payload.company === "string" && payload.company.length > 0
            ? payload.company
            : current.company,
        search:
          typeof payload.search === "string"
            ? payload.search
            : current.search,
      }));
    };

    const saved = localStorage.getItem(ASSISTANT_PURCHASE_FILTER_STORAGE_KEY);
    if (saved) {
      try {
        applyFilters(JSON.parse(saved));
      } finally {
        localStorage.removeItem(ASSISTANT_PURCHASE_FILTER_STORAGE_KEY);
      }
    }

    const onAssistantFilters = (event: Event) => {
      const custom = event as CustomEvent;
      applyFilters(custom.detail);
    };

    window.addEventListener(ASSISTANT_PURCHASE_FILTER_EVENT, onAssistantFilters);
    return () => {
      window.removeEventListener(ASSISTANT_PURCHASE_FILTER_EVENT, onAssistantFilters);
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setItems([INITIAL_ITEM]);
    setAttachments([]);
    setForm(current => ({
      ...INITIAL_FORM,
      documentNumber: nextDocQuery.data || current.documentNumber,
      requestDate: current.requestDate,
    }));
  };

  const setField = <K extends keyof RequestFormState>(
    field: K,
    value: RequestFormState[K]
  ) => {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  };

  const addItem = () => {
    setItems(current => [...current, { ...INITIAL_ITEM }]);
  };

  const removeItem = (index: number) => {
    setItems(current => {
      if (current.length <= 1) return current;
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const updateItem = <K extends keyof RequestItemForm>(
    index: number,
    field: K,
    value: RequestItemForm[K]
  ) => {
    setItems(current =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const validateForm = (status: PurchaseRequestStatus) => {
    if (!form.documentNumber.trim()) return "Documento é obrigatório";

    if (status === "rascunho") {
      return null;
    }

    if (!form.requestDate.trim()) return "Data da solicitação é obrigatória";
    if (!form.neededDate.trim()) return "Data necessária é obrigatória";
    if (!form.company.trim()) return "Empresa é obrigatória";
    if (!form.costCenter.trim()) return "Centro de custo é obrigatório";
    if (!form.purchaseType.trim()) return "Tipo de compra é obrigatório";
    if (!form.requesterName.trim()) return "Nome do solicitante é obrigatório";
    if (!form.requesterEmail.trim()) return "E-mail do solicitante é obrigatório";
    if (!form.justification.trim()) return "Justificativa é obrigatória";

    if (items.length === 0) return "Adicione ao menos um item";

    const invalidItem = items.find(
      item =>
        !item.description.trim() ||
        !item.unit.trim() ||
        item.quantity <= 0 ||
        item.unitPrice < 0
    );

    if (invalidItem) {
      return "Preencha todos os campos dos itens corretamente";
    }

    return null;
  };

  const loadRequestForEdit = (request: any) => {
    setEditingId(request.id);
    setForm({
      documentNumber: request.documentNumber,
      requestDate: request.requestDate,
      neededDate: request.neededDate,
      urgency: request.urgency,
      company: request.company,
      costCenter: request.costCenter,
      purchaseType: request.purchaseType,
      requesterName: request.requesterName,
      requesterRegistration: request.requesterRegistration || "",
      requesterRole: request.requesterRole || "",
      requesterEmail: request.requesterEmail,
      requesterPhone: request.requesterPhone || "",
      supplierName: request.supplierName || "",
      supplierDocument: request.supplierDocument || "",
      supplierContact: request.supplierContact || "",
      supplierDeliveryEstimate: request.supplierDeliveryEstimate || "",
      justification: request.justification,
      observations: request.observations || "",
      financeApproved: Boolean(request.financeApproved),
      billingCnpj: request.billingCnpj || "",
      paymentTerms: request.paymentTerms || "",
      status: request.status,
    });

    const requestItems = Array.isArray(request.items) ? request.items : [];
    setItems(
      requestItems.length > 0
        ? requestItems.map((item: any) => ({
            description: item.description || "",
            unit: item.unit || "UN",
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || 0),
            supplierSuggestion: item.supplierSuggestion || "",
          }))
        : [{ ...INITIAL_ITEM }]
    );

    const parsedAttachments = Array.isArray(request.attachments)
      ? request.attachments
      : [];
    setAttachments(parsedAttachments as AttachmentMeta[]);
  };

  const getStepState = (
    requestStatus: PurchaseRequestStatus,
    stepKey: PurchaseRequestStatus
  ) => {
    if (requestStatus === "cancelado") return "pending" as const;
    if (requestStatus === "rascunho") return "pending" as const;

    const currentIndex = APPROVAL_FLOW.findIndex(step => step.key === requestStatus);
    const stepIndex = APPROVAL_FLOW.findIndex(step => step.key === stepKey);

    if (currentIndex < 0 || stepIndex < 0) return "pending" as const;
    if (stepIndex < currentIndex) return "done" as const;
    if (stepIndex === currentIndex) return "current" as const;
    return "pending" as const;
  };

  const buildDialogEditState = (request: PurchaseRequestDetail): RequestDialogEditState => ({
    status: request.status,
    neededDate: request.neededDate || "",
    urgency: request.urgency,
    supplierName: request.supplierName || "",
    supplierContact: request.supplierContact || "",
    supplierDeliveryEstimate: request.supplierDeliveryEstimate || "",
    justification: request.justification || "",
    observations: request.observations || "",
    financeApproved: Boolean(request.financeApproved),
    billingCnpj: request.billingCnpj || "",
    paymentTerms: request.paymentTerms || "",
  });

  const openRequestDialog = async (requestId: number) => {
    setIsRequestDialogOpen(true);
    setIsRequestDialogLoading(true);
    setIsRequestDialogEditing(false);
    setDialogEdit(null);
    setSelectedRequest(null);

    try {
      const loaded = await utils.purchaseRequests.getById.fetch(requestId);

      if (!loaded) {
        toast.error("Solicitação não encontrada");
        setSelectedRequest(null);
        setIsRequestDialogOpen(false);
        return;
      }

      const requestDetail = loaded as PurchaseRequestDetail;
      setSelectedRequest(requestDetail);
      setDialogEdit(buildDialogEditState(requestDetail));
    } catch (error) {
      console.error(error);
      toast.error("Falha ao abrir detalhes da solicitação");
      setSelectedRequest(null);
      setIsRequestDialogOpen(false);
    } finally {
      setIsRequestDialogLoading(false);
    }
  };

  const saveDialogEdit = async () => {
    if (!selectedRequest || !dialogEdit) return;

    if (dialogEdit.status !== "rascunho" && !dialogEdit.justification.trim()) {
      toast.error("Justificativa é obrigatória");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: selectedRequest.id,
        status: dialogEdit.status,
        neededDate: dialogEdit.neededDate,
        urgency: dialogEdit.urgency,
        supplierName: dialogEdit.supplierName || undefined,
        supplierContact: dialogEdit.supplierContact || undefined,
        supplierDeliveryEstimate: dialogEdit.supplierDeliveryEstimate || undefined,
        justification: dialogEdit.justification,
        observations: dialogEdit.observations || undefined,
        financeApproved: dialogEdit.financeApproved,
        billingCnpj: dialogEdit.billingCnpj || undefined,
        paymentTerms: dialogEdit.paymentTerms || undefined,
        items: selectedRequestItems.map((item, index) => ({
          itemOrder: index + 1,
          description: item.description,
          unit: item.unit,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          supplierSuggestion: item.supplierSuggestion || undefined,
        })),
      });

      await sendWebhookIfConfigured(selectedRequest.id, "updated");
      const refreshed = await utils.purchaseRequests.getById.fetch(selectedRequest.id);

      if (refreshed) {
        const requestDetail = refreshed as PurchaseRequestDetail;
        setSelectedRequest(requestDetail);
        setDialogEdit(buildDialogEditState(requestDetail));
      }

      setIsRequestDialogEditing(false);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao salvar alterações no modal");
    }
  };

  const openAttachment = (attachment: AttachmentMeta) => {
    if (!attachment.url) {
      toast.warning(
        "Este anexo não tem link direto. Faça upload novamente para habilitar abertura."
      );
      return;
    }

    window.open(attachment.url, "_blank", "noopener,noreferrer");
  };

  const sendWebhookIfConfigured = async (
    requestId: number,
    action: "created" | "updated"
  ) => {
    if (!webhookUrl.trim()) return;

    try {
      const result = await webhookMutation.mutateAsync({
        requestId,
        action,
        webhookUrl: webhookUrl.trim(),
        responsibleEmail: responsibleEmail.trim() || undefined,
      });
      const attempts = Number((result as any).attempts || 1);

      if (!result.delivered) {
        const message = result.errorMessage
          ? `Solicitação salva, mas webhook falhou após ${attempts} tentativa(s) (${result.errorMessage}).`
          : `Solicitação salva, mas webhook falhou após ${attempts} tentativa(s). Verifique a configuração.`;
        toast.warning(message);
        return;
      }

      toast.success(`Webhook enviado com sucesso (${attempts} tentativa(s))`);
    } catch (error) {
      console.error(error);
      toast.warning(
        "Solicitação salva, mas o envio para o webhook falhou. Verifique a configuração."
      );
    }
  };

  const persistRequest = async (status: PurchaseRequestStatus) => {
    const validationError = validateForm(status);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const shouldPersistItemInDraft = (item: RequestItemForm) => {
      return (
        item.description.trim().length > 0 ||
        item.supplierSuggestion.trim().length > 0 ||
        item.unitPrice > 0 ||
        item.quantity !== 1 ||
        item.unit !== "UN"
      );
    };

    const payloadItems =
      status === "rascunho"
        ? items
            .filter(shouldPersistItemInDraft)
            .map(item => ({
              description: item.description.trim() || "Item pendente",
              unit: item.unit.trim() || "UN",
              quantity: item.quantity > 0 ? item.quantity : 1,
              unitPrice: item.unitPrice >= 0 ? item.unitPrice : 0,
              supplierSuggestion: item.supplierSuggestion,
            }))
        : items;

    const payload = {
      ...form,
      status,
      attachments,
      items: payloadItems,
      financeApproved: form.financeApproved,
      billingCnpj: form.billingCnpj || undefined,
      paymentTerms: form.paymentTerms || undefined,
    };

    if (editingId) {
      const requestId = editingId;
      await updateMutation.mutateAsync({ id: requestId, ...payload });
      await sendWebhookIfConfigured(requestId, "updated");
    } else {
      const result = await createMutation.mutateAsync(payload);
      if (result?.id) {
        await sendWebhookIfConfigured(result.id, "created");
      }
    }
  };

  const handleDeleteRequest = (id: number) => {
    if (!window.confirm("Tem certeza que deseja remover esta solicitação?")) {
      return;
    }

    deleteMutation.mutate(id);
  };

  const updateWebhookConfig = () => {
    localStorage.setItem(WEBHOOK_URL_KEY, webhookUrl);
    localStorage.setItem(RESPONSIBLE_EMAIL_KEY, responsibleEmail);
    setIsWebhookDialogOpen(false);
    toast.success("Integração de webhook atualizada");
  };

  const currentStepIndex = APPROVAL_FLOW.findIndex(step => step.key === form.status);
  const currentFlowLabel =
    form.status === "rascunho"
      ? "Rascunho em elaboração"
      : form.status === "cancelado"
        ? "Solicitação cancelada"
        : APPROVAL_FLOW[Math.max(currentStepIndex, 0)]?.label || "Em análise";
  const completedFlowSteps =
    form.status === "cancelado" || form.status === "rascunho"
      ? 0
      : Math.max(0, currentStepIndex + 1);

  const selectedRequestItems = useMemo(() => {
    if (!selectedRequest || !Array.isArray(selectedRequest.items)) return [];
    return selectedRequest.items;
  }, [selectedRequest]);

  const selectedRequestAttachments = useMemo(() => {
    if (!selectedRequest || !Array.isArray(selectedRequest.attachments)) return [];
    return selectedRequest.attachments as AttachmentMeta[];
  }, [selectedRequest]);

  const selectedRequestTotalAmount = Number(selectedRequest?.totalAmount || 0);

  return (
    <div className="space-y-6">
      <Dialog open={isWebhookDialogOpen} onOpenChange={setIsWebhookDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Configurar webhook</DialogTitle>
            <DialogDescription className="text-gray-400">
              URL do Power Automate para envio automático da solicitação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">URL do Webhook</Label>
              <Input
                value={webhookUrl}
                onChange={event => setWebhookUrl(event.target.value)}
                placeholder="https://prod-xx.logic.azure.com/..."
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">E-mail responsável (opcional)</Label>
              <Input
                type="email"
                value={responsibleEmail}
                onChange={event => setResponsibleEmail(event.target.value)}
                placeholder="compras@grupofrz.com.br"
                className="mt-1 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-800"
                onClick={() => setIsWebhookDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-sky-600 hover:bg-sky-700"
                onClick={updateWebhookConfig}
              >
                Salvar configuração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRequestDialogOpen}
        onOpenChange={open => {
          setIsRequestDialogOpen(open);
          if (!open) {
            setSelectedRequest(null);
            setDialogEdit(null);
            setIsRequestDialogEditing(false);
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[1100px] max-h-[92vh] min-h-[360px] md:min-h-[520px] md:min-w-[760px] overflow-auto md:resize bg-slate-900 border-slate-700 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white">Detalhes da solicitação de compras</DialogTitle>
            <DialogDescription className="text-gray-400">
              Visualização completa da solicitação selecionada, incluindo o fluxo
              atualizado de aprovação.
            </DialogDescription>
          </DialogHeader>

          {isRequestDialogLoading ? (
            <div className="py-12 flex items-center justify-center gap-3 text-gray-300">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Carregando solicitação...
            </div>
          ) : !selectedRequest ? (
            <div className="py-10 text-center text-gray-400">
              Não foi possível carregar os detalhes desta solicitação.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Documento</p>
                  <p className="text-xl text-sky-300 font-semibold">
                    {selectedRequest.documentNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                      selectedRequest.status
                    )}`}
                  >
                    {STATUS_LABELS[selectedRequest.status]}
                  </span>
                  {isRequestDialogEditing ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-600 text-gray-200 hover:bg-slate-800"
                        onClick={() => {
                          setIsRequestDialogEditing(false);
                          if (selectedRequest) {
                            setDialogEdit(buildDialogEditState(selectedRequest));
                          }
                        }}
                        disabled={isSaving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        className="bg-sky-600 hover:bg-sky-700"
                        onClick={() => {
                          void saveDialogEdit();
                        }}
                        disabled={isSaving}
                      >
                        Salvar no modal
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600 text-gray-200 hover:bg-slate-800"
                      onClick={() => setIsRequestDialogEditing(true)}
                    >
                      Editar solicitação
                    </Button>
                  )}
                </div>
              </div>

              {isRequestDialogEditing && dialogEdit && (
                <div className="rounded-md border border-sky-700/40 bg-sky-950/20 p-3 space-y-3">
                  <p className="text-sm font-medium text-sky-200">Edição rápida no modal</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300">Status</Label>
                      <Select
                        value={dialogEdit.status}
                        onValueChange={value =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  status: value as PurchaseRequestStatus,
                                }
                              : current
                          )
                        }
                      >
                        <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as PurchaseRequestStatus[]).map(status => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Data necessária</Label>
                      <DateInputWithCalendar
                        value={dialogEdit.neededDate}
                        onChange={value =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  neededDate: value,
                                }
                              : current
                          )
                        }
                        className="mt-1 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Urgência</Label>
                      <Select
                        value={dialogEdit.urgency}
                        onValueChange={value =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  urgency: value as PurchaseRequestUrgency,
                                }
                              : current
                          )
                        }
                      >
                        <SelectTrigger className="mt-1 bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Fornecedor sugerido</Label>
                      <Input
                        value={dialogEdit.supplierName}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  supplierName: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Contato fornecedor</Label>
                      <Input
                        value={dialogEdit.supplierContact}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  supplierContact: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Previsão de entrega</Label>
                      <Input
                        value={dialogEdit.supplierDeliveryEstimate}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  supplierDeliveryEstimate: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">CNPJ faturamento</Label>
                      <Input
                        value={dialogEdit.billingCnpj}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  billingCnpj: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Condição de pagamento</Label>
                      <Input
                        value={dialogEdit.paymentTerms}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  paymentTerms: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-300">Justificativa</Label>
                      <textarea
                        value={dialogEdit.justification}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  justification: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 min-h-20 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-gray-300">Observações</Label>
                      <textarea
                        value={dialogEdit.observations}
                        onChange={event =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  observations: event.target.value,
                                }
                              : current
                          )
                        }
                        className="mt-1 min-h-16 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2">
                      <p className="text-sm text-gray-300">Aprovado no financeiro</p>
                      <Button
                        type="button"
                        variant="outline"
                        className={`border-slate-600 ${
                          dialogEdit.financeApproved
                            ? "text-green-300 bg-green-900/20"
                            : "text-gray-300"
                        }`}
                        onClick={() =>
                          setDialogEdit(current =>
                            current
                              ? {
                                  ...current,
                                  financeApproved: !current.financeApproved,
                                }
                              : current
                          )
                        }
                      >
                        {dialogEdit.financeApproved ? "Sim" : "Não"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Data da solicitação</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.requestDate}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Data necessária</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.neededDate}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Urgência</p>
                  <p className="text-sm text-white mt-1">
                    {URGENCY_LABELS[selectedRequest.urgency]}
                  </p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Atualizado em</p>
                  <p className="text-sm text-white mt-1">
                    {formatDateTime(selectedRequest.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-white mb-3">Fluxo de aprovação</p>
                {selectedRequest.status === "cancelado" ? (
                  <p className="text-sm text-red-300">
                    Solicitação cancelada. Fluxo de aprovação interrompido.
                  </p>
                ) : selectedRequest.status === "rascunho" ? (
                  <p className="text-sm text-slate-300">
                    Solicitação em rascunho, aguardando envio para iniciar o fluxo.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {APPROVAL_FLOW.map((step, index) => {
                      const stepState = getStepState(selectedRequest.status, step.key);
                      const markerClass =
                        stepState === "done"
                          ? "bg-emerald-500 border-emerald-400"
                          : stepState === "current"
                            ? "bg-sky-500 border-sky-400"
                            : "bg-slate-700 border-slate-500";

                      return (
                        <div
                          key={step.key}
                          className="flex items-center gap-3 rounded-md border border-slate-700 bg-slate-900/60 p-2"
                        >
                          <span
                            className={`h-6 w-6 rounded-full border flex items-center justify-center text-[11px] text-white ${markerClass}`}
                          >
                            {stepState === "done" ? <Check className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm text-white">{step.label}</p>
                            <p className="text-xs text-gray-400">
                              {stepState === "current"
                                ? "Etapa atual"
                                : stepState === "done"
                                  ? "Etapa concluída"
                                  : "Aguardando etapa"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">Integração FRZ COUNT</p>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getIntegrationBadgeClass(
                      selectedRequest.integrationCallbackLastStatus ||
                        selectedRequest.integrationWebhookLastStatus
                    )}`}
                  >
                    {getIntegrationSummary(selectedRequest)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Envios webhook</p>
                    <p className="text-sm text-white mt-1">
                      {selectedRequest.integrationWebhookAttempts ?? 0} tentativa(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Callbacks recebidos</p>
                    <p className="text-sm text-white mt-1">
                      {selectedRequest.integrationCallbackAttempts ?? 0} evento(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Último envio</p>
                    <p className="text-sm text-white mt-1">
                      {formatDateTime(selectedRequest.integrationWebhookLastAttemptAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Último retorno</p>
                    <p className="text-sm text-white mt-1">
                      {formatDateTime(selectedRequest.integrationCallbackLastAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Status callback</p>
                    <p className="text-sm text-white mt-1">
                      {selectedRequest.integrationCallbackLastStatus || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Decisão externa</p>
                    <p className="text-sm text-white mt-1">
                      {selectedRequest.integrationCallbackLastDecision || "-"}
                    </p>
                  </div>
                </div>

                {(selectedRequest.integrationWebhookLastError ||
                  selectedRequest.integrationCallbackLastError) && (
                  <div className="rounded-md border border-red-500/30 bg-red-900/10 p-2">
                    <p className="text-xs text-red-200">Último erro de integração</p>
                    <p className="text-sm text-red-300 mt-1 whitespace-pre-wrap">
                      {selectedRequest.integrationCallbackLastError ||
                        selectedRequest.integrationWebhookLastError}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Empresa</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.company || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Centro de custo</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.costCenter || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Tipo de compra</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.purchaseType || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Aprovado no financeiro</p>
                  <p className="text-sm text-white mt-1">
                    {selectedRequest.financeApproved ? "Sim" : "Não"}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-white mb-3">Solicitante</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Nome</p>
                    <p className="text-sm text-white mt-1">{selectedRequest.requesterName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">E-mail</p>
                    <p className="text-sm text-white mt-1">{selectedRequest.requesterEmail || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Matrícula</p>
                    <p className="text-sm text-white mt-1">
                      {selectedRequest.requesterRegistration || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Cargo</p>
                    <p className="text-sm text-white mt-1">{selectedRequest.requesterRole || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-white mb-3">Itens da solicitação</p>
                {selectedRequestItems.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum item registrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-gray-300">#</TableHead>
                          <TableHead className="text-gray-300">Descrição</TableHead>
                          <TableHead className="text-gray-300">Unidade</TableHead>
                          <TableHead className="text-gray-300 text-right">Qtd</TableHead>
                          <TableHead className="text-gray-300 text-right">Valor Unit.</TableHead>
                          <TableHead className="text-gray-300 text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequestItems.map((item, index) => {
                          const quantity = Number(item.quantity || 0);
                          const unitPrice = Number(item.unitPrice || 0);
                          const totalPrice = Number(item.totalPrice || quantity * unitPrice);

                          return (
                            <TableRow
                              key={`${selectedRequest.id}-item-${index}`}
                              className="border-slate-700"
                            >
                              <TableCell className="text-gray-200">{index + 1}</TableCell>
                              <TableCell className="text-white">{item.description || "-"}</TableCell>
                              <TableCell className="text-gray-300">{item.unit || "-"}</TableCell>
                              <TableCell className="text-right text-gray-300">{quantity}</TableCell>
                              <TableCell className="text-right text-gray-300">
                                {formatMoney(unitPrice)}
                              </TableCell>
                              <TableCell className="text-right text-sky-300">
                                {formatMoney(totalPrice)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-3 text-right">
                  <p className="text-xs text-gray-400">Valor total</p>
                  <p className="text-lg font-semibold text-sky-300">
                    {formatMoney(selectedRequestTotalAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Fornecedor sugerido</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.supplierName || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Contato fornecedor</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.supplierContact || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Documento fornecedor</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.supplierDocument || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Previsão de entrega</p>
                  <p className="text-sm text-white mt-1">
                    {selectedRequest.supplierDeliveryEstimate || "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-white mb-2">Justificativa</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">
                  {selectedRequest.justification || "-"}
                </p>
                <p className="text-sm font-medium text-white mt-4 mb-2">Observações</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">
                  {selectedRequest.observations || "-"}
                </p>
              </div>

              <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                <p className="text-sm font-medium text-white mb-2">Anexos</p>
                {selectedRequestAttachments.length === 0 ? (
                  <p className="text-sm text-gray-400">Sem anexos informados.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRequestAttachments.map((attachment, index) => (
                      <div
                        key={`${attachment.name}-${index}`}
                        className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 flex items-center justify-between gap-3"
                      >
                        <p className="text-sm text-white break-words">{attachment.name}</p>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-xs text-gray-400">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-gray-200 hover:bg-slate-800"
                            onClick={() => openAttachment(attachment)}
                          >
                            Abrir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">CNPJ faturamento</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.billingCnpj || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400">Condição de pagamento</p>
                  <p className="text-sm text-white mt-1">{selectedRequest.paymentTerms || "-"}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Criada em</p>
                  <p className="text-sm text-white mt-1">{formatDateTime(selectedRequest.createdAt)}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Atualizada em</p>
                  <p className="text-sm text-white mt-1">{formatDateTime(selectedRequest.updatedAt)}</p>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Concluída em</p>
                  <p className="text-sm text-white mt-1">
                    {formatDateTime(selectedRequest.completedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white">Solicitação de Compras</h1>
          <p className="text-gray-400 mt-1">
            Registro completo de necessidades, cotação, aprovação e recebimento.
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Documento</p>
          <p className="text-xl font-semibold text-sky-300">
            {form.documentNumber || "Gerando..."}
          </p>
          <span
            className={`inline-flex mt-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
              form.status
            )}`}
          >
            {STATUS_LABELS[form.status]}
          </span>
          <p className="mt-2 text-xs text-gray-300">
            Etapa atual: <span className="text-sky-300">{currentFlowLabel}</span>
          </p>
          <p className="text-xs text-gray-400">
            Progresso: {completedFlowSteps}/{APPROVAL_FLOW.length}
          </p>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardContent className="pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">Integração</p>
            <p className="text-sm text-gray-300 mt-1 break-all">
              {webhookUrl ? `Webhook ativo: ${webhookUrl}` : "Webhook não configurado"}
            </p>
            {responsibleEmail && (
              <p className="text-xs text-sky-300 mt-1">Responsável: {responsibleEmail}</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
            onClick={() => setIsWebhookDialogOpen(true)}
          >
            <Workflow className="h-4 w-4 mr-2" />
            Configurar webhook
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">1. Identificação da necessidade</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div>
            <Label className="text-gray-300">Data da solicitação *</Label>
            <DateInputWithCalendar
              value={form.requestDate}
              onChange={value => setField("requestDate", value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Data necessária *</Label>
            <DateInputWithCalendar
              value={form.neededDate}
              onChange={value => setField("neededDate", value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Urgência *</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {([
                ["baixa", "Baixa"],
                ["normal", "Normal"],
                ["alta", "Alta"],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className={`border-slate-600 ${
                    form.urgency === key
                      ? "bg-sky-700/30 text-sky-200 border-sky-500"
                      : "text-gray-300 hover:bg-slate-700"
                  }`}
                  onClick={() => setField("urgency", key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-gray-300">Empresa *</Label>
            <Select value={form.company} onValueChange={value => setField("company", value)}>
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {mergedCompanies.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Centro de custo *</Label>
            <Select
              value={form.costCenter}
              onValueChange={value => setField("costCenter", value)}
            >
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {mergedCostCenters.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Tipo de compra *</Label>
            <Select
              value={form.purchaseType}
              onValueChange={value => setField("purchaseType", value)}
            >
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {mergedPurchaseTypes.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">2. Solicitante</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-gray-300">Nome completo *</Label>
            <Input
              value={form.requesterName}
              onChange={event => setField("requesterName", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Matrícula/ID</Label>
            <Input
              value={form.requesterRegistration}
              onChange={event => setField("requesterRegistration", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Cargo/função</Label>
            <Input
              value={form.requesterRole}
              onChange={event => setField("requesterRole", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">E-mail *</Label>
            <Input
              type="email"
              value={form.requesterEmail}
              onChange={event => setField("requesterEmail", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Telefone</Label>
            <Input
              value={form.requesterPhone}
              onChange={event => setField("requesterPhone", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">3. Itens da solicitação</CardTitle>
          <CardDescription className="text-gray-400">
            Inclua descrição, quantidade e valor unitário para calcular o total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-700/40">
                  <TableHead className="text-gray-300">#</TableHead>
                  <TableHead className="text-gray-300">Descrição</TableHead>
                  <TableHead className="text-gray-300">Unidade</TableHead>
                  <TableHead className="text-gray-300 text-right">Qtd</TableHead>
                  <TableHead className="text-gray-300 text-right">Valor Unit.</TableHead>
                  <TableHead className="text-gray-300 text-right">Total</TableHead>
                  <TableHead className="text-gray-300">Fornecedor sugerido</TableHead>
                  <TableHead className="text-gray-300 text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const itemTotal = item.quantity * item.unitPrice;

                  return (
                    <TableRow key={`item-${index}`} className="border-slate-700">
                      <TableCell className="text-gray-300">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={event =>
                            updateItem(index, "description", event.target.value)
                          }
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={value => updateItem(index, "unit", value)}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map(unit => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={item.quantity}
                          onChange={event =>
                            updateItem(index, "quantity", Number(event.target.value || 0))
                          }
                          className="bg-slate-700 border-slate-600 text-white text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unitPrice}
                          onChange={event =>
                            updateItem(index, "unitPrice", Number(event.target.value || 0))
                          }
                          className="bg-slate-700 border-slate-600 text-white text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sky-300 font-medium">
                        {formatMoney(itemTotal)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.supplierSuggestion}
                          onChange={event =>
                            updateItem(index, "supplierSuggestion", event.target.value)
                          }
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-500/40 text-red-300 hover:bg-red-900/20"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Button
            type="button"
            variant="outline"
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
            onClick={addItem}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar item
          </Button>

          <div className="rounded-lg bg-slate-900 border border-slate-700 p-4 flex flex-col sm:flex-row sm:justify-end gap-4 sm:gap-10">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-400">Qtd total</p>
              <p className="text-lg text-white font-semibold">{totals.totalQuantity}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-400">Valor total</p>
              <p className="text-2xl text-sky-300 font-semibold">
                {formatMoney(totals.totalAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">4. Fornecedor sugerido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label className="text-gray-300">Fornecedor</Label>
            <Input
              value={form.supplierName}
              onChange={event => setField("supplierName", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">CNPJ/CPF</Label>
            <Input
              value={form.supplierDocument}
              onChange={event => setField("supplierDocument", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-gray-300">Contato/Website</Label>
            <Input
              value={form.supplierContact}
              onChange={event => setField("supplierContact", event.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div>
            <Label className="text-gray-300">Prazo estimado</Label>
            <Input
              value={form.supplierDeliveryEstimate}
              onChange={event =>
                setField("supplierDeliveryEstimate", event.target.value)
              }
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">5. Justificativa e observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Justificativa *</Label>
            <textarea
              value={form.justification}
              onChange={event => setField("justification", event.target.value)}
              maxLength={500}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white"
              placeholder="Motivo e impacto da compra"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.justification.length}/500
            </p>
          </div>

          <div>
            <Label className="text-gray-300">Observações</Label>
            <textarea
              value={form.observations}
              onChange={event => setField("observations", event.target.value)}
              maxLength={300}
              className="mt-1 min-h-20 w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white"
              placeholder="Especificações técnicas e detalhes"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {form.observations.length}/300
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">6. Anexos e cotações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block rounded-lg border-2 border-dashed border-slate-600 bg-slate-900/60 p-6 text-center cursor-pointer hover:border-sky-500 transition-colors">
            <Paperclip className="h-8 w-8 mx-auto text-sky-400 mb-2" />
            <p className="text-gray-300 text-sm">
              Clique para anexar arquivos (PDF, Excel, Word, imagem)
            </p>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={event => {
                const metadata = toAttachmentMeta(event.target.files);
                setAttachments(current => [...current, ...metadata]);
              }}
            />
          </label>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded bg-slate-700 text-gray-200 text-xs"
                >
                  <button type="button" onClick={() => openAttachment(file)}>
                    {file.name}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments(current =>
                        current.filter((_, currentIndex) => currentIndex !== index)
                      )
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">7. Fluxo de aprovação</CardTitle>
          <CardDescription className="text-gray-400">
            Compras acima de R$ 5.000 devem seguir aprovação de diretoria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {APPROVAL_FLOW.map((step, index) => {
              const active = currentStepIndex >= index && form.status !== "cancelado";

              return (
                <div
                  key={step.key}
                  className={`rounded-md border p-3 text-center ${
                    active
                      ? "border-sky-500 bg-sky-900/20"
                      : "border-slate-700 bg-slate-900/60"
                  }`}
                >
                  <div
                    className={`mx-auto mb-2 h-7 w-7 rounded-full flex items-center justify-center ${
                      active ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {active ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <p className="text-xs text-gray-300">{step.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300">Status atual</Label>
              <Select
                value={form.status}
                onValueChange={value => setField("status", value as PurchaseRequestStatus)}
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as PurchaseRequestStatus[]).map(status => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">CNPJ de faturamento</Label>
              <Input
                value={form.billingCnpj}
                onChange={event => setField("billingCnpj", event.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Condição de pagamento</Label>
              <Input
                value={form.paymentTerms}
                onChange={event => setField("paymentTerms", event.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-red-500/50 text-red-300 hover:bg-red-900/20"
            onClick={resetForm}
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
            onClick={() => persistRequest("rascunho")}
            disabled={isSaving}
          >
            <FilePlus2 className="h-4 w-4 mr-2" />
            Salvar rascunho
          </Button>
        </div>

        <div className="flex gap-2">
          {editingId && (
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 text-gray-300 hover:bg-slate-800"
              onClick={resetForm}
              disabled={isSaving}
            >
              Cancelar edição
            </Button>
          )}
          <Button
            type="button"
            className="bg-sky-600 hover:bg-sky-700"
            onClick={() => persistRequest(form.status === "rascunho" ? "solicitado" : form.status)}
            disabled={isSaving}
          >
            <Send className="h-4 w-4 mr-2" />
            {editingId ? "Atualizar solicitação" : "Enviar solicitação"}
          </Button>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-white">Solicitações registradas</CardTitle>
            <CardDescription className="text-gray-400">
              Clique na linha para abrir o modal completo da solicitação.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div>
              <Label className="text-gray-300">Buscar</Label>
              <Input
                value={listFilters.search}
                onChange={event =>
                  setListFilters(current => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Documento, empresa, solicitante..."
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Status</Label>
              <Select
                value={listFilters.status}
                onValueChange={value =>
                  setListFilters(current => ({
                    ...current,
                    status: value as "all" | PurchaseRequestStatus,
                  }))
                }
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.keys(STATUS_LABELS) as PurchaseRequestStatus[]).map(status => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Urgência</Label>
              <Select
                value={listFilters.urgency}
                onValueChange={value =>
                  setListFilters(current => ({
                    ...current,
                    urgency: value as "all" | PurchaseRequestUrgency,
                  }))
                }
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Empresa</Label>
              <Select
                value={listFilters.company}
                onValueChange={value =>
                  setListFilters(current => ({
                    ...current,
                    company: value,
                  }))
                }
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {mergedCompanies.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-600 text-gray-300 hover:bg-slate-800"
                onClick={() =>
                  setListFilters({
                    status: "all",
                    urgency: "all",
                    company: "all",
                    search: "",
                  })
                }
              >
                Limpar filtros
              </Button>
            </div>
          </div>

          {requestsQuery.isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando solicitações...</div>
          ) : (requestsQuery.data || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhuma solicitação registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/40">
                    <TableHead className="text-gray-300">Documento</TableHead>
                    <TableHead className="text-gray-300">Empresa</TableHead>
                    <TableHead className="text-gray-300">Solicitante</TableHead>
                    <TableHead className="text-gray-300">Urgência</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Integração</TableHead>
                    <TableHead className="text-gray-300 text-right">Total</TableHead>
                    <TableHead className="text-gray-300 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(requestsQuery.data || []).map((request: any) => (
                    <TableRow
                      key={request.id}
                      className="border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => {
                        void openRequestDialog(request.id);
                      }}
                    >
                      <TableCell className="text-white font-medium">
                        {request.documentNumber}
                      </TableCell>
                      <TableCell className="text-gray-300">{request.company}</TableCell>
                      <TableCell className="text-gray-300">{request.requesterName}</TableCell>
                      <TableCell className="text-gray-300 capitalize">
                        {request.urgency}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                            request.status
                          )}`}
                        >
                          {STATUS_LABELS[request.status as PurchaseRequestStatus]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getIntegrationBadgeClass(
                            request.integrationCallbackLastStatus ||
                              request.integrationWebhookLastStatus
                          )}`}
                        >
                          {getIntegrationSummary(request)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sky-300">
                        {formatMoney(Number(request.totalAmount || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 text-red-300 hover:bg-red-900/20"
                          onClick={event => {
                            event.stopPropagation();
                            handleDeleteRequest(request.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
