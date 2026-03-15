import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertCircle, FileText, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Suppliers() {
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inlineEditingId, setInlineEditingId] = useState<number | null>(null);
  const [inlineEditField, setInlineEditField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "Limpeza",
    status: "ativo" as "ativo" | "inativo",
  });

  const { data: suppliers = [], isLoading, refetch } = trpc.suppliers.list.useQuery({
    category,
    status,
  });

  const { data: contracts = [] } = trpc.contracts.list.useQuery();

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor criado com sucesso!");
      setFormData({ name: "", email: "", phone: "", category: "Limpeza", status: "ativo" });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor actualizado com sucesso!");
      setEditingSupplier(null);
      setFormData({ name: "", email: "", phone: "", category: "Limpeza", status: "ativo" });
      setIsDialogOpen(false);
      setInlineEditingId(null);
      setInlineEditField(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor eliminado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleCreateSample = () => {
    setEditingSupplier(null);
    setFormData({ name: "", email: "", phone: "", category: "Limpeza", status: "ativo" });
    setIsDialogOpen(true);
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      category: supplier.category,
      status: supplier.status,
    });
    setIsDialogOpen(true);
  };

  const handleInlineEdit = (supplier: any, field: string) => {
    setInlineEditingId(supplier.id);
    setInlineEditField(field);
    setInlineEditValue(String(supplier[field]));
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
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    if (editingSupplier) {
      const updateData: any = {
        id: editingSupplier.id,
        ...formData,
      };
      updateMutation.mutate(updateData);
    } else {
      const createData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        category: formData.category,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativo":
        return "bg-green-900/30 text-green-400 border border-green-700/30";
      case "inativo":
        return "bg-red-900/30 text-red-400 border border-red-700/30";
      default:
        return "bg-gray-900/30 text-gray-400 border border-gray-700/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Fornecedores</h1>
          <p className="text-gray-400 mt-1">Gestão de fornecedores e contratos</p>
        </div>
        <Button onClick={handleCreateSample} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">Filtre fornecedores por categoria e status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limpeza">Limpeza</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Segurança">Segurança</SelectItem>
                  <SelectItem value="Alimentação">Alimentação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Fornecedores Registados</CardTitle>
          <CardDescription className="text-gray-400">{suppliers.length} fornecedores encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-400 mt-2">Carregando...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">Nenhum fornecedor encontrado</p>
              <Button onClick={handleCreateSample} variant="outline" className="mt-4 border-orange-600 text-orange-500 hover:bg-orange-600/10">
                Criar primeiro fornecedor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-orange-700/30 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Nome</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Email</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Telefone</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Categoria</TableHead>
                    <TableHead className="text-gray-300 cursor-pointer hover:text-orange-400">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier: any) => (
                    <TableRow key={supplier.id} className="border-orange-700/20 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white">{supplier.name}</TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(supplier, "email")}
                      >
                        {supplier.email}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(supplier, "phone")}
                      >
                        {supplier.phone}
                      </TableCell>
                      <TableCell
                        className="text-gray-300 cursor-pointer hover:text-orange-400 transition"
                        onClick={() => handleInlineEdit(supplier, "category")}
                      >
                        {supplier.category}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition ${getStatusColor(supplier.status)}`}
                          onClick={() => handleInlineEdit(supplier, "status")}
                        >
                          {supplier.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-orange-600 text-orange-500 hover:bg-orange-600/10"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-500 hover:bg-red-600/10"
                            onClick={() => handleDelete(supplier.id)}
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
        <DialogContent className="bg-slate-800 border-orange-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingSupplier ? "Actualizar informações do fornecedor" : "Criar um novo fornecedor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-gray-300">Nome do Fornecedor</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Limpeza Pro"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Ex: contato@empresa.com"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ex: +351 XXX XXX XXX"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category" className="text-gray-300">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limpeza">Limpeza</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Segurança">Segurança</SelectItem>
                  <SelectItem value="Alimentação">Alimentação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editingSupplier && (
              <div>
                <Label htmlFor="status" className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingSupplier ? "Actualizar" : "Criar"}
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

      {/* Dialog de Edição Inline */}
      <Dialog open={inlineEditingId !== null} onOpenChange={(open) => !open && setInlineEditingId(null)}>
        <DialogContent className="bg-slate-800 border-orange-700/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Editar {inlineEditField?.charAt(0).toUpperCase()}{inlineEditField?.slice(1)}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Selecione o novo valor para este campo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(inlineEditField === "email" || inlineEditField === "phone") && (
              <Input
                value={inlineEditValue}
                onChange={(e) => setInlineEditValue(e.target.value)}
                placeholder={inlineEditField === "email" ? "Ex: contato@empresa.com" : "Ex: +351 XXX XXX XXX"}
                className="bg-slate-700 border-slate-600 text-white"
              />
            )}

            {inlineEditField === "category" && (
              <Select value={inlineEditValue} onValueChange={setInlineEditValue}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limpeza">Limpeza</SelectItem>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Segurança">Segurança</SelectItem>
                  <SelectItem value="Alimentação">Alimentação</SelectItem>
                </SelectContent>
              </Select>
            )}

            {inlineEditField === "status" && (
              <Select value={inlineEditValue} onValueChange={setInlineEditValue}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleInlineSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
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
