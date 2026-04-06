import { useState } from "react";
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
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditField, setInlineEditField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [customCategories, setCustomCategories] = useState<string[]>([
    "Consumíveis",
    "Equipamentos",
    "Ferramentas",
    "Limpeza",
  ]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !customCategories.includes(newCategoryName)) {
      setCustomCategories([...customCategories, newCategoryName]);
      setFormData({ ...formData, category: newCategoryName });
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast.success(`Categoria "${newCategoryName}" adicionada com sucesso!`);
    } else if (customCategories.includes(newCategoryName)) {
      toast.error("Esta categoria já existe");
    } else {
      toast.error("Digite um nome para a categoria");
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    category: "Consumíveis",
    quantity: 0,
    minQuantity: 0,
    unit: "unidade",
    location: "",
    status: "ativo" as "ativo" | "inativo" | "descontinuado",
  });

  const {
    data: items = [],
    isLoading,
    refetch,
  } = trpc.inventory.list.useQuery({
    search,
    category,
    status,
  });

  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: () => {
      toast.success("Item criado com sucesso!");
      setFormData({
        name: "",
        category: "Consumíveis",
        quantity: 0,
        minQuantity: 0,
        unit: "unidade",
        location: "",
        status: "ativo",
      });
      setIsDialogOpen(false);
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.inventory.update.useMutation({
    onSuccess: () => {
      toast.success("Item actualizado com sucesso!");
      setEditingItem(null);
      setFormData({
        name: "",
        category: "Consumíveis",
        quantity: 0,
        minQuantity: 0,
        unit: "unidade",
        location: "",
        status: "ativo",
      });
      setIsDialogOpen(false);
      setInlineEditingId(null);
      setInlineEditField(null);
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.inventory.delete.useMutation({
    onSuccess: () => {
      toast.success("Item eliminado com sucesso!");
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateSample = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Consumíveis",
      quantity: 0,
      minQuantity: 0,
      unit: "unidade",
      location: "",
      status: "ativo",
    });
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      unit: item.unit,
      location: item.location,
      status: item.status,
    });
    setIsDialogOpen(true);
  };

  const handleInlineEdit = (item: any, field: string) => {
    setInlineEditingId(item.id);
    setInlineEditField(field);
    setInlineEditValue(String(item[field]));
  };

  const handleInlineSubmit = () => {
    if (inlineEditingId && inlineEditField) {
      const updateData: any = {
        id: inlineEditingId,
      };
      if (inlineEditField === "quantity" || inlineEditField === "minQuantity") {
        updateData[inlineEditField] = parseInt(inlineEditValue) || 0;
      } else {
        updateData[inlineEditField] = inlineEditValue;
      }
      updateMutation.mutate(updateData);
    }
  };

  const handleSubmit = () => {
    if (
      !formData.name ||
      !formData.location ||
      formData.quantity < 0 ||
      formData.minQuantity < 0
    ) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (editingItem) {
      const updateData: any = {
        id: editingItem.id,
        ...formData,
      };
      updateMutation.mutate(updateData);
    } else {
      const createData: any = {
        name: formData.name,
        category: formData.category,
        quantity: formData.quantity,
        minQuantity: formData.minQuantity,
        unit: formData.unit,
        location: formData.location,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar este item?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventário</h1>
          <p className="text-gray-400 mt-1">
            Gestão centralizada de materiais e equipamentos
          </p>
        </div>
        <Button
          onClick={handleCreateSample}
          className="w-full bg-sky-600 hover:bg-sky-700 sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">
            Pesquise e filtre itens do inventário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Pesquisa
              </label>
              <Input
                placeholder="Pesquisar por nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                Categoria
              </label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white flex-1">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {customCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setIsAddingCategory(true)}
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700"
                  title="Adicionar nova categoria"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="descontinuado">Descontinuado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Itens do Inventário</CardTitle>
          <CardDescription className="text-gray-400">
            {items.length} itens encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto"></div>
              <p className="text-gray-400 mt-2">Carregando...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Nenhum item encontrado</p>
              <Button
                onClick={handleCreateSample}
                variant="outline"
                className="mt-4 border-sky-600 text-sky-500 hover:bg-sky-600/10"
              >
                Criar primeiro item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-sky-700/30 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Nome</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-sky-400">
                      Categoria
                    </TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-sky-400">
                      Quantidade
                    </TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-sky-400">
                      Mínimo
                    </TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-sky-400">
                      Localização
                    </TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-sky-400">
                      Status
                    </TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow
                      key={item.id}
                      className="border-sky-700/20 hover:bg-slate-700/30"
                    >
                      <TableCell className="font-medium text-white">
                        {item.name}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-sky-400 transition"
                        onClick={() => handleInlineEdit(item, "category")}
                      >
                        {item.category}
                      </TableCell>
                      <TableCell
                        className={`cursor-pointer hover:text-sky-400 transition ${item.quantity < item.minQuantity ? "text-red-400 font-semibold" : "text-gray-300"}`}
                        onClick={() => handleInlineEdit(item, "quantity")}
                      >
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-sky-400 transition"
                        onClick={() => handleInlineEdit(item, "minQuantity")}
                      >
                        {item.minQuantity}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-sky-400 transition"
                        onClick={() => handleInlineEdit(item, "location")}
                      >
                        {item.location}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition ${
                            item.status === "ativo"
                              ? "bg-green-900/30 text-green-400 border border-green-700/30"
                              : item.status === "inativo"
                                ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30"
                                : "bg-red-900/30 text-red-400 border border-red-700/30"
                          }`}
                          onClick={() => handleInlineEdit(item, "status")}
                        >
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-sky-600 text-sky-500 hover:bg-sky-600/10"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-600 text-red-500 hover:bg-red-600/10"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Dialog de Edição Completa */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem ? "Editar Item" : "Novo Item"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingItem
                ? "Actualizar informações do item"
                : "Criar um novo item no inventário"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">
                Nome do Item
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Papel A4"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-gray-300">
                  Categoria
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={value =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Consumíveis">Consumíveis</SelectItem>
                    <SelectItem value="Equipamentos">Equipamentos</SelectItem>
                    <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                    <SelectItem value="Limpeza">Limpeza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="unit" className="text-gray-300">
                  Unidade
                </Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={e =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  placeholder="Ex: unidade"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity" className="text-gray-300">
                  Quantidade
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="minQuantity" className="text-gray-300">
                  Quantidade Mínima
                </Label>
                <Input
                  id="minQuantity"
                  type="number"
                  value={formData.minQuantity}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      minQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="text-gray-300">
                Localização
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={e =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Ex: Armazém A"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            {editingItem && (
              <div>
                <Label htmlFor="status" className="text-gray-300">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="descontinuado">Descontinuado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                className="bg-sky-600 hover:bg-sky-700 text-white flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Guardando..."
                  : editingItem
                    ? "Actualizar"
                    : "Criar"}
              </Button>
              <Button
                onClick={() => setIsDialogOpen(false)}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Nova Categoria */}
      <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              Adicionar Nova Categoria
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Digite o nome da nova categoria de consumível
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="Ex: Papel, Tinta, etc."
              className="bg-slate-700 border-slate-600 text-white"
              onKeyPress={e => e.key === "Enter" && handleAddCategory()}
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleAddCategory}
                className="bg-sky-600 hover:bg-sky-700 text-white flex-1"
              >
                Adicionar
              </Button>
              <Button
                onClick={() => setIsAddingCategory(false)}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição Inline */}
      <Dialog
        open={inlineEditingId !== null}
        onOpenChange={open => !open && setInlineEditingId(null)}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar {inlineEditField?.charAt(0).toUpperCase()}
              {inlineEditField?.slice(1)}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecione o novo valor para este campo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {inlineEditField === "category" && (
              <Select
                value={inlineEditValue}
                onValueChange={setInlineEditValue}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(inlineEditField === "quantity" ||
              inlineEditField === "minQuantity") && (
              <Input
                type="number"
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "location" && (
              <Input
                value={inlineEditValue}
                onChange={e => setInlineEditValue(e.target.value)}
                placeholder="Ex: Armazém A"
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "status" && (
              <Select
                value={inlineEditValue}
                onValueChange={setInlineEditValue}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="descontinuado">Descontinuado</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleInlineSubmit}
                className="bg-sky-600 hover:bg-sky-700 text-white flex-1"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                onClick={() => setInlineEditingId(null)}
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
