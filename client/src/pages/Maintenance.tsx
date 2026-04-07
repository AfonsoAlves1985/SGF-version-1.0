import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { MaintenanceSpaceManager } from "@/components/MaintenanceSpaceManager";
import { MaintenanceInlineEdit } from "@/components/MaintenanceInlineEdit";
import { MaintenanceKanban } from "@/components/MaintenanceKanban";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";

export default function Maintenance() {
  const defaultDepartments = [
    "Administrativo",
    "Financeiro",
    "Recursos Humanos",
    "Operações",
    "Manutenção",
    "Limpeza",
    "TI",
    "Comercial",
  ];

  const getInitialFormData = () => ({
    title: "",
    description: "",
    department: "",
    requestDate: "",
    priority: "media" as "urgente" | "alta" | "media" | "baixa",
    type: "correctiva" as "preventiva" | "correctiva",
    status: "aberto" as "aberto" | "em_progresso" | "concluido" | "cancelado",
  });

  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [status, setStatus] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditField, setInlineEditField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [departmentOptions, setDepartmentOptions] =
    useState<string[]>(defaultDepartments);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [formData, setFormData] = useState(getInitialFormData());

  // Queries
  const {
    data: spaces = [],
    isLoading: spacesLoading,
    refetch: refetchSpaces,
  } = trpc.maintenanceSpaces.list.useQuery();

  const {
    data: requests = [],
    isLoading,
    refetch,
  } = trpc.maintenance.list.useQuery({
    status,
    priority,
    spaceId: selectedSpace || undefined,
  });

  useEffect(() => {
    setDepartmentOptions(prev => {
      const existing = new Set(prev.map(option => option.toLowerCase()));
      const discovered: string[] = requests
        .map((request: any) => request.department)
        .filter((department: string | undefined): department is string =>
          Boolean(department && department.trim())
        );

      const toAdd = discovered.filter(
        (department: string) => !existing.has(department.toLowerCase())
      );

      if (toAdd.length === 0) {
        return prev;
      }

      return [...prev, ...toAdd];
    });
  }, [requests]);

  // Mutations - Spaces
  const createSpaceMutation = trpc.maintenanceSpaces.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateSpaceMutation = trpc.maintenanceSpaces.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteSpaceMutation = trpc.maintenanceSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade deletada com sucesso!");
      setSelectedSpace(null);
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Mutations - Requests
  const createMutation = trpc.maintenance.create.useMutation({
    onSuccess: () => {
      toast.success("Chamado criado com sucesso!");
      setFormData(getInitialFormData());
      setIsAddingDepartment(false);
      setNewDepartmentName("");
      setIsDialogOpen(false);
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.maintenance.update.useMutation({
    onSuccess: () => {
      toast.success("Chamado atualizado com sucesso!");
      setEditingRequest(null);
      setFormData(getInitialFormData());
      setIsAddingDepartment(false);
      setNewDepartmentName("");
      setIsDialogOpen(false);
      setInlineEditingId(null);
      setInlineEditField(null);
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.maintenance.delete.useMutation({
    onSuccess: () => {
      toast.success("Chamado eliminado com sucesso!");
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateSample = () => {
    if (!selectedSpace) {
      toast.error("Selecione uma unidade primeiro");
      return;
    }
    setEditingRequest(null);
    setFormData(getInitialFormData());
    setIsAddingDepartment(false);
    setNewDepartmentName("");
    setIsDialogOpen(true);
  };

  const handleEditRequest = (request: any) => {
    if (
      request.department &&
      !departmentOptions.some(
        option => option.toLowerCase() === request.department.toLowerCase()
      )
    ) {
      setDepartmentOptions(prev => [...prev, request.department]);
    }

    setEditingRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      department: request.department || "",
      requestDate: request.requestDate || "",
      priority: request.priority,
      type: request.type,
      status: request.status,
    });
    setIsAddingDepartment(false);
    setNewDepartmentName("");
    setIsDialogOpen(true);
  };

  const addDepartmentOption = (departmentName: string) => {
    const department = departmentName.trim();

    if (!department) {
      toast.error("Digite o nome do departamento");
      return false;
    }

    if (
      departmentOptions.some(
        option => option.toLowerCase() === department.toLowerCase()
      )
    ) {
      toast.error("Esse departamento já existe na lista");
      return false;
    }

    setDepartmentOptions(prev => [...prev, department]);
    toast.success(`Departamento "${department}" adicionado`);
    return true;
  };

  const handleAddDepartment = () => {
    const department = newDepartmentName.trim();
    const added = addDepartmentOption(department);

    if (!added) {
      return;
    }

    setFormData({ ...formData, department });
    setNewDepartmentName("");
    setIsAddingDepartment(false);
  };

  const handleInlineEdit = (request: any, field: string) => {
    setInlineEditingId(request.id);
    setInlineEditField(field);
    setInlineEditValue(request[field]);
  };

  const handleInlineSubmit = () => {
    if (inlineEditingId && inlineEditField) {
      const updateData: any = {
        id: inlineEditingId,
      };
      updateData[inlineEditField] = inlineEditValue;
      updateMutation.mutate(updateData);
    }
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!selectedSpace) {
      toast.error("Selecione uma unidade");
      return;
    }

    if (editingRequest) {
      const updateData: any = {
        id: editingRequest.id,
        ...formData,
        department: formData.department || undefined,
        requestDate: formData.requestDate || undefined,
      };
      updateMutation.mutate(updateData);
    } else {
      const createData: any = {
        title: formData.title,
        description: formData.description,
        department: formData.department || undefined,
        requestDate: formData.requestDate || undefined,
        priority: formData.priority,
        type: formData.type,
        spaceId: selectedSpace,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDeleteRequest = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar este chamado?")) {
      deleteMutation.mutate(id);
    }
  };

  const isValidMaskedDate = (value: string) => {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return false;

    const [day, month, year] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente":
        return "bg-red-900/30 text-red-400 border border-red-700/30";
      case "alta":
        return "bg-sky-900/30 text-sky-400 border border-sky-700/30";
      case "media":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30";
      case "baixa":
        return "bg-green-900/30 text-green-400 border border-green-700/30";
      default:
        return "bg-gray-900/30 text-gray-400 border border-gray-700/30";
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

  const stats = {
    total: requests.length,
    abertos: requests.filter((r: any) => r.status === "aberto").length,
    urgentes: requests.filter((r: any) => r.priority === "urgente").length,
    concluidos: requests.filter((r: any) => r.status === "concluido").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Manutenção</h1>
        <p className="text-gray-400 mt-1">
          Gestão de chamados preventivos e correctivos
        </p>
      </div>

      {/* Space Manager */}
      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Unidades de Manutenção</CardTitle>
          <CardDescription className="text-gray-400">
            Crie e gerencie unidades para organizar chamados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaintenanceSpaceManager
            spaces={spaces}
            selectedSpace={selectedSpace}
            onSelectSpace={setSelectedSpace}
            onCreateSpace={data => createSpaceMutation.mutate(data)}
            onUpdateSpace={(id, data) =>
              updateSpaceMutation.mutate({ id, ...data })
            }
            onDeleteSpace={id => deleteSpaceMutation.mutate(id)}
            isLoading={spacesLoading}
            headerTitle="Selecione uma Unidade"
            headerDescription="Escolha uma unidade para gerenciar seus chamados"
            buttonLabel="Nova Unidade"
          />
        </CardContent>
      </Card>

      {selectedSpace && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Chamados</h2>
              <p className="text-gray-400 mt-1">
                Unidade: {spaces.find((s: any) => s.id === selectedSpace)?.name}
              </p>
            </div>
            <Button
              onClick={handleCreateSample}
              className="w-full bg-sky-600 hover:bg-sky-700 sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Chamado
            </Button>
          </div>

          <div className="flex gap-2 border-b border-slate-700">
            <button
              onClick={() => setViewMode("table")}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === "table"
                  ? "text-sky-500 border-b-2 border-sky-500 -mb-px"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Tabela
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === "kanban"
                  ? "text-sky-500 border-b-2 border-sky-500 -mb-px"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Kanban
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-sky-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white">
                  Total de Chamados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky-500">
                  {stats.total}
                </div>
                <p className="text-xs text-gray-400 mt-1">Todos os chamados</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-sky-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white">
                  Abertos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {stats.abertos}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Aguardando atendimento
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-sky-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white">
                  Urgentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {stats.urgentes}
                </div>
                <p className="text-xs text-gray-400 mt-1">Prioridade máxima</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-sky-700/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-white">
                  Concluídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {stats.concluidos}
                </div>
                <p className="text-xs text-gray-400 mt-1">Resolvidos</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/50 border-sky-700/30">
            <CardHeader>
              <CardTitle className="text-white">Filtros</CardTitle>
              <CardDescription className="text-gray-400">
                Filtre chamados por status e prioridade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Status
                  </label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="em_progresso">Em Progresso</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Prioridade
                  </label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione uma prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={() => {
                  setStatus(undefined);
                  setPriority(undefined);
                }}
                variant="outline"
                className="w-full border-slate-600 text-gray-300 hover:bg-slate-800"
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </Card>

          {viewMode === "kanban" ? (
            <Card className="bg-slate-800/50 border-sky-700/30">
              <CardHeader>
                <CardTitle className="text-white">Kanban de Chamados</CardTitle>
                <CardDescription className="text-gray-400">
                  Arraste os cards para mudar status ou clique para abrir e
                  editar no modal
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
                  </div>
                ) : (
                  <MaintenanceKanban
                    requests={requests}
                    onUpdateStatus={(id, status) =>
                      updateMutation.mutate({ id, status: status as any })
                    }
                    onSaveRequest={(id, data) =>
                      updateMutation.mutate({ id, ...data } as any)
                    }
                    isLoading={updateMutation.isPending}
                    departmentOptions={departmentOptions}
                    onAddDepartmentOption={addDepartmentOption}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 border-sky-700/30">
              <CardHeader>
                <CardTitle className="text-white">
                  Chamados de Manutenção
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {requests.length} chamados encontrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>Nenhum chamado encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-transparent">
                          <TableHead className="text-gray-300">
                            Título
                          </TableHead>
                          <TableHead className="text-gray-300">Tipo</TableHead>
                          <TableHead className="text-gray-300">
                            Departamento
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Data do Chamado
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Prioridade
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Status
                          </TableHead>
                          <TableHead className="text-gray-300">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((request: any, idx: number) => (
                          <TableRow
                            key={`maintenance-${request.id}-${idx}`}
                            className="border-slate-700 hover:bg-slate-700/30"
                          >
                            <TableCell className="text-white">
                              <MaintenanceInlineEdit
                                value={request.title}
                                field="title"
                                onSave={newValue =>
                                  updateMutation.mutate({
                                    id: request.id,
                                    title: newValue,
                                  })
                                }
                                isLoading={updateMutation.isPending}
                              >
                                <span className="cursor-pointer hover:text-sky-400">
                                  {request.title}
                                </span>
                              </MaintenanceInlineEdit>
                            </TableCell>
                            <TableCell>
                              <MaintenanceInlineEdit
                                value={request.type}
                                field="type"
                                onSave={newValue =>
                                  updateMutation.mutate({
                                    id: request.id,
                                    type: newValue as any,
                                  })
                                }
                                isLoading={updateMutation.isPending}
                              >
                                <span className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-400 cursor-pointer hover:bg-blue-900/50">
                                  {request.type === "preventiva"
                                    ? "Preventiva"
                                    : "Corretiva"}
                                </span>
                              </MaintenanceInlineEdit>
                            </TableCell>
                            <TableCell>
                              <MaintenanceInlineEdit
                                value={request.department || ""}
                                field="department"
                                departmentOptions={departmentOptions}
                                onAddDepartmentOption={addDepartmentOption}
                                onSave={newValue =>
                                  updateMutation.mutate({
                                    id: request.id,
                                    department: newValue,
                                  })
                                }
                                isLoading={updateMutation.isPending}
                              >
                                <span className="text-gray-300 cursor-pointer hover:text-sky-400">
                                  {request.department || "-"}
                                </span>
                              </MaintenanceInlineEdit>
                            </TableCell>
                            <TableCell>
                              <MaintenanceInlineEdit
                                value={request.requestDate || ""}
                                field="requestDate"
                                onSave={newValue => {
                                  if (!isValidMaskedDate(newValue)) {
                                    toast.error("Use o formato DD-MM-YYYY");
                                    return;
                                  }

                                  updateMutation.mutate({
                                    id: request.id,
                                    requestDate: newValue,
                                  });
                                }}
                                isLoading={updateMutation.isPending}
                              >
                                <span className="text-gray-300 cursor-pointer hover:text-sky-400">
                                  {request.requestDate || "-"}
                                </span>
                              </MaintenanceInlineEdit>
                            </TableCell>
                            <TableCell>
                              <MaintenanceInlineEdit
                                value={request.priority}
                                field="priority"
                                onSave={newValue =>
                                  updateMutation.mutate({
                                    id: request.id,
                                    priority: newValue as any,
                                  })
                                }
                                isLoading={updateMutation.isPending}
                              >
                                <span
                                  className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 ${getPriorityColor(request.priority)}`}
                                >
                                  {request.priority.charAt(0).toUpperCase() +
                                    request.priority.slice(1)}
                                </span>
                              </MaintenanceInlineEdit>
                            </TableCell>
                            <TableCell>
                              <MaintenanceInlineEdit
                                value={request.status}
                                field="status"
                                onSave={newValue =>
                                  updateMutation.mutate({
                                    id: request.id,
                                    status: newValue as any,
                                  })
                                }
                                isLoading={updateMutation.isPending}
                              >
                                <span className="flex items-center gap-2 text-gray-300 cursor-pointer hover:opacity-80">
                                  {getStatusIcon(request.status)}
                                  {request.status === "aberto" && "Aberto"}
                                  {request.status === "em_progresso" &&
                                    "Em Progresso"}
                                  {request.status === "concluido" &&
                                    "Concluído"}
                                  {request.status === "cancelado" &&
                                    "Cancelado"}
                                </span>
                              </MaintenanceInlineEdit>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditRequest(request)}
                                  className="p-1 hover:bg-blue-600/30 rounded transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 className="h-4 w-4 text-blue-400" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteRequest(request.id)
                                  }
                                  className="p-1 hover:bg-red-600/30 rounded transition-colors"
                                  title="Deletar"
                                >
                                  <Trash2 className="h-4 w-4 text-red-400" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dialog for creating/editing requests */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingRequest ? "Editar Chamado" : "Novo Chamado"}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Preencha os dados do chamado de manutenção
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={e =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Ex: Vazamento na cozinha"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Descrição *</Label>
                  <Input
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Descreva o problema"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Departamento</Label>
                    <Select
                      value={formData.department || undefined}
                      onValueChange={value => {
                        if (value === "__add_department__") {
                          setIsAddingDepartment(true);
                          return;
                        }

                        setFormData({ ...formData, department: value });
                        setIsAddingDepartment(false);
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                        <SelectValue placeholder="Selecione um departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map(department => (
                          <SelectItem key={department} value={department}>
                            {department}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_department__">
                          + Adicionar novo departamento
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {isAddingDepartment && (
                      <div className="mt-2 flex flex-col sm:flex-row gap-2">
                        <Input
                          value={newDepartmentName}
                          onChange={e => setNewDepartmentName(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="Novo departamento"
                        />
                        <Button
                          type="button"
                          onClick={handleAddDepartment}
                          className="bg-sky-600 hover:bg-sky-700"
                        >
                          Adicionar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-300">Data do Chamado</Label>
                    <DateInputWithCalendar
                      value={formData.requestDate}
                      onChange={value =>
                        setFormData({ ...formData, requestDate: value })
                      }
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                      calendarClassName="[&_.rdp-cell]:text-white [&_.rdp-button]:text-white [&_.rdp-button_today]:bg-sky-600 [&_.rdp-button_selected]:bg-sky-600 [&_.rdp-button_selected]:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preventiva">Preventiva</SelectItem>
                        <SelectItem value="correctiva">Corretiva</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-300">Prioridade</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
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
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-sky-600 hover:bg-sky-700"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {editingRequest ? "Atualizar" : "Criar"} Chamado
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingRequest(null);
                      setFormData(getInitialFormData());
                      setIsAddingDepartment(false);
                      setNewDepartmentName("");
                    }}
                    variant="outline"
                    className="border-slate-600 text-gray-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
