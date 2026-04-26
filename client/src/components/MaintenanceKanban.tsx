import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock, Plus } from "lucide-react";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MaintenanceRequest {
  id: number;
  title: string;
  description?: string;
  requesterName?: string;
  department?: string;
  requestDate?: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  type: "preventiva" | "correctiva";
  status: "aberto" | "em_progresso" | "concluido" | "cancelado";
  createdAt: string;
}

interface MaintenanceKanbanProps {
  requests: MaintenanceRequest[];
  onUpdateStatus: (id: number, newStatus: string) => void;
  onSaveRequest: (
    id: number,
    data: Partial<MaintenanceRequest>
  ) => void | Promise<void>;
  isLoading?: boolean;
  departmentOptions?: string[];
  onAddDepartmentOption?: (department: string) => boolean;
}

type EditableRequestData = {
  title: string;
  description: string;
  requesterName: string;
  department: string;
  requestDate: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  type: "preventiva" | "correctiva";
  status: "aberto" | "em_progresso" | "concluido" | "cancelado";
};

const STATUS_COLUMNS = [
  { id: "aberto", label: "Aberto", color: "bg-yellow-900/30 border-yellow-700/50" },
  {
    id: "em_progresso",
    label: "Em Progresso",
    color: "bg-blue-900/30 border-blue-700/50",
  },
  {
    id: "concluido",
    label: "Concluído",
    color: "bg-green-900/30 border-green-700/50",
  },
  {
    id: "cancelado",
    label: "Cancelado",
    color: "bg-red-900/30 border-red-700/50",
  },
] as const;

const ADD_DEPARTMENT_VALUE = "__add_new_department__";
const NO_DEPARTMENT_VALUE = "__no_department__";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgente":
      return "bg-red-900/50 text-red-300";
    case "alta":
      return "bg-sky-900/50 text-sky-300";
    case "media":
      return "bg-yellow-900/50 text-yellow-300";
    case "baixa":
      return "bg-green-900/50 text-green-300";
    default:
      return "bg-gray-900/50 text-gray-300";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "aberto":
      return <AlertTriangle className="w-4 h-4" />;
    case "em_progresso":
      return <Clock className="w-4 h-4" />;
    case "concluido":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return null;
  }
};

const formatStatusLabel = (status: string) => {
  if (status === "aberto") return "Aberto";
  if (status === "em_progresso") return "Em Progresso";
  if (status === "concluido") return "Concluído";
  if (status === "cancelado") return "Cancelado";
  return status;
};

function toEditableData(request: MaintenanceRequest): EditableRequestData {
  return {
    title: request.title || "",
    description: request.description || "",
    requesterName: request.requesterName || "",
    department: request.department || "",
    requestDate: request.requestDate || "",
    priority: request.priority,
    type: request.type,
    status: request.status,
  };
}

