import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Edit2, Trash2, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Consumables() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
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

  // Queries
  const { data: consumables = [], isLoading, refetch } = trpc.consumables.list.useQuery(filters);
  const { data: weeklyData = [] } = trpc.consumables.listWeekly.useQuery({});
  const { data: monthlyData = [] } = trpc.consumables.listMonthly.useQuery({});

  // Mutations
  const createMutation = trpc.consumables.create.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.consumables.update.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.consumables.delete.useMutation({
    onSuccess: () => {
      toast.success(t("app.success"));
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

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
    setFormData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      minStock: item.minStock,
      maxStock: item.maxStock,
      currentStock: item.currentStock,
      replenishStock: item.replenishStock,
    });
    setEditingId(item.id);
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.unit) {
      toast.error(t("app.required_fields"));
      return;
    }

    // Calculate status based on current stock and min/max
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
        ...formData,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t("app.confirm_delete"))) {
      await deleteMutation.mutateAsync(id);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Estoque de Consumíveis</h1>
          <p className="text-gray-400 mt-1">Gestão de consumíveis com histórico semanal e mensal</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => resetForm()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Consumível
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-orange-700/30">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingId ? "Editar Consumível" : "Novo Consumível"}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Preencha os dados do consumível
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Produto</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Nome do produto"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Categoria</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Ex: COPA/COZINHA"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300">Unidade</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  placeholder="Ex: UND, L, KG"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Est. Atual</label>
                  <Input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Repor Estoque</label>
                  <Input
                    type="number"
                    value={formData.replenishStock}
                    onChange={(e) => setFormData({ ...formData, replenishStock: parseInt(e.target.value) || 0 })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-orange-700/20">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Pesquisar por produto..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Select value={filters.category || ""} onValueChange={(value) => setFilters({ ...filters, category: value })}>
              <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="">Todas as categorias</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat} value={String(cat)}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-orange-700/20">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "weekly"
              ? "border-orange-600 text-orange-500"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          Semanal
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "monthly"
              ? "border-orange-600 text-orange-500"
              : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          Mensal
        </button>
      </div>

      {/* Table */}
      <Card className="bg-slate-800/50 border-orange-700/20">
        <CardHeader>
          <CardTitle className="text-white">
            {activeTab === "weekly" ? "Histórico Semanal" : "Histórico Mensal"}
          </CardTitle>
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
                      <TableCell className="text-right text-gray-300 font-semibold">{item.currentStock}</TableCell>
                      <TableCell className="text-right text-gray-300">{item.replenishStock}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
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
                <div className="text-center py-8 text-gray-400">Nenhum consumível cadastrado</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
