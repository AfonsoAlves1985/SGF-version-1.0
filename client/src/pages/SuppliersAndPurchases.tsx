import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { SupplierSpaceManager } from "@/components/SupplierSpaceManager";

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
];

function parseServiceTypes(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(item => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === "string");
      }
    } catch {
      return [];
    }
  }

  return [];
}

function getSupplierStatusLabel(status: string) {
  if (status === "ativo") return "Ativo";
  if (status === "inativo") return "Inativo";
  return "Suspenso";
}

function getSupplierStatusClass(status: string) {
  if (status === "ativo") return "bg-green-600/30 text-green-300";
  if (status === "inativo") return "bg-gray-600/30 text-gray-300";
  return "bg-red-600/30 text-red-300";
}

export default function Suppliers() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "" });
  const [customServiceTypeInput, setCustomServiceTypeInput] = useState("");
  const [customServiceTypes, setCustomServiceTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    companyName: "",
    serviceTypes: [] as string[],
    contact: "",
    contactPerson: "",
    status: "ativo" as "ativo" | "inativo" | "suspenso",
    notes: "",
  });

  // Queries
  const {
    data: spaces = [],
    isLoading: spacesLoading,
    refetch: refetchSpaces,
  } = trpc.supplierSpaces.list.useQuery();
  const {
    data: suppliers = [],
    isLoading,
    refetch,
  } = trpc.suppliersWithSpace.list.useQuery(
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
    onError: error => {
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
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.suppliersWithSpace.delete.useMutation({
    onSuccess: () => {
      toast.success("Fornecedor deletado com sucesso!");
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createSpaceMutation = trpc.supplierSpaces.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateSpaceMutation = trpc.supplierSpaces.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteSpaceMutation = trpc.supplierSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade deletada com sucesso!");
      refetchSpaces();
      setSelectedSpace(null);
    },
    onError: error => {
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

  const handleEdit = (supplier: any) => {
    const parsedTypes = parseServiceTypes(supplier.serviceTypes);
    const parsedCustomTypes = parsedTypes.filter(
      type => !SERVICE_TYPES.includes(type)
    );

    setEditingId(supplier.id);
    setCustomServiceTypes(parsedCustomTypes);
    setCustomServiceTypeInput("");
    setFormData({
      companyName: supplier.companyName,
      serviceTypes: parsedTypes,
      contact: supplier.contact,
      contactPerson: supplier.contactPerson,
      status: supplier.status,
      notes: supplier.notes || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja deletar este fornecedor?")) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCustomServiceTypeInput("");
    setCustomServiceTypes([]);
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
    setFormData(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter(t => t !== type)
        : [...prev.serviceTypes, type],
    }));
  };

  const addCustomServiceType = () => {
    const trimmedType = customServiceTypeInput.trim();
    if (!trimmedType) {
      toast.error("Informe o tipo de serviço para adicionar");
      return;
    }

    const alreadyExists = availableServiceTypes.some(
      type => type.toLowerCase() === trimmedType.toLowerCase()
    );
    if (alreadyExists) {
      toast.warning("Esse tipo de serviço já existe na lista");
      return;
    }

    setCustomServiceTypes(prev => [...prev, trimmedType]);
    setFormData(prev => ({
      ...prev,
      serviceTypes: [...prev.serviceTypes, trimmedType],
    }));
    setCustomServiceTypeInput("");
  };

  const filteredSuppliers = suppliers.filter((supplier: any) =>
    supplier.companyName.toLowerCase().includes(filters.search.toLowerCase())
  );

  const availableServiceTypes = useMemo(() => {
    const supplierTypes = suppliers.flatMap((supplier: any) =>
      parseServiceTypes(supplier.serviceTypes)
    );
    const customTypesFromSuppliers = supplierTypes.filter(
      type => !SERVICE_TYPES.includes(type)
    );

    return Array.from(
      new Set([
        ...SERVICE_TYPES,
        ...customTypesFromSuppliers,
        ...customServiceTypes,
        ...formData.serviceTypes,
      ])
    );
  }, [suppliers, customServiceTypes, formData.serviceTypes]);

  if (!selectedSpace) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Fornecedores</h1>
          <p className="text-gray-400 mt-2">
            Gestão de fornecedores por unidade
          </p>
        </div>
        <SupplierSpaceManager
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
          headerDescription="Escolha uma unidade para gerenciar fornecedores"
          buttonLabel="Nova Unidade"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fornecedores</h1>
          <p className="text-gray-400 mt-2">
            Unidade:{" "}
            <span className="text-sky-400 font-semibold">
              {spaces.find((s: any) => s.id === selectedSpace)?.name}
            </span>
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setSelectedSpace(null)}
            className="w-full border-slate-600 text-gray-300 hover:bg-slate-800 sm:w-auto"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Trocar Unidade
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? "Editar" : "Novo"} Fornecedor
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Informe os dados do fornecedor para cadastrar ou atualizar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Nome da Empresa
                  </label>
                  <Input
                    value={formData.companyName}
                    onChange={e =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Tipos de Serviço
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {availableServiceTypes.map(type => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.serviceTypes.includes(type)}
                          onChange={() => toggleServiceType(type)}
                          className="rounded border-slate-600 text-sky-600"
                        />
                        <span className="text-sm text-gray-300">{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <Input
                      value={customServiceTypeInput}
                      onChange={event =>
                        setCustomServiceTypeInput(event.target.value)
                      }
                      placeholder="Adicionar outro tipo de serviço"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600 text-gray-300 hover:bg-slate-800"
                      onClick={addCustomServiceType}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Contato
                  </label>
                  <Input
                    value={formData.contact}
                    onChange={e =>
                      setFormData({ ...formData, contact: e.target.value })
                    }
                    placeholder="Telefone ou Email"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Responsável
                  </label>
                  <Input
                    value={formData.contactPerson}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        contactPerson: e.target.value,
                      })
                    }
                    placeholder="Nome de quem falar"
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
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
                  <label className="text-sm font-medium text-gray-300">
                    Notas
                  </label>
                  <Input
                    value={formData.notes}
                    onChange={e =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Observações adicionais"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-sky-600 hover:bg-sky-700"
                  >
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
              onChange={e => setFilters({ ...filters, search: e.target.value })}
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
                    <TableHead className="text-gray-300">
                      Tipos de Serviço
                    </TableHead>
                    <TableHead className="text-gray-300">Contato</TableHead>
                    <TableHead className="text-gray-300">Responsável</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300 text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier: any) => (
                    <TableRow
                      key={supplier.id}
                      className="border-slate-700 hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => setSelectedSupplier(supplier)}
                    >
                      <TableCell className="text-white font-medium">
                        {supplier.companyName}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        <div className="flex flex-wrap gap-1">
                          {parseServiceTypes(supplier.serviceTypes).map(type => (
                            <span
                              key={type}
                              className="px-2 py-1 bg-sky-600/30 text-sky-300 rounded text-xs"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {supplier.contact}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {supplier.contactPerson}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getSupplierStatusClass(
                            supplier.status
                          )}`}
                        >
                          {getSupplierStatusLabel(supplier.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              handleEdit(supplier);
                            }}
                            className="p-1 hover:bg-blue-600/30 rounded transition-colors"
                          >
                            <Edit2 className="h-4 w-4 text-blue-400" />
                          </button>
                          <button
                            onClick={event => {
                              event.stopPropagation();
                              handleDelete(supplier.id);
                            }}
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

      <Dialog
        open={Boolean(selectedSupplier)}
        onOpenChange={open => !open && setSelectedSupplier(null)}
      >
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[1000px] max-h-[92vh] overflow-y-auto bg-slate-900 border-slate-700 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">
              Detalhes do fornecedor
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Visualização completa das informações do fornecedor selecionado.
            </DialogDescription>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400">Nome da empresa</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {selectedSupplier.companyName}
                  </p>
                </div>

                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="text-sm mt-1">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getSupplierStatusClass(
                        selectedSupplier.status
                      )}`}
                    >
                      {getSupplierStatusLabel(selectedSupplier.status)}
                    </span>
                  </p>
                </div>

                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3">
                  <p className="text-xs text-gray-400">Responsável</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {selectedSupplier.contactPerson || "-"}
                  </p>
                </div>

                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400">Contato</p>
                  <p className="text-sm text-white mt-1 break-words">
                    {selectedSupplier.contact || "-"}
                  </p>
                </div>

                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400 mb-2">Tipos de serviço</p>
                  <div className="flex flex-wrap gap-2">
                    {parseServiceTypes(selectedSupplier.serviceTypes).length === 0 ? (
                      <span className="text-sm text-gray-400">-</span>
                    ) : (
                      parseServiceTypes(selectedSupplier.serviceTypes).map(type => (
                        <span
                          key={`${selectedSupplier.id}-${type}`}
                          className="px-2 py-1 bg-sky-600/30 text-sky-300 rounded text-xs"
                        >
                          {type}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-slate-700 bg-slate-800/70 p-3 md:col-span-2">
                  <p className="text-xs text-gray-400">Notas</p>
                  <p className="text-sm text-white mt-1 break-words whitespace-pre-wrap">
                    {selectedSupplier.notes || "-"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 text-gray-300 hover:bg-slate-700"
                  onClick={() => setSelectedSupplier(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