export function MaintenanceKanban({
  requests,
  onUpdateStatus,
  onSaveRequest,
  isLoading = false,
  departmentOptions = [],
  onAddDepartmentOption,
}: MaintenanceKanbanProps) {
  const [draggedCard, setDraggedCard] = useState<number | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [modalData, setModalData] = useState<EditableRequestData | null>(null);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  const activeRequest = useMemo(
    () => requests.find(item => item.id === activeRequestId) || null,
    [requests, activeRequestId]
  );

  const isModalOpen = Boolean(activeRequestId && modalData);

  const handleDragStart = (e: React.DragEvent, requestId: number) => {
    setDraggedCard(requestId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, statusId: string) => {
    e.preventDefault();

    if (draggedCard === null) return;

    const request = requests.find(item => item.id === draggedCard);
    if (request && request.status !== statusId) {
      onUpdateStatus(draggedCard, statusId);
    }

    setDraggedCard(null);
  };

  const openRequestModal = (request: MaintenanceRequest) => {
    setActiveRequestId(request.id);
    setModalData(toEditableData(request));
    setIsAddingDepartment(false);
    setNewDepartmentName("");
  };

  const closeRequestModal = () => {
    setActiveRequestId(null);
    setModalData(null);
    setIsAddingDepartment(false);
    setNewDepartmentName("");
  };

  const updateModalField = <T extends keyof EditableRequestData>(
    field: T,
    value: EditableRequestData[T]
  ) => {
    setModalData(current => {
      if (!current) return current;
      return {
        ...current,
        [field]: value,
      };
    });
  };

  const handleAddDepartment = () => {
    const department = newDepartmentName.trim();

    if (!department) {
      toast.error("Digite o nome do departamento");
      return;
    }

    const exists = departmentOptions.some(
      option => option.toLowerCase() === department.toLowerCase()
    );

    if (exists) {
      toast.error("Esse departamento já existe na lista");
      return;
    }

    const added = onAddDepartmentOption?.(department);
    if (added === false) {
      return;
    }

    updateModalField("department", department);
    setNewDepartmentName("");
    setIsAddingDepartment(false);
  };

  const handleSaveChanges = async () => {
    if (!activeRequest || !modalData) return;

    if (!modalData.title.trim()) {
      toast.error("O título do chamado é obrigatório");
      return;
    }

    const payload: Partial<MaintenanceRequest> = {};

    if (modalData.title.trim() !== (activeRequest.title || "")) {
      payload.title = modalData.title.trim();
    }

    if ((modalData.description || "") !== (activeRequest.description || "")) {
      payload.description = modalData.description || "";
    }

    if ((modalData.requesterName || "") !== (activeRequest.requesterName || "")) {
      payload.requesterName = modalData.requesterName.trim();
    }

    if ((modalData.department || "") !== (activeRequest.department || "")) {
      payload.department = modalData.department || "";
    }

    if ((modalData.requestDate || "") !== (activeRequest.requestDate || "")) {
      if (modalData.requestDate && !/^\d{2}-\d{2}-\d{4}$/.test(modalData.requestDate)) {
        toast.error("Data do chamado inválida. Use DD-MM-YYYY");
        return;
      }

      payload.requestDate = modalData.requestDate || "";
    }

    if (modalData.priority !== activeRequest.priority) {
      payload.priority = modalData.priority;
    }

    if (modalData.type !== activeRequest.type) {
      payload.type = modalData.type;
    }

    if (modalData.status !== activeRequest.status) {
      payload.status = modalData.status;
    }

    if (Object.keys(payload).length === 0) {
      closeRequestModal();
      return;
    }

    await onSaveRequest(activeRequest.id, payload);
    closeRequestModal();
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map(column => {
            const columnRequests = requests.filter(item => item.status === column.id);

            return (
              <div
                key={column.id}
                className={`rounded-lg border-2 p-4 min-h-96 ${column.color} transition-all`}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, column.id)}
              >
                <div className="mb-4">
                  <h3 className="font-semibold text-white text-lg">{column.label}</h3>
                  <p className="text-sm text-gray-400">{columnRequests.length} chamados</p>
                </div>

                <div className="space-y-3">
                  {columnRequests.map(request => (
                    <div
                      key={request.id}
                      draggable
                      onDragStart={e => handleDragStart(e, request.id)}
                      onClick={() => openRequestModal(request)}
                      className="bg-slate-800 border border-slate-700 rounded-lg p-3 cursor-pointer hover:shadow-lg hover:border-sky-600/50 transition-all"
                    >
                      <h4 className="font-semibold text-white text-sm mb-2 hover:text-sky-300">
                        {request.title}
                      </h4>

                      <div className="flex gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300">
                          {request.type === "preventiva" ? "Preventiva" : "Corretiva"}
                        </span>

                        <span
                          className={`text-xs px-2 py-1 rounded ${getPriorityColor(request.priority)}`}
                        >
                          {request.priority.charAt(0).toUpperCase() +
                            request.priority.slice(1)}
                        </span>
                      </div>

                      {request.description && (
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                          {request.description}
                        </p>
                      )}

                      {request.requesterName && (
                        <p className="text-xs text-gray-300 mb-2">
                          Solicitante: {request.requesterName}
                        </p>
                      )}

                      {(request.department || request.requestDate) && (
                        <div className="mb-2 space-y-1">
                          {request.department && (
                            <p className="text-xs text-gray-300">
                              Departamento: {request.department}
                            </p>
                          )}
                          {request.requestDate && (
                            <p className="text-xs text-gray-300">
                              Data do chamado: {request.requestDate}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                        <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {formatStatusLabel(request.status)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {columnRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">Nenhum chamado</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={open => !open && closeRequestModal()}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">Detalhes do chamado</DialogTitle>
            <DialogDescription className="text-gray-400">
              Edite os campos no estilo de página, como no Notion.
            </DialogDescription>
          </DialogHeader>

          {modalData && activeRequest && (
            <div className="space-y-6">
              <Input
                value={modalData.title}
                onChange={event => updateModalField("title", event.target.value)}
                className="text-xl font-semibold bg-transparent border-slate-700 text-white"
                placeholder="Título do chamado"
                disabled={isLoading}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-400">Status</Label>
                  <Select
                    value={modalData.status}
                    onValueChange={value => updateModalField("status", value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_progresso">Em Progresso</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Prioridade</Label>
                  <Select
                    value={modalData.priority}
                    onValueChange={value => updateModalField("priority", value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Tipo</Label>
                  <Select
                    value={modalData.type}
                    onValueChange={value => updateModalField("type", value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventiva">Preventiva</SelectItem>
                      <SelectItem value="correctiva">Corretiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Nome do Solicitante</Label>
                  <Input
                    value={modalData.requesterName}
                    onChange={event =>
                      updateModalField("requesterName", event.target.value)
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Nome completo de quem solicitou"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Departamento</Label>

                  {isAddingDepartment ? (
                    <div className="space-y-2">
                      <Input
                        value={newDepartmentName}
                        onChange={event => setNewDepartmentName(event.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Novo departamento"
                        disabled={isLoading}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-sky-600 hover:bg-sky-700"
                          onClick={handleAddDepartment}
                          disabled={isLoading}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-gray-300 hover:bg-slate-700"
                          onClick={() => {
                            setIsAddingDepartment(false);
                            setNewDepartmentName("");
                          }}
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select
                      value={modalData.department || NO_DEPARTMENT_VALUE}
                      onValueChange={value => {
                        if (value === ADD_DEPARTMENT_VALUE) {
                          setIsAddingDepartment(true);
                          return;
                        }

                        if (value === NO_DEPARTMENT_VALUE) {
                          updateModalField("department", "");
                          return;
                        }

                        updateModalField("department", value);
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DEPARTMENT_VALUE}>Sem departamento</SelectItem>
                        {departmentOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                        <SelectItem value={ADD_DEPARTMENT_VALUE}>
                          + Novo departamento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Data do chamado</Label>
                  <DateInputWithCalendar
                    value={modalData.requestDate}
                    onChange={value => updateModalField("requestDate", value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-gray-400">Criado em</Label>
                  <div className="h-10 rounded-md border border-slate-700 bg-slate-800 px-3 flex items-center text-gray-300 text-sm">
                    {new Date(activeRequest.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-400">Descrição</Label>
                <textarea
                  value={modalData.description}
                  onChange={event =>
                    updateModalField("description", event.target.value)
                  }
                  placeholder="Descreva o chamado..."
                  className="w-full min-h-36 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-sky-600"
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  onClick={closeRequestModal}
                  disabled={isLoading}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  className="bg-sky-600 hover:bg-sky-700"
                  onClick={handleSaveChanges}
                  disabled={isLoading}
                >
                  Salvar alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
