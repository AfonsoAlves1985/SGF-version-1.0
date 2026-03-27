import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertCircle, Edit2, Trash2, Badge } from "lucide-react";
import { toast } from "sonner";

const SERVICE_TYPES = [
  "Limpeza",
  "Manutenção",
  "Segurança",
  "Catering",
  "Consultoria",
  "Logística",
  "Telecomunicações",
  "Energia",
  "Água",
  "Resíduos",
];

export default function Suppliers() {
  const [status, setStatus] = useState<string | undefined>();
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    serviceTypes: [] as string[],
    contact: "",
    contactPerson: "",
    status: "ativo" as "ativo" | "inativo" | "suspenso",
    notes: "",
  });

  const { data: suppliers = [], isLoading, refetch } = trpc.suppliers.list.useQuery({
    status,
  });

  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor criado com sucesso!");
      setFormData({
        companyName: "",
        serviceTypes: [],
        contact: "",
        contactPerson: "",
        status: "ativo",
        notes: "",
      });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor atualizado com sucesso!");
      setEditingSupplier(null);
      setFormData({
        companyName: "",
        serviceTypes: [],
        contact: "",
        contactPerson: "",
        status: "ativo",
        notes: "",
      });
      setIsDialogOpen(false);
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

  const handleCreateNew = () => {
    setEditingSupplier(null);
    setFormData({
      companyName: "",
      serviceTypes: [],
      contact: "",
      contactPerson: "",
      status: "ativo",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      companyName: supplier.companyName,
      serviceTypes: supplier.serviceTypes || [],
      contact: supplier.contact,
      contactPerson: supplier.contactPerson,
      status: supplier.status,
      notes: supplier.notes || "",
    });
    setIsDialogOpen(true);
  };

  const toggleServiceType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter((t) => t !== type)
        : [...prev.serviceTypes, type],
    }));
  };

  const handleSubmit = () => {
    if (!formData.companyName || !formData.contact || !formData.contactPerson || formData.serviceTypes.length === 0) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingSupplier) {
      updateMutation.mutate({
        id: editingSupplier.id,
        ...formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja eliminar este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (supplierId: number, newStatus: string) => {
    updateMutation.mutate({
      id: supplierId,
      status: newStatus as any,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativo":
        return "bg-green-900/30 text-green-400 border border-green-700/30";
      case "inativo":
        return "bg-red-900/30 text-red-400 border border-red-700/30";
      case "suspenso":
        return "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30";
      default:
        return "bg-gray-900/30 text-gray-400 border border-gray-700/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Fornecedores</h1>
          <p className="text-gray-400 mt-1">Gestão de fornecedores e prestadores de serviço</p>
        </div>
        <Button onClick={handleCreateNew} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <Card className="bg-slate-800/50 border-orange-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">Filtre fornecedores por status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
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
              <Button onClick={handleCreateNew} variant="outline" className="mt-4 border-orange-600 text-orange-500 hover:bg-orange-600/10">
                Criar primeiro fornecedor
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-orange-700/30 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Empresa</TableHead>
                    <TableHead className="text-gray-300">Tipo de Serviço</TableHead>
                    <TableHead className="text-gray-300">Contato</TableHead>
                    <TableHead className="text-gray-300">Responsável</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier: any) => (
                    <TableRow key={supplier.id} className="border-orange-700/20 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white">{supplier.companyName}</TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex flex-wrap gap-1">
                          {supplier.serviceTypes?.map((type: string) => (
                            <span key={type} className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded border border-blue-700/30">
                              {type}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{supplier.contact}</TableCell>
                      <TableCell className="text-gray-300">{supplier.contactPerson}</TableCell>
                      <TableCell>
                        <Select value={supplier.status} onValueChange={(value) => handleStatusChange(supplier.id, value)}>
                          <SelectTrigger className={`w-fit text-xs ${getStatusColor(supplier.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativo">Ativo</SelectItem>
                            <SelectItem value="inativo">Inativo</SelectItem>
                            <SelectItem value="suspenso">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
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

      {/* Dialog de Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-slate-800 border-orange-700/30 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {editingSupplier ? "Atualizar informações do fornecedor" : "Criar um novo fornecedor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName" className="text-gray-300">
                Nome da Empresa *
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Ex: ABC Limpeza Profissional"
                className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Tipo de Serviço *</Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleServiceType(type)}
                    className={`p-2 rounded border-2 text-sm font-medium transition ${
                      formData.serviceTypes.includes(type)
                        ? "border-orange-500 bg-orange-50/10 text-orange-400"
                        : "border-slate-600 bg-slate-700 text-gray-400 hover:border-slate-500"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact" className="text-gray-300">
                  Contato (Telefone/Email) *
                </Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Ex: (11) 98765-4321"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <Label htmlFor="contactPerson" className="text-gray-300">
                  Com Quem Falar *
                </Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Ex: João Silva"
                  className="mt-1 bg-slate-700 border-slate-600 text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status" className="text-gray-300">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes" className="text-gray-300">
                Notas
              </Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informações adicionais sobre o fornecedor..."
                className="mt-1 w-full p-2 bg-slate-700 border border-slate-600 text-white placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSubmit}
                className="bg-orange-600 hover:bg-orange-700 text-white flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingSupplier ? "Atualizar" : "Criar"}
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
    </div>
  );
}
