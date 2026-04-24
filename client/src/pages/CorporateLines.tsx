import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Edit2, Plus, Smartphone, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PlanType = "pos_pago" | "pre_pago";

const initialForm = {
  planType: "pos_pago" as PlanType,
  department: "",
  company: "",
  responsibleName: "",
  phoneNumber: "",
  notes: "",
};

export default function CorporateLines() {
  const { user } = useAuth();
  const canAccess = user?.role === "superadmin" || user?.role === "admin";

  const [search, setSearch] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState<"all" | PlanType>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(initialForm);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  const linesQuery = trpc.corporateLines.list.useQuery(
    {
      planType: planTypeFilter === "all" ? undefined : planTypeFilter,
      department: departmentFilter === "all" ? undefined : departmentFilter,
      company: companyFilter === "all" ? undefined : companyFilter,
      search: search.trim() || undefined,
    },
    { enabled: canAccess }
  );

  const createMutation = trpc.corporateLines.create.useMutation({
    onSuccess: async () => {
      toast.success("Linha corporativa cadastrada com sucesso");
      setIsDialogOpen(false);
      setFormData(initialForm);
      setIsAddingDepartment(false);
      setNewDepartmentName("");
      setIsAddingCompany(false);
      setNewCompanyName("");
      await linesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const updateMutation = trpc.corporateLines.update.useMutation({
    onSuccess: async () => {
      toast.success("Linha corporativa atualizada com sucesso");
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(initialForm);
      setIsAddingDepartment(false);
      setNewDepartmentName("");
      setIsAddingCompany(false);
      setNewCompanyName("");
      await linesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const deleteMutation = trpc.corporateLines.delete.useMutation({
    onSuccess: async () => {
      toast.success("Linha corporativa removida");
      await linesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const lines = (linesQuery.data || []) as any[];

  const availableDepartments = useMemo(
    () =>
      Array.from(new Set(lines.map(line => String(line.department || ""))))
        .filter(Boolean)
        .sort(),
    [lines]
  );

  const availableCompanies = useMemo(
    () =>
      Array.from(new Set(lines.map(line => String(line.company || ""))))
        .filter(Boolean)
        .sort(),
    [lines]
  );

  const departmentOptions = useMemo(() => {
    if (!formData.department || availableDepartments.includes(formData.department)) {
      return availableDepartments;
    }

    return [...availableDepartments, formData.department].sort();
  }, [availableDepartments, formData.department]);

  const companyOptions = useMemo(() => {
    if (!formData.company || availableCompanies.includes(formData.company)) {
      return availableCompanies;
    }

    return [...availableCompanies, formData.company].sort();
  }, [availableCompanies, formData.company]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Linhas Corporativas</h1>
        <Card className="bg-slate-800/50 border-sky-700/30">
          <CardContent className="py-8">
            <p className="text-gray-300">
              Apenas usuários owner e admin podem acessar esta tela.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Linhas Corporativas</h1>
          <p className="text-gray-400 mt-1">
            Gestão de linhas pré-pago e pós-pago por departamento.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700"
          onClick={() => {
            setEditingId(null);
            setFormData(initialForm);
            setIsAddingDepartment(false);
            setNewDepartmentName("");
            setIsAddingCompany(false);
            setNewCompanyName("");
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Linha
        </Button>
      </div>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
          <CardDescription className="text-gray-400">
            Consulte por plano, departamento, empresa ou responsável.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por responsável, número ou observação"
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Select
              value={planTypeFilter}
              onValueChange={value => setPlanTypeFilter(value as any)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="pos_pago">Pós-pago</SelectItem>
                <SelectItem value="pre_pago">Pré-pago</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {availableDepartments.map(department => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {availableCompanies.map(company => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-sky-700/30">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead>Plano</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Número (DDD)</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line: any) => (
                <TableRow key={line.id} className="border-slate-700">
                  <TableCell>{line.planType === "pos_pago" ? "Pós-pago" : "Pré-pago"}</TableCell>
                  <TableCell>{line.department}</TableCell>
                  <TableCell>{line.company}</TableCell>
                  <TableCell>{line.responsibleName}</TableCell>
                  <TableCell>{line.phoneNumber}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{line.notes || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(line.id);
                          setFormData({
                            planType: line.planType,
                            department: line.department,
                            company: line.company,
                            responsibleName: line.responsibleName,
                            phoneNumber: line.phoneNumber,
                            notes: line.notes || "",
                          });
                          setIsAddingDepartment(false);
                          setNewDepartmentName("");
                          setIsAddingCompany(false);
                          setNewCompanyName("");
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (confirm("Deseja remover esta linha corporativa?")) {
                            deleteMutation.mutate(line.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {lines.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Smartphone className="w-10 h-10 mx-auto mb-2 opacity-70" />
              Nenhuma linha corporativa cadastrada.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Linha" : "Nova Linha"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Informe os dados da linha corporativa em uso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de plano</Label>
              <Select
                value={formData.planType}
                onValueChange={value =>
                  setFormData({ ...formData, planType: value as PlanType })
                }
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pos_pago">Pós-pago</SelectItem>
                  <SelectItem value="pre_pago">Pré-pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Departamento</Label>
                <div className="mt-1 flex gap-2">
                  <Select
                    value={formData.department || ""}
                    onValueChange={value =>
                      setFormData({ ...formData, department: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione um departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.map(department => (
                        <SelectItem key={department} value={department}>
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-gray-300 px-3"
                    onClick={() => {
                      setIsAddingDepartment(true);
                      setNewDepartmentName("");
                    }}
                    title="Adicionar novo departamento"
                  >
                    +
                  </Button>
                </div>
                {isAddingDepartment && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newDepartmentName}
                      onChange={event => setNewDepartmentName(event.target.value)}
                      placeholder="Novo departamento"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Button
                      type="button"
                      className="bg-sky-600 hover:bg-sky-700"
                      onClick={() => {
                        const normalized = newDepartmentName.trim();
                        if (!normalized) {
                          toast.error("Informe o nome do departamento");
                          return;
                        }

                        setFormData({ ...formData, department: normalized });
                        setIsAddingDepartment(false);
                        setNewDepartmentName("");
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Empresa</Label>
                <div className="mt-1 flex gap-2">
                  <Select
                    value={formData.company || ""}
                    onValueChange={value =>
                      setFormData({ ...formData, company: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyOptions.map(company => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-600 text-gray-300 px-3"
                    onClick={() => {
                      setIsAddingCompany(true);
                      setNewCompanyName("");
                    }}
                    title="Adicionar nova empresa"
                  >
                    +
                  </Button>
                </div>
                {isAddingCompany && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={newCompanyName}
                      onChange={event => setNewCompanyName(event.target.value)}
                      placeholder="Nova empresa"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Button
                      type="button"
                      className="bg-sky-600 hover:bg-sky-700"
                      onClick={() => {
                        const normalized = newCompanyName.trim();
                        if (!normalized) {
                          toast.error("Informe o nome da empresa");
                          return;
                        }

                        setFormData({ ...formData, company: normalized });
                        setIsAddingCompany(false);
                        setNewCompanyName("");
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Responsável</Label>
                <Input
                  value={formData.responsibleName}
                  onChange={event =>
                    setFormData({ ...formData, responsibleName: event.target.value })
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label>Número com DDD</Label>
                <Input
                  value={formData.phoneNumber}
                  onChange={event =>
                    setFormData({ ...formData, phoneNumber: event.target.value })
                  }
                  placeholder="(11) 99999-9999"
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={event =>
                  setFormData({ ...formData, notes: event.target.value })
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-sky-600 hover:bg-sky-700"
                disabled={createMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (
                    !formData.department.trim() ||
                    !formData.company.trim() ||
                    !formData.responsibleName.trim() ||
                    !formData.phoneNumber.trim()
                  ) {
                    toast.error("Preencha os campos obrigatórios");
                    return;
                  }

                  const payload = {
                    ...formData,
                    department: formData.department.trim(),
                    company: formData.company.trim(),
                    responsibleName: formData.responsibleName.trim(),
                    phoneNumber: formData.phoneNumber.trim(),
                    notes: formData.notes.trim() || undefined,
                  };

                  if (editingId) {
                    updateMutation.mutate({ id: editingId, ...payload });
                    return;
                  }

                  createMutation.mutate(payload);
                }}
              >
                {editingId ? "Salvar" : "Cadastrar"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-gray-300"
                onClick={() => setIsDialogOpen(false)}
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
