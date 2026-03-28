import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit2, Trash2, Building2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SERVICE_TYPES = [
  "Limpeza",
  "Manutenção",
  "Segurança",
  "Catering",
  "Consultoria",
  "Tecnologia",
  "Logística",
  "Recursos Humanos",
  "Contabilidade",
  "Outro",
];

export default function Suppliers() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpaceDialogOpen, setIsSpaceDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "" });
  const [formData, setFormData] = useState({
    companyName: "",
    serviceTypes: [] as string[],
    contact: "",
    contactPerson: "",
    status: "ativo" as "ativo" | "inativo" | "suspenso",
    notes: "",
  });
  const [spaceFormData, setSpaceFormData] = useState({
    name: "",
    description: "",
    location: "",
  });

  // Queries
  const { data: spaces = [], isLoading: spacesLoading, refetch: refetchSpaces } = trpc.consumableSpaces.list.useQuery();
  const { data: suppliers = [], isLoading, refetch } = trpc.suppliersWithSpace.list.useQuery(
    { spaceId: selectedSpace || undefined },
    { enabled: !!selectedSpace }
  );

  // Mutations
  const createMutation = trpc.suppliersWithSpace.create.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor criado com sucesso!");
      refetch();
      resetForm();
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.suppliersWithSpace.update.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor atualizado com sucesso!");
      refetch();
      resetForm();
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.suppliersWithSpace.delete.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor deletado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createSpaceMutation = trpc.consumableSpaces.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      refetchSpaces();
      setSpaceFormData({ name: "", description: "", location: "" });
      setIsSpaceDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateSpaceMutation = trpc.consumableSpaces.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetchSpaces();
      setSpaceFormData({ name: "", description: "", location: "" });
      setEditingSpaceId(null);
      setIsSpaceDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteSpaceMutation = trpc.consumableSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade deletada com sucesso!");
      refetchSpaces();
      setSelectedSpace(null);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpace) {
      toast.error("Selecione uma unidade primeiro!");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createMutation.mutate({
        spaceId: selectedSpace,
        ...formData,
      });
    }
  };

  const handleSpaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSpaceId) {
      updateSpaceMutation.mutate({ id: editingSpaceId, ...spaceFormData });
    } else {
      createSpaceMutation.mutate(spaceFormData);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingId(supplier.id);
    setFormData({
      companyName: supplier.companyName,
      serviceTypes: supplier.serviceTypes || [],
      contact: supplier.contact,
      contactPerson: supplier.contactPerson,
      status: supplier.status,
      notes: supplier.notes || "",
    });
    setIsOpen(true);
  };

  const handleSpaceEdit = (space: any) => {
    setEditingSpaceId(space.id);
    setSpaceFormData({
      name: space.name,
      description: space.description || "",
      location: space.location || "",
    });
  };

  const handleSpaceDelete = (spaceId: number) => {
    if (window.confirm("Tem certeza que deseja deletar esta unidade?")) {
      deleteSpaceMutation.mutate(spaceId);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja deletar este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      companyName: "",
      serviceTypes: [],
      contact: "",
      contactPerson: "",
      status: "ativo",
      notes: "",
    });
  };

  const toggleServiceType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter((t) => t !== type)
        : [...prev.serviceTypes, type],
    }));
  };

  const filteredSuppliers = suppliers.filter((supplier: any) =>
    supplier.companyName.toLowerCase().includes(filters.search.toLowerCase())
  );

  if (!selectedSpace) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Fornecedores</h1>
            <p className="text-gray-400 mt-2">Gestão de fornecedores por unidade</p>
          </div>
          <Dialog open={isSpaceDialogOpen} onOpenChange={setIsSpaceDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Unidade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">{editingSpaceId ? "Editar" : "Nova"} Unidade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSpaceSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Nome</label>
                  <Input
                    value={spaceFormData.name}
                    onChange={(e) => setSpaceFormData({ ...spaceFormData, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
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
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                    {editingSpaceId ? "Atualizar" : "Criar"} Unidade
                  </Button>
                  {editingSpaceId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingSpaceId(null);
                        setSpaceFormData({ name: "", description: "", location: "" });
                        setIsSpaceDialogOpen(false);
                      }}
                      className="border-slate-600 text-gray-300 hover:bg-slate-800"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Selecione uma Unidade</CardTitle>
          </CardHeader>
          <CardContent>
            {spaces.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhuma unidade criada ainda.</p>
                <p className="text-sm mt-2">Clique em "Nova Unidade" para começar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spaces.map((space: any) => (
                  <div
                    key={space.id}
                    onClick={() => setSelectedSpace(space.id)}
                    className="p-4 rounded-lg border-2 border-slate-600 hover:border-orange-600 cursor-pointer transition-all duration-200 bg-slate-700/50 hover:bg-slate-700 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{space.name}</h3>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{space.description || "Sem descrição"}</p>
                      </div>
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpaceEdit(space);
                            setIsSpaceDialogOpen(true);
                          }}
                          className="p-1.5 hover:bg-blue-600/30 rounded transition-colors"
                        >
                          <Edit2 className="h-4 w-4 text-blue-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSpaceDelete(space.id);
                          }}
                          className="p-1.5 hover:bg-red-600/30 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fornecedores</h1>
          <p className="text-gray-400 mt-2">
            Unidade: <span className="text-orange-400 font-semibold">{spaces.find((s: any) => s.id === selectedSpace)?.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedSpace(null)}
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
          >
            Mudar Unidade
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">{editingId ? "Editar" : "Novo"} Fornecedor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Nome da Empresa</label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Tipos de Serviço</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {SERVICE_TYPES.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.serviceTypes.includes(type)}
                          onChange={() => toggleServiceType(type)}
                          className="rounded border-slate-600 text-orange-600"
                        />
                        <span className="text-sm text-gray-300">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Contato</label>
                  <Input
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Telefone ou Email"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Responsável</label>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Nome de quem falar"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Status</label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">Notas</label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700">
                    {editingId ? "Atualizar" : "Criar"} Fornecedor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsOpen(false);
                    }}
                    className="border-slate-600 text-gray-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Fornecedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar fornecedor..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">Carregando...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhum fornecedor cadastrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-gray-300">Empresa</TableHead>
                    <TableHead className="text-gray-300">Tipos de Serviço</TableHead>
                    <TableHead className="text-gray-300">Contato</TableHead>
                    <TableHead className="text-gray-300">Responsável</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier: any) => (
                    <TableRow key={supplier.id} className="border-slate-700 hover:bg-slate-700/30">
                      <TableCell className="text-white font-medium">{supplier.companyName}</TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const types = typeof supplier.serviceTypes === 'string' 
                              ? JSON.parse(supplier.serviceTypes || '[]')
                              : (supplier.serviceTypes || []);
                            return types.map((type: string) => (
                              <span key={type} className="px-2 py-1 bg-orange-600/30 text-orange-300 rounded text-xs">
                                {type}
                              </span>
                            ));
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{supplier.contact}</TableCell>
                      <TableCell className="text-gray-300">{supplier.contactPerson}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            supplier.status === "ativo"
                              ? "bg-green-600/30 text-green-300"
                              : supplier.status === "inativo"
                              ? "bg-gray-600/30 text-gray-300"
                              : "bg-red-600/30 text-red-300"
                          }`}
                        >
                          {supplier.status === "ativo" ? "Ativo" : supplier.status === "inativo" ? "Inativo" : "Suspenso"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(supplier)}
                            className="p-1 hover:bg-blue-600/30 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="p-1 hover:bg-red-600/30 rounded transition-colors"
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
    </div>
  );
}
