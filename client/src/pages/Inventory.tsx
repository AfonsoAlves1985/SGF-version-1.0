import { useEffect, useMemo, useState } from "react";
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
import { Building2, Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { SpaceManager, type Space } from "@/components/SpaceManager";
import { DateInputWithCalendar } from "@/components/DateInputWithCalendar";

const DATE_MASK_REGEX = /^\d{2}-\d{2}-\d{4}$/;

type AssetFormData = {
  filial: string;
  nrBem: string;
  descricao: string;
  marca: string;
  modelo: string;
  conta: string;
  centroCusto: string;
  local: string;
  fornecedor: string;
  dtAquis: string;
  anoAquis: string;
  vlrCusto: string;
};

type AssetEditableField = keyof AssetFormData;
type DepartmentField = "conta" | "centroCusto" | "local";

type InlineEditState = {
  assetId: number;
  field: AssetEditableField;
};

const REQUIRED_FIELDS: AssetEditableField[] = [
  "filial",
  "nrBem",
  "descricao",
  "conta",
  "centroCusto",
  "dtAquis",
  "vlrCusto",
];

const ASSET_FIELD_LABEL: Record<AssetEditableField, string> = {
  filial: "Filial",
  nrBem: "Nr. bem",
  descricao: "Descrição",
  marca: "Marca",
  modelo: "Modelo",
  conta: "Conta",
  centroCusto: "Centro de Custo",
  local: "Local",
  fornecedor: "Fornecedor",
  dtAquis: "Dt. Aquis.",
  anoAquis: "Ano Aquis.",
  vlrCusto: "Vlr. Custo",
};

const ADD_DEPARTMENT_OPTION = "__add_new_department__";

const INITIAL_ASSET_FORM_DATA: AssetFormData = {
  filial: "",
  nrBem: "",
  descricao: "",
  marca: "",
  modelo: "",
  conta: "",
  centroCusto: "",
  local: "",
  fornecedor: "",
  dtAquis: "",
  anoAquis: "",
  vlrCusto: "",
};

function formatCurrencyBRL(value: unknown) {
  const amount =
    typeof value === "number" ? value : Number(String(value || "0"));

  if (Number.isNaN(amount)) return "R$ 0,00";

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseCurrencyInput(value: string) {
  const normalized = value.trim();
  if (!normalized) return Number.NaN;

  if (normalized.includes(",")) {
    return Number(normalized.replace(/\./g, "").replace(",", "."));
  }

  return Number(normalized);
}

function toInlineString(asset: any, field: AssetEditableField) {
  if (field === "anoAquis") return asset.anoAquis ? String(asset.anoAquis) : "";
  if (field === "vlrCusto") return String(asset.vlrCusto ?? "");
  return String(asset[field] ?? "");
}

export default function Inventory() {
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [assetFormData, setAssetFormData] =
    useState<AssetFormData>(INITIAL_ASSET_FORM_DATA);

  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [inlineValue, setInlineValue] = useState("");
  const [inlineDepartmentCustomMode, setInlineDepartmentCustomMode] =
    useState(false);
  const [formDepartmentCustomMode, setFormDepartmentCustomMode] = useState<
    Record<DepartmentField, boolean>
  >({
    conta: false,
    centroCusto: false,
    local: false,
  });

  const spacesQuery = trpc.inventorySpaces.list.useQuery();
  const spaces = (spacesQuery.data || []) as Space[];

  const selectedSpaceData = useMemo(
    () => spaces.find(space => space.id === selectedSpace) || null,
    [selectedSpace, spaces]
  );

  const assetsQuery = trpc.inventoryAssets.list.useQuery(
    {
      spaceId: selectedSpace ?? undefined,
      search: search.trim() || undefined,
    },
    {
      enabled: Boolean(selectedSpace),
    }
  );

  const assets = (assetsQuery.data || []) as any[];

  useEffect(() => {
    if (!selectedSpace && spaces.length > 0) {
      setSelectedSpace(spaces[0].id);
    }
  }, [selectedSpace, spaces]);

  const contaOptions = useMemo(
    () => Array.from(new Set(assets.map(item => item.conta).filter(Boolean))),
    [assets]
  );

  const centroCustoOptions = useMemo(
    () =>
      Array.from(new Set(assets.map(item => item.centroCusto).filter(Boolean))),
    [assets]
  );

  const localOptions = useMemo(
    () => Array.from(new Set(assets.map(item => item.local).filter(Boolean))),
    [assets]
  );

  const getDepartmentOptions = (field: DepartmentField) => {
    if (field === "conta") return contaOptions;
    if (field === "centroCusto") return centroCustoOptions;
    return localOptions;
  };

  const isDepartmentField = (field: AssetEditableField): field is DepartmentField =>
    field === "conta" || field === "centroCusto" || field === "local";

  const createSpaceMutation = trpc.inventorySpaces.create.useMutation({
    onSuccess: async () => {
      toast.success("Unidade criada com sucesso");
      await spacesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const updateSpaceMutation = trpc.inventorySpaces.update.useMutation({
    onSuccess: async () => {
      toast.success("Unidade atualizada com sucesso");
      await spacesQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const deleteSpaceMutation = trpc.inventorySpaces.delete.useMutation({
    onSuccess: async (_data, deletedId) => {
      toast.success("Unidade removida com sucesso");
      if (selectedSpace === deletedId) setSelectedSpace(null);
      await spacesQuery.refetch();
      await assetsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const createAssetMutation = trpc.inventoryAssets.create.useMutation({
    onSuccess: async () => {
      toast.success("Bem cadastrado com sucesso");
      setIsAssetDialogOpen(false);
      setAssetFormData(INITIAL_ASSET_FORM_DATA);
      setFormDepartmentCustomMode({
        conta: false,
        centroCusto: false,
        local: false,
      });
      await assetsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const updateAssetMutation = trpc.inventoryAssets.update.useMutation({
    onSuccess: async () => {
      toast.success("Campo atualizado com sucesso");
      setInlineEdit(null);
      setInlineValue("");
      setInlineDepartmentCustomMode(false);
      await assetsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const deleteAssetMutation = trpc.inventoryAssets.delete.useMutation({
    onSuccess: async () => {
      toast.success("Bem removido com sucesso");
      await assetsQuery.refetch();
    },
    onError: error => toast.error(error.message),
  });

  const isSpaceMutating =
    createSpaceMutation.isPending ||
    updateSpaceMutation.isPending ||
    deleteSpaceMutation.isPending;

  const isAssetMutating =
    createAssetMutation.isPending ||
    updateAssetMutation.isPending ||
    deleteAssetMutation.isPending;

  const handleOpenAssetDialog = () => {
    if (!selectedSpaceData) {
      toast.error("Selecione uma unidade para cadastrar o bem");
      return;
    }

    setAssetFormData({
      ...INITIAL_ASSET_FORM_DATA,
      filial: selectedSpaceData.name,
    });
    setFormDepartmentCustomMode({
      conta: false,
      centroCusto: false,
      local: false,
    });
    setIsAssetDialogOpen(true);
  };

  const handleCreateAsset = () => {
    if (!selectedSpaceData) {
      toast.error("Selecione uma unidade para cadastrar o bem");
      return;
    }

    if (
      !assetFormData.filial.trim() ||
      !assetFormData.nrBem.trim() ||
      !assetFormData.descricao.trim() ||
      !assetFormData.conta.trim() ||
      !assetFormData.centroCusto.trim() ||
      !assetFormData.dtAquis.trim() ||
      !assetFormData.vlrCusto.trim()
    ) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!DATE_MASK_REGEX.test(assetFormData.dtAquis.trim())) {
      toast.error("Data de aquisição deve estar no formato DD-MM-YYYY");
      return;
    }

    const normalizedCost = parseCurrencyInput(assetFormData.vlrCusto);
    if (Number.isNaN(normalizedCost) || normalizedCost < 0) {
      toast.error("Valor de custo inválido");
      return;
    }

    const normalizedYear = assetFormData.anoAquis.trim()
      ? Number(assetFormData.anoAquis)
      : Number(assetFormData.dtAquis.split("-")[2]);

    createAssetMutation.mutate({
      spaceId: selectedSpaceData.id,
      filial: assetFormData.filial.trim(),
      nrBem: assetFormData.nrBem.trim(),
      descricao: assetFormData.descricao.trim(),
      marca: assetFormData.marca.trim() || undefined,
      modelo: assetFormData.modelo.trim() || undefined,
      conta: assetFormData.conta.trim(),
      centroCusto: assetFormData.centroCusto.trim(),
      local: assetFormData.local.trim() || undefined,
      fornecedor: assetFormData.fornecedor.trim() || undefined,
      dtAquis: assetFormData.dtAquis.trim(),
      anoAquis:
        !Number.isNaN(normalizedYear) && normalizedYear > 0
          ? normalizedYear
          : undefined,
      vlrCusto: normalizedCost,
    });
  };

  const startInlineEdit = (asset: any, field: AssetEditableField) => {
    if (isAssetMutating) return;
    setInlineEdit({ assetId: asset.id, field });
    const value = toInlineString(asset, field);
    setInlineValue(value);

    if (isDepartmentField(field)) {
      const options = getDepartmentOptions(field);
      setInlineDepartmentCustomMode(
        Boolean(value.trim()) && !options.includes(value)
      );
    } else {
      setInlineDepartmentCustomMode(false);
    }
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
    setInlineValue("");
    setInlineDepartmentCustomMode(false);
  };

  const saveInlineEdit = () => {
    if (!inlineEdit) return;

    const { assetId, field } = inlineEdit;
    const trimmedValue = inlineValue.trim();

    if (REQUIRED_FIELDS.includes(field) && !trimmedValue) {
      toast.error(`${ASSET_FIELD_LABEL[field]} é obrigatório`);
      return;
    }

    const payload: Record<string, unknown> = { id: assetId };

    if (field === "vlrCusto") {
      const normalizedCost = parseCurrencyInput(inlineValue);
      if (Number.isNaN(normalizedCost) || normalizedCost < 0) {
        toast.error("Valor de custo inválido");
        return;
      }
      payload.vlrCusto = normalizedCost;
    } else if (field === "dtAquis") {
      if (!DATE_MASK_REGEX.test(trimmedValue)) {
        toast.error("Data de aquisição deve estar no formato DD-MM-YYYY");
        return;
      }
      payload.dtAquis = trimmedValue;
    } else if (field === "anoAquis") {
      if (!trimmedValue) {
        toast.error("Ano de aquisição é obrigatório para edição inline");
        return;
      }
      const year = Number(trimmedValue);
      if (!Number.isInteger(year) || year <= 0) {
        toast.error("Ano de aquisição inválido");
        return;
      }
      payload.anoAquis = year;
    } else {
      payload[field] = inlineValue;
    }

    updateAssetMutation.mutate(payload as any);
  };

  const handleDeleteAsset = (id: number) => {
    if (window.confirm("Tem certeza que deseja remover este bem?")) {
      deleteAssetMutation.mutate(id);
    }
  };

  const renderInlineEditor = (field: AssetEditableField) => {
    if (field === "dtAquis") {
      return (
        <DateInputWithCalendar
          value={inlineValue}
          onChange={setInlineValue}
          className="h-8 bg-slate-700 border-slate-600 text-white"
          disabled={isAssetMutating}
        />
      );
    }

    if (isDepartmentField(field) && !inlineDepartmentCustomMode) {
      const options = getDepartmentOptions(field);
      const currentValue = options.includes(inlineValue) ? inlineValue : "";

      return (
        <Select
          value={currentValue}
          onValueChange={value => {
            if (value === ADD_DEPARTMENT_OPTION) {
              setInlineDepartmentCustomMode(true);
              setInlineValue("");
              return;
            }
            setInlineValue(value);
          }}
          disabled={isAssetMutating}
        >
          <SelectTrigger className="h-8 bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder={`Selecionar ${ASSET_FIELD_LABEL[field]}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            <SelectItem value={ADD_DEPARTMENT_OPTION}>
              <span className="inline-flex items-center gap-2 text-sky-400">
                <Plus className="h-4 w-4" />
                Novo departamento
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (isDepartmentField(field) && inlineDepartmentCustomMode) {
      return (
        <div className="flex items-center gap-1">
          <Input
            value={inlineValue}
            onChange={event => setInlineValue(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveInlineEdit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancelInlineEdit();
              }
            }}
            className="h-8 bg-slate-700 border-slate-600 text-white"
            placeholder="Novo departamento"
            disabled={isAssetMutating}
            autoFocus
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 border-slate-600 text-gray-300 hover:bg-slate-700"
            onClick={() => setInlineDepartmentCustomMode(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <Input
        type={field === "anoAquis" || field === "vlrCusto" ? "number" : "text"}
        step={field === "vlrCusto" ? "0.01" : undefined}
        value={inlineValue}
        onChange={event => setInlineValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") {
            event.preventDefault();
            saveInlineEdit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelInlineEdit();
          }
        }}
        className="h-8 bg-slate-700 border-slate-600 text-white"
        disabled={isAssetMutating}
        autoFocus
      />
    );
  };

  const renderEditableCell = (
    asset: any,
    field: AssetEditableField,
    renderedValue: React.ReactNode,
    className: string
  ) => {
    const isEditing =
      inlineEdit?.assetId === asset.id && inlineEdit?.field === field;

    if (isEditing) {
      return (
        <TableCell className={className}>
          <div className="flex items-center gap-1 min-w-[230px]">
            <div className="flex-1">{renderInlineEditor(field)}</div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 border-sky-600 text-sky-300 hover:bg-sky-600/20"
              disabled={isAssetMutating}
              onClick={saveInlineEdit}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 border-slate-600 text-gray-300 hover:bg-slate-700"
              disabled={isAssetMutating}
              onClick={cancelInlineEdit}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      );
    }

    return (
      <TableCell className={className}>
        <button
          type="button"
          className="text-left hover:text-sky-300 transition"
          onClick={() => startInlineEdit(asset, field)}
          disabled={isAssetMutating}
          title={`Editar ${ASSET_FIELD_LABEL[field]}`}
        >
          {renderedValue}
        </button>
      </TableCell>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Inventário</h1>
        <p className="text-gray-400 mt-1">
          Gerencie unidades e cadastre bens por tabela separada.
        </p>
      </div>

      <SpaceManager
        spaces={spaces}
        selectedSpace={selectedSpace}
        onSelectSpace={setSelectedSpace}
        onCreateSpace={data => createSpaceMutation.mutate(data)}
        onUpdateSpace={(id, data) => updateSpaceMutation.mutate({ id, ...data })}
        onDeleteSpace={id => deleteSpaceMutation.mutate(id)}
        isLoading={isSpaceMutating}
        headerTitle="Unidades do Inventário"
        headerDescription="Crie e selecione a unidade para visualizar a tabela de bens"
        buttonLabel="Nova Unidade"
      />

      {!selectedSpaceData ? (
        <Card className="bg-slate-800/50 border-sky-700/30">
          <CardContent className="py-10 text-center">
            <Building2 className="h-8 w-8 text-sky-500 mx-auto mb-3" />
            <p className="text-gray-300">
              Selecione uma unidade para visualizar e cadastrar os bens.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Tabela da unidade: {selectedSpaceData.name}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Edição inline ativa. Em Conta/Centro de Custo/Local você pode
                escolher da lista ou digitar um novo valor.
              </p>
            </div>
            <Button
              onClick={handleOpenAssetDialog}
              className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Bem
            </Button>
          </div>

          <Card className="bg-slate-800/50 border-sky-700/30">
            <CardHeader>
              <CardTitle className="text-white">Filtros</CardTitle>
              <CardDescription className="text-gray-400">
                Pesquise por número do bem, descrição, fornecedor ou local.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Pesquisar..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-sky-700/30">
            <CardHeader>
              <CardTitle className="text-white">Bens cadastrados</CardTitle>
              <CardDescription className="text-gray-400">
                {(assetsQuery.data || []).length} registro(s) nesta unidade.
                Clique em qualquer coluna para editar inline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetsQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto" />
                  <p className="text-gray-400 mt-2">Carregando dados...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Nenhum bem cadastrado nesta unidade.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-sky-700/30 hover:bg-slate-700/50">
                        <TableHead className="text-gray-300">Filial</TableHead>
                        <TableHead className="text-gray-300">Nr. bem</TableHead>
                        <TableHead className="text-gray-300">Descrição</TableHead>
                        <TableHead className="text-gray-300">Marca</TableHead>
                        <TableHead className="text-gray-300">Modelo</TableHead>
                        <TableHead className="text-gray-300">Conta</TableHead>
                        <TableHead className="text-gray-300">
                          Centro de Custo
                        </TableHead>
                        <TableHead className="text-gray-300">Local</TableHead>
                        <TableHead className="text-gray-300">
                          Fornecedor
                        </TableHead>
                        <TableHead className="text-gray-300">
                          Dt. Aquis.
                        </TableHead>
                        <TableHead className="text-gray-300">
                          Ano Aquis.
                        </TableHead>
                        <TableHead className="text-gray-300">
                          Vlr. Custo
                        </TableHead>
                        <TableHead className="text-gray-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.map(asset => (
                        <TableRow
                          key={asset.id}
                          className="border-sky-700/20 hover:bg-slate-700/30"
                        >
                          {renderEditableCell(
                            asset,
                            "filial",
                            asset.filial,
                            "text-white"
                          )}
                          {renderEditableCell(
                            asset,
                            "nrBem",
                            asset.nrBem,
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "descricao",
                            asset.descricao,
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "marca",
                            asset.marca || "-",
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "modelo",
                            asset.modelo || "-",
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "conta",
                            asset.conta,
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "centroCusto",
                            asset.centroCusto,
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "local",
                            asset.local || "-",
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "fornecedor",
                            asset.fornecedor || "-",
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "dtAquis",
                            asset.dtAquis,
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "anoAquis",
                            asset.anoAquis || "-",
                            "text-gray-300"
                          )}
                          {renderEditableCell(
                            asset,
                            "vlrCusto",
                            formatCurrencyBRL(asset.vlrCusto),
                            "text-sky-400 font-semibold"
                          )}

                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-red-400 hover:bg-red-600/10"
                              disabled={isAssetMutating}
                              onClick={() => handleDeleteAsset(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={isAssetDialogOpen} onOpenChange={setIsAssetDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">Novo bem</DialogTitle>
            <DialogDescription className="text-gray-400">
              Cadastre as colunas da tabela para a unidade selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300">Filial *</Label>
              <Input
                value={assetFormData.filial}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    filial: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Nr. bem *</Label>
              <Input
                value={assetFormData.nrBem}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    nrBem: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <Label className="text-gray-300">Descrição *</Label>
              <Input
                value={assetFormData.descricao}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    descricao: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Marca</Label>
              <Input
                value={assetFormData.marca}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    marca: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Modelo</Label>
              <Input
                value={assetFormData.modelo}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    modelo: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Conta *</Label>
              {formDepartmentCustomMode.conta ? (
                <div className="mt-1 space-y-2">
                  <Input
                    value={assetFormData.conta}
                    onChange={event =>
                      setAssetFormData(current => ({
                        ...current,
                        conta: event.target.value,
                      }))
                    }
                    placeholder="Digite novo departamento"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() =>
                      setFormDepartmentCustomMode(current => ({
                        ...current,
                        conta: false,
                      }))
                    }
                  >
                    Voltar para lista
                  </Button>
                </div>
              ) : (
                <Select
                  value={contaOptions.includes(assetFormData.conta) ? assetFormData.conta : ""}
                  onValueChange={value => {
                    if (value === ADD_DEPARTMENT_OPTION) {
                      setFormDepartmentCustomMode(current => ({
                        ...current,
                        conta: true,
                      }));
                      setAssetFormData(current => ({ ...current, conta: "" }));
                      return;
                    }

                    setAssetFormData(current => ({ ...current, conta: value }));
                  }}
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {contaOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value={ADD_DEPARTMENT_OPTION}>
                      <span className="inline-flex items-center gap-2 text-sky-400">
                        <Plus className="h-4 w-4" />
                        Novo departamento
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-gray-300">Centro de Custo *</Label>
              {formDepartmentCustomMode.centroCusto ? (
                <div className="mt-1 space-y-2">
                  <Input
                    value={assetFormData.centroCusto}
                    onChange={event =>
                      setAssetFormData(current => ({
                        ...current,
                        centroCusto: event.target.value,
                      }))
                    }
                    placeholder="Digite novo departamento"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() =>
                      setFormDepartmentCustomMode(current => ({
                        ...current,
                        centroCusto: false,
                      }))
                    }
                  >
                    Voltar para lista
                  </Button>
                </div>
              ) : (
                <Select
                  value={
                    centroCustoOptions.includes(assetFormData.centroCusto)
                      ? assetFormData.centroCusto
                      : ""
                  }
                  onValueChange={value => {
                    if (value === ADD_DEPARTMENT_OPTION) {
                      setFormDepartmentCustomMode(current => ({
                        ...current,
                        centroCusto: true,
                      }));
                      setAssetFormData(current => ({
                        ...current,
                        centroCusto: "",
                      }));
                      return;
                    }

                    setAssetFormData(current => ({
                      ...current,
                      centroCusto: value,
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione o centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    {centroCustoOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value={ADD_DEPARTMENT_OPTION}>
                      <span className="inline-flex items-center gap-2 text-sky-400">
                        <Plus className="h-4 w-4" />
                        Novo departamento
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-gray-300">Local</Label>
              {formDepartmentCustomMode.local ? (
                <div className="mt-1 space-y-2">
                  <Input
                    value={assetFormData.local}
                    onChange={event =>
                      setAssetFormData(current => ({
                        ...current,
                        local: event.target.value,
                      }))
                    }
                    placeholder="Digite novo local"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-gray-300 hover:bg-slate-700"
                    onClick={() =>
                      setFormDepartmentCustomMode(current => ({
                        ...current,
                        local: false,
                      }))
                    }
                  >
                    Voltar para lista
                  </Button>
                </div>
              ) : (
                <Select
                  value={
                    localOptions.includes(assetFormData.local)
                      ? assetFormData.local
                      : ""
                  }
                  onValueChange={value => {
                    if (value === ADD_DEPARTMENT_OPTION) {
                      setFormDepartmentCustomMode(current => ({
                        ...current,
                        local: true,
                      }));
                      setAssetFormData(current => ({ ...current, local: "" }));
                      return;
                    }

                    setAssetFormData(current => ({ ...current, local: value }));
                  }}
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {localOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                    <SelectItem value={ADD_DEPARTMENT_OPTION}>
                      <span className="inline-flex items-center gap-2 text-sky-400">
                        <Plus className="h-4 w-4" />
                        Novo departamento
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label className="text-gray-300">Fornecedor</Label>
              <Input
                value={assetFormData.fornecedor}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    fornecedor: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Dt. Aquis. *</Label>
              <DateInputWithCalendar
                value={assetFormData.dtAquis}
                onChange={value =>
                  setAssetFormData(current => ({
                    ...current,
                    dtAquis: value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Ano Aquis.</Label>
              <Input
                type="number"
                value={assetFormData.anoAquis}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    anoAquis: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Vlr. Custo *</Label>
              <Input
                value={assetFormData.vlrCusto}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    vlrCusto: event.target.value,
                  }))
                }
                placeholder="Ex: 1500,00"
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleCreateAsset}
              className="flex-1 bg-sky-600 hover:bg-sky-700"
              disabled={isAssetMutating}
            >
              {createAssetMutation.isPending ? "Salvando..." : "Salvar bem"}
            </Button>
            <Button
              variant="outline"
              className="border-slate-600 text-gray-300 hover:bg-slate-700"
              onClick={() => setIsAssetDialogOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
