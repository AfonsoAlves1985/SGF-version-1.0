import { useState } from "react";
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
import { Plus, Edit2, Trash2, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SpaceManager } from "@/components/SpaceManager";

type ContractType = "mensal" | "anual";
type ContractStatus = "ativo" | "inativo" | "vencido";

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
      5,
      8
    )}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
    5,
    8
  )}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function isValidCnpj(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcCheckDigit = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);

    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstCheckDigit = calcCheckDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );
  const secondCheckDigit = calcCheckDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return (
    firstCheckDigit === Number(digits[12]) &&
    secondCheckDigit === Number(digits[13])
  );
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const amount = Number(digits) / 100;
  return BRL_FORMATTER.format(amount);
}

function parseCurrencyInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  return Number(normalized);
}

function formatCurrencyDisplay(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return "-";
  return `R$ ${BRL_FORMATTER.format(parsed)}`;
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

function parseMaskedDate(value: string) {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) return null;

  const [day, month, year] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isValidMaskedDate(value: string) {
  return parseMaskedDate(value) !== null;
}

function isEndDateAfterOrEqualStart(startDate: string, endDate: string) {
  const start = parseMaskedDate(startDate);
  const end = parseMaskedDate(endDate);
  if (!start || !end) return false;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return end.getTime() >= start.getTime();
}

function normalizeDateToMask(value?: string | null) {
  if (!value) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}-${month}-${year}`;
  }

  return value;
}

function isExpiredContractDate(value?: string | null) {
  const normalized = normalizeDateToMask(value);
  const parsed = parseMaskedDate(normalized);
  if (!parsed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(parsed);
  endDate.setHours(0, 0, 0, 0);

  return endDate.getTime() < today.getTime();
}

export default function Contracts() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: "" });
  const [formData, setFormData] = useState({
    companyName: "",
    cnpj: "",
    description: "",
    contact: "",
    value: "",
    contractType: "mensal" as ContractType,
    startDate: "",
    endDate: "",
    isRenewable: false,
    status: "ativo" as ContractStatus,
    notes: "",
  });

  const {
    data: spaces = [],
    isLoading: spacesLoading,
    refetch: refetchSpaces,
  } = trpc.contractSpaces.list.useQuery();

  const {
    data: contracts = [],
    isLoading,
    refetch,
  } = trpc.contractsWithSpace.list.useQuery(
    {
      spaceId: selectedSpace || undefined,
      search: filters.search || undefined,
    },
    { enabled: !!selectedSpace }
  );

  const createMutation = trpc.contractsWithSpace.create.useMutation({
    onSuccess: () => {
      toast.success("Contrato criado com sucesso!");
      refetch();
      resetForm();
      setIsOpen(false);
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateMutation = trpc.contractsWithSpace.update.useMutation({
    onSuccess: () => {
      toast.success("Contrato atualizado com sucesso!");
      refetch();
      resetForm();
      setIsOpen(false);
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteMutation = trpc.contractsWithSpace.delete.useMutation({
    onSuccess: () => {
      toast.success("Contrato removido com sucesso!");
      refetch();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const createSpaceMutation = trpc.contractSpaces.create.useMutation({
    onSuccess: () => {
      toast.success("Unidade criada com sucesso!");
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateSpaceMutation = trpc.contractSpaces.update.useMutation({
    onSuccess: () => {
      toast.success("Unidade atualizada com sucesso!");
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteSpaceMutation = trpc.contractSpaces.delete.useMutation({
    onSuccess: () => {
      toast.success("Unidade removida com sucesso!");
      setSelectedSpace(null);
      refetchSpaces();
    },
    onError: error => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const cnpjDigits = formData.cnpj.replace(/\D/g, "");
  const cnpjIsValid = isValidCnpj(formData.cnpj);
  const showCnpjValidation = cnpjDigits.length > 0;
  const startDateIsValid = isValidMaskedDate(formData.startDate);
  const endDateIsValid = isValidMaskedDate(formData.endDate);
  const hasValidDateRange =
    startDateIsValid &&
    endDateIsValid &&
    isEndDateAfterOrEqualStart(formData.startDate, formData.endDate);
  const isSubmitDisabled =
    createMutation.isPending ||
    updateMutation.isPending ||
    !cnpjIsValid ||
    !hasValidDateRange;

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      companyName: "",
      cnpj: "",
      description: "",
      contact: "",
      value: "",
      contractType: "mensal",
      startDate: "",
      endDate: "",
      isRenewable: false,
      status: "ativo",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSpace) {
      toast.error("Selecione uma unidade primeiro.");
      return;
    }

    if (!isValidCnpj(formData.cnpj)) {
      toast.error("Informe um CNPJ válido.");
      return;
    }

    if (!isValidMaskedDate(formData.startDate)) {
      toast.error("Data de início inválida. Use DD-MM-YYYY.");
      return;
    }

    if (!isValidMaskedDate(formData.endDate)) {
      toast.error("Data de fim inválida. Use DD-MM-YYYY.");
      return;
    }

    if (!isEndDateAfterOrEqualStart(formData.startDate, formData.endDate)) {
      toast.error("Data de fim não pode ser anterior à data de início.");
      return;
    }

    const parsedValue = parseCurrencyInput(formData.value);
    if (Number.isNaN(parsedValue)) {
      toast.error("Informe um valor válido para o contrato.");
      return;
    }

    const payload = {
      spaceId: selectedSpace,
      companyName: formData.companyName,
      cnpj: formatCnpj(formData.cnpj),
      description: formData.description,
      contact: formData.contact,
      value: parsedValue,
      contractType: formData.contractType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      isRenewable: formData.isRenewable,
      status: formData.status,
      notes: formData.notes || undefined,
    };

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleEdit = (contract: any) => {
    setEditingId(contract.id);
    const numericValue = Number(contract.value);

    setFormData({
      companyName: contract.companyName || "",
      cnpj: formatCnpj(contract.cnpj || ""),
      description: contract.description || "",
      contact: contract.contact || "",
      value: Number.isNaN(numericValue)
        ? ""
        : BRL_FORMATTER.format(numericValue),
      contractType: (contract.contractType || "mensal") as ContractType,
      startDate: normalizeDateToMask(contract.signatureDate),
      endDate: normalizeDateToMask(contract.endDate),
      isRenewable: !!contract.isRenewable,
      status: (contract.status || "ativo") as ContractStatus,
      notes: contract.notes || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja remover este contrato?")) {
      deleteMutation.mutate(id);
    }
  };

  if (!selectedSpace) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Contratos</h1>
          <p className="text-gray-400 mt-2">
            Cadastre contratos por unidade (ex: Febracis, Lead Fit)
          </p>
        </div>

        <SpaceManager
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
          headerDescription="Escolha uma unidade para gerenciar contratos"
          buttonLabel="Nova Unidade"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contratos</h1>
          <p className="text-gray-400 mt-2">
            Unidade:{" "}
            <span className="text-orange-400 font-semibold">
              {spaces.find((space: any) => space.id === selectedSpace)?.name}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedSpace(null)}
            className="border-slate-600 text-gray-300 hover:bg-slate-800"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Trocar Unidade
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingId ? "Editar" : "Novo"} Contrato
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Cadastre os dados principais do contrato da unidade
                  selecionada.
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
                    CNPJ
                  </label>
                  <Input
                    value={formData.cnpj}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        cnpj: formatCnpj(e.target.value),
                      })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                  {showCnpjValidation ? (
                    cnpjIsValid ? (
                      <p className="text-xs text-green-400 mt-1">
                        CNPJ válido.
                      </p>
                    ) : (
                      <p className="text-xs text-red-400 mt-1">
                        CNPJ inválido.
                      </p>
                    )
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Natureza/Descrição do Contrato
                  </label>
                  <Input
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Ex: Prestação de serviços de limpeza"
                    required
                  />
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
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Telefone e/ou email"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Valor (R$)
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.value}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        value: formatCurrencyInput(e.target.value),
                      })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Periodicidade
                  </label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(value: ContractType) =>
                      setFormData({ ...formData, contractType: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Data de Início
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.startDate}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          startDate: formatDateInput(e.target.value),
                        })
                      }
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                      placeholder="DD-MM-YYYY"
                      required
                    />
                    {formData.startDate.length > 0 && !startDateIsValid ? (
                      <p className="text-xs text-red-400 mt-1">
                        Data inválida. Use DD-MM-YYYY.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      Data de Fim
                    </label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      value={formData.endDate}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          endDate: formatDateInput(e.target.value),
                        })
                      }
                      className="bg-slate-700 border-slate-600 text-white mt-1"
                      placeholder="DD-MM-YYYY"
                      required
                    />
                    {formData.endDate.length > 0 && !endDateIsValid ? (
                      <p className="text-xs text-red-400 mt-1">
                        Data inválida. Use DD-MM-YYYY.
                      </p>
                    ) : null}
                    {startDateIsValid &&
                    endDateIsValid &&
                    !hasValidDateRange ? (
                      <p className="text-xs text-red-400 mt-1">
                        Data de fim não pode ser anterior à data de início.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Contrato Renovável?
                  </label>
                  <Select
                    value={formData.isRenewable ? "sim" : "nao"}
                    onValueChange={value =>
                      setFormData({ ...formData, isRenewable: value === "sim" })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: ContractStatus) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Observações
                  </label>
                  <Input
                    value={formData.notes}
                    onChange={e =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                    placeholder="Informações adicionais"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60"
                    disabled={isSubmitDisabled}
                  >
                    {editingId ? "Atualizar" : "Criar"} Contrato
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
          <CardTitle className="text-white">Contratos Cadastrados</CardTitle>
          <CardDescription className="text-gray-400">
            Pesquisa por empresa dentro da unidade selecionada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por empresa..."
              value={filters.search}
              onChange={e => setFilters({ search: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-300">Empresa</TableHead>
                <TableHead className="text-gray-300">CNPJ</TableHead>
                <TableHead className="text-gray-300">Tipo</TableHead>
                <TableHead className="text-gray-300">Valor</TableHead>
                <TableHead className="text-gray-300">Início</TableHead>
                <TableHead className="text-gray-300">Fim</TableHead>
                <TableHead className="text-gray-300">Renovável</TableHead>
                <TableHead className="text-gray-300">Contato</TableHead>
                <TableHead className="text-right text-gray-300">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-slate-700">
                  <TableCell
                    colSpan={9}
                    className="text-center text-gray-400 py-8"
                  >
                    Carregando contratos...
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow className="border-slate-700">
                  <TableCell
                    colSpan={9}
                    className="text-center text-gray-400 py-8"
                  >
                    Nenhum contrato encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract: any) =>
                  (() => {
                    const isExpired =
                      contract.status === "vencido" ||
                      isExpiredContractDate(contract.endDate);
                    const defaultTextClass = isExpired
                      ? "text-red-400"
                      : "text-gray-300";

                    return (
                      <TableRow
                        key={contract.id}
                        className={`border-slate-700 ${
                          isExpired ? "bg-red-950/20" : ""
                        }`}
                      >
                        <TableCell
                          className={`font-medium ${
                            isExpired ? "text-red-300" : "text-white"
                          }`}
                        >
                          {contract.companyName}
                        </TableCell>
                        <TableCell className={defaultTextClass}>
                          {contract.cnpj || "-"}
                        </TableCell>
                        <TableCell className={`${defaultTextClass} capitalize`}>
                          {contract.contractType}
                        </TableCell>
                        <TableCell className={defaultTextClass}>
                          {formatCurrencyDisplay(contract.value)}
                        </TableCell>
                        <TableCell className={defaultTextClass}>
                          {normalizeDateToMask(contract.signatureDate)}
                        </TableCell>
                        <TableCell className={defaultTextClass}>
                          {normalizeDateToMask(contract.endDate)}
                        </TableCell>
                        <TableCell className={defaultTextClass}>
                          {contract.isRenewable ? "Sim" : "Não"}
                        </TableCell>
                        <TableCell className={defaultTextClass}>
                          {contract.contact || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(contract)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-slate-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(contract.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-slate-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })()
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
