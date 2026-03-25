import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle, AlertTriangle, X, Building2, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { EditableCell } from "@/components/EditableCell";
import { WeeklyMovementsDrawer } from "@/components/WeeklyMovementsDrawer";

export default function Consumables() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [isWeeklyDrawerOpen, setIsWeeklyDrawerOpen] = useState(false);
  const [selectedConsumableForWeekly, setSelectedConsumableForWeekly] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "", category: "" });
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "",
    minStock: 0,
    maxStock: 0,
    currentStock: 0,
    replenishStock: 0,
  });
  const [spaceFormData, setSpaceFormData] = useState({
    name: "",
    description: "",
    location: "",
  });

  // Queries
  const { data: spaces = [], isLoading: spacesLoading, refetch: refetchSpaces } = trpc.consumableSpaces.list.useQuery();
  const { data: consumables = [], isLoading, refetch } = trpc.consumablesWithSpace.list.useQuery(
    {
      spaceId: selectedSpace || undefined,
      ...filters,
    },
    { enabled: !!selectedSpace }
  );

  // Mutations for Consumables
  const createMutation = trpc.consumablesWithSpace.create.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.consumablesWithSpace.update.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.consumablesWithSpace.delete.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  // Mutations for Spaces
  const createSpaceMutation = trpc.consumableSpaces.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      refetchSpaces();
      setIsSpaceDialogOpen(false);
      setSpaceFormData({ name: "", description: "", location: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const updateSpaceMutation = trpc.consumableSpaces.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetchSpaces();
      setIsSpaceDialogOpen(false);
      setSpaceFormData({ name: "", description: "", location: "" });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteSpaceMutation = trpc.consumableSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade eliminada com sucesso!");
      refetchSpaces();
      if (selectedSpace === editingSpaceId) {
        setSelectedSpace(null);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const calculateReplenishStock = (maxStock: number, currentStock: number) => {
    if (currentStock === 0) {
      return maxStock;
    }
    return Math.max(0, maxStock - currentStock);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      unit: "",
      minStock: 0,
      maxStock: 0,
      currentStock: 0,
      replenishStock: 0,
    });
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    const replenish = calculateReplenishStock(item.maxStock, item.currentStock);
    setFormData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      minStock: item.minStock,
      maxStock: item.maxStock,
      currentStock: item.currentStock,
      replenishStock: replenish,
    });
    setEditingId(item.id);
    setIsOpen(true);
  };

  const handleOpenWeeklyDrawer = (item: any) => {
    setSelectedConsumableForWeekly(item);
    setIsWeeklyDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.unit || !selectedSpace) {
      toast.error(t("app.required_fields"));
      return;
    }

    const calculateStatus = (current: number, min: number, max: number) => {
      if (current > max) return "ACIMA_DO_ESTOQUE";
      if (current < min) return "REPOR_ESTOQUE";
      return "ESTOQUE_OK";
    };

    const status = calculateStatus(formData.currentStock, formData.minStock, formData.maxStock);

    if (editingId) {
      await updateMutation.mutateAsync({
        id: editingId,
        ...formData,
        status: status as "ESTOQUE_OK" | "ACIMA_DO_ESTOQUE" | "REPOR_ESTOQUE",
      });
    } else {
      await createMutation.mutateAsync({
        spaceId: selectedSpace,
        ...formData,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t("app.confirm_delete"))) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleEditSpace = (space: any) => {
    setSpaceFormData({
      name: space.name,
      description: space.description || "",
      location: space.location || "",
    });
    setEditingSpaceId(space.id);
    setIsSpaceDialogOpen(true);
  };

  const handleSubmitSpace = async () => {
    if (!spaceFormData.name) {
      toast.error("Nome da unidade é obrigatório");
      return;
    }

    if (editingSpaceId) {
      await updateSpaceMutation.mutateAsync({
        id: editingSpaceId,
        ...spaceFormData,
      });
    } else {
      await createSpaceMutation.mutateAsync(spaceFormData);
    }
  };

  const handleDeleteSpace = async (id: number) => {
    if (window.confirm("Tem certeza que deseja eliminar esta unidade?")) {
      await deleteSpaceMutation.mutateAsync(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ESTOQUE_OK":
        return "bg-green-100 text-green-800";
      case "ACIMA_DO_ESTOQUE":
        return "bg-orange-100 text-orange-800";
      case "REPOR_ESTOQUE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ESTOQUE_OK":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "ACIMA_DO_ESTOQUE":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "REPOR_ESTOQUE":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ESTOQUE_OK":
        return "Estoque OK";
      case "ACIMA_DO_ESTOQUE":
        return "Acima do Estoque";
      case "REPOR_ESTOQUE":
        return "Repor Estoque";
      default:
        return status;
    }
  };

  const categories = useMemo(() => {
    return Array.from(new Set(consumables.map((c: any) => c.category)));
  }, [consumables]);

  const criticalItems = consumables.filter((item: any) => item.status === "REPOR_ESTOQUE");

  if (spacesLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>Carregando unidades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Estoque de Consumíveis</h1>
          <p className="text-gray-400 mt-1">Gestão de consumíveis por unidade com histórico semanal</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              disabled={!selectedSpace}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              title={!selectedSpace ? "Selecione uma unidade primeiro" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Consumível
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-orange-700/30 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">{editingId ? "Editar" : "Novo"} Consumível</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Categoria</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Unidade</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Est. Mínimo</label>
                  <Input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Est. Máximo</label>
                  <Input
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Est. Atual</label>
                <Input
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      currentStock: value,
                      replenishStock: calculateReplenishStock(formData.maxStock, value),
                    });
                  }}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Repor Estoque (Automático)</label>
                <Input
                  type="number"
                  value={formData.replenishStock}
                  disabled
                  className="bg-slate-700 border-slate-600 text-gray-500 mt-1 opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Calculado automaticamente: máximo - atual</p>
              </div>
              <Button onClick={handleSubmit} className="w-full bg-orange-600 hover:bg-orange-700">
                {editingId ? "Atualizar" : "Criar"} Consumível
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Spaces Management - Always visible */}
      <Card className="bg-slate-800/50 border-orange-700/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-white">Unidades</CardTitle>
          </div>
          <Dialog open={isSpaceDialogOpen} onOpenChange={setIsSpaceDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setSpaceFormData({ name: "", description: "", location: "" });
                  setEditingSpaceId(null);
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-orange-700/30">
              <DialogHeader>
                <DialogTitle className="text-white">{editingSpaceId ? "Editar" : "Nova"} Unidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Nome</label>
                  <Input
                    value={spaceFormData.name}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Descrição</label>
                  <Input
                    value={spaceFormData.description}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Localização</label>
                  <Input
                    value={spaceFormData.location}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, location: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <Button onClick={handleSubmitSpace} className="w-full bg-orange-600 hover:bg-orange-700">
                  {editingSpaceId ? "Atualizar" : "Criar"} Unidade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {spaces.length === 0 ? (
              <p className="text-gray-400 w-full">Nenhuma unidade cadastrada. Crie uma para começar!</p>
            ) : (
              spaces.map((space: any) => (
                <div
                  key={space.id}
                  className={`px-4 py-2 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedSpace === space.id
                      ? "bg-orange-600 border-orange-500 text-white"
                      : "bg-slate-700 border-slate-600 text-gray-300 hover:border-orange-500"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedSpace(space.id)} className="flex-1">
                      <div className="font-medium">{space.name}</div>
                      {space.location && <div className="text-xs opacity-75">{space.location}</div>}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditSpace(space)}
                        className="text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSpace(space.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Consumables Content - Only shown when space is selected */}
      {selectedSpace ? (
        <>
          {/* Critical Stock Alert */}
          {criticalItems.length > 0 && (
            <Card className="bg-red-900/20 border-red-700/50">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Consumíveis com Estoque Crítico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {criticalItems.slice(0, 10).map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-700/50 rounded">
                      <div>
                        <p className="text-white font-medium">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.category} • Atual: {item.currentStock}/{item.minStock}
                        </p>
                      </div>
                      <button
                        onClick={() => handleEdit(item)}
                        className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                      >
                        Repor
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card className="bg-slate-800/50 border-orange-700/20">
            <CardContent className="pt-6">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-gray-300 block mb-2">Pesquisar</label>
                  <Input
                    placeholder="Pesquisar por produto..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                {categories.length > 0 && (
                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="text-sm font-medium text-gray-300 block mb-2">Categoria</label>
                      <div className="flex gap-2 flex-wrap">
                        {categories.map((cat: any) => (
                          <button
                            key={cat}
                            onClick={() => setFilters({ ...filters, category: filters.category === cat ? "" : cat })}
                            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                              filters.category === cat
                                ? "bg-orange-600 text-white"
                                : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    {filters.category && (
                      <button
                        onClick={() => setFilters({ ...filters, category: "" })}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                        title="Limpar filtro"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="bg-slate-800/50 border-orange-700/20">
            <CardHeader>
              <CardTitle className="text-white">Consumíveis da Unidade</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">Carregando...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-orange-700/20 hover:bg-transparent">
                        <TableHead className="text-gray-300">Produto</TableHead>
                        <TableHead className="text-gray-300">Categoria</TableHead>
                        <TableHead className="text-gray-300">Und.</TableHead>
                        <TableHead className="text-gray-300 text-right">Est. Mínimo</TableHead>
                        <TableHead className="text-gray-300 text-right">Est. Máximo</TableHead>
                        <TableHead className="text-gray-300 text-right">Est. Atual</TableHead>
                        <TableHead className="text-gray-300 text-right">Repor</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consumables.map((item: any) => (
                        <TableRow key={item.id} className="border-orange-700/10 hover:bg-slate-700/30">
                          <TableCell className="text-white font-medium">{item.name}</TableCell>
                          <TableCell className="text-gray-300">{item.category}</TableCell>
                          <TableCell className="text-gray-300">{item.unit}</TableCell>
                          <TableCell className="text-right text-gray-300">{item.minStock}</TableCell>
                          <TableCell className="text-right text-gray-300 text-green-400">{item.maxStock}</TableCell>
                          <TableCell className="text-right text-gray-300 font-semibold">
                            <EditableCell
                              value={item.currentStock}
                              type="number"
                              onSave={(value) => {
                                updateMutation.mutate({
                                  id: item.id,
                                  currentStock: Number(value),
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            <EditableCell
                              value={item.replenishStock}
                              type="number"
                              onSave={(value) => {
                                updateMutation.mutate({
                                  id: item.id,
                                  replenishStock: Number(value),
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                              <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleOpenWeeklyDrawer(item)}
                                className="text-blue-500 hover:text-blue-400 transition-colors"
                                title="Ver movimentações semanais"
                              >
                                <Calendar className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-orange-500 hover:text-orange-400 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-red-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {consumables.length === 0 && (
                    <div className="text-center py-8 text-gray-400">Nenhum consumível cadastrado para esta unidade</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-slate-800/50 border-orange-700/20">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-center">Selecione uma unidade acima para visualizar e gerenciar consumíveis</p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Movements Drawer */}
      {selectedConsumableForWeekly && (
        <WeeklyMovementsDrawer
          isOpen={isWeeklyDrawerOpen}
          onOpenChange={setIsWeeklyDrawerOpen}
          consumableId={selectedConsumableForWeekly.id}
          spaceId={selectedSpace}
          consumableName={selectedConsumableForWeekly.name}
        />
      )}
    </div>
  );
}
