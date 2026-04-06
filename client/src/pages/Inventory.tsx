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
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SpaceManager, type Space } from "@/components/SpaceManager";

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

  if (Number.isNaN(amount)) {
    return "R$ 0,00";
  }

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

export default function Inventory() {
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [assetFormData, setAssetFormData] =
    useState<AssetFormData>(INITIAL_ASSET_FORM_DATA);
  const [isFieldEditDialogOpen, setIsFieldEditDialogOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<AssetEditableField | null>(
    null
  );
  const [editingFieldValue, setEditingFieldValue] = useState("");

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

  useEffect(() => {
    if (!selectedSpace && spaces.length > 0) {
      setSelectedSpace(spaces[0].id);
    }
  }, [selectedSpace, spaces]);

  const createSpaceMutation = trpc.inventorySpaces.create.useMutation({
    onSuccess: async () => {
      toast.success("Unidade criada com sucesso");
      await spacesQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateSpaceMutation = trpc.inventorySpaces.update.useMutation({
    onSuccess: async () => {
      toast.success("Unidade atualizada com sucesso");
      await spacesQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteSpaceMutation = trpc.inventorySpaces.delete.useMutation({
    onSuccess: async (_data, deletedId) => {
      toast.success("Unidade removida com sucesso");
      if (selectedSpace === deletedId) {
        setSelectedSpace(null);
      }
      await spacesQuery.refetch();
      await assetsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const createAssetMutation = trpc.inventoryAssets.create.useMutation({
    onSuccess: async () => {
      toast.success("Bem cadastrado com sucesso");
      setIsAssetDialogOpen(false);
      setAssetFormData(INITIAL_ASSET_FORM_DATA);
      await assetsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const updateAssetMutation = trpc.inventoryAssets.update.useMutation({
    onSuccess: async () => {
      toast.success("Campo atualizado com sucesso");
      setIsFieldEditDialogOpen(false);
      setEditingAssetId(null);
      setEditingField(null);
      setEditingFieldValue("");
      await assetsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const deleteAssetMutation = trpc.inventoryAssets.delete.useMutation({
    onSuccess: async () => {
      toast.success("Bem removido com sucesso");
      await assetsQuery.refetch();
    },
    onError: error => {
      toast.error(error.message);
    },
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

  const handleOpenFieldEdit = (asset: any, field: AssetEditableField) => {
    setEditingAssetId(asset.id);
    setEditingField(field);

    if (field === "vlrCusto") {
      setEditingFieldValue(String(asset.vlrCusto ?? ""));
    } else if (field === "anoAquis") {
      setEditingFieldValue(asset.anoAquis ? String(asset.anoAquis) : "");
    } else {
      setEditingFieldValue(String(asset[field] ?? ""));
    }

    setIsFieldEditDialogOpen(true);
  };

  const handleSaveFieldEdit = () => {
    if (!editingAssetId || !editingField) {
      return;
    }

    const rawValue = editingFieldValue;
    const trimmedValue = rawValue.trim();
    const requiredFields: AssetEditableField[] = [
      "filial",
      "nrBem",
      "descricao",
      "conta",
      "centroCusto",
      "dtAquis",
      "vlrCusto",
    ];

    if (requiredFields.includes(editingField) && !trimmedValue) {
      toast.error(`${ASSET_FIELD_LABEL[editingField]} é obrigatório`);
      return;
    }

    const payload: Record<string, unknown> = { id: editingAssetId };

    if (editingField === "vlrCusto") {
      const normalizedCost = parseCurrencyInput(rawValue);

      if (Number.isNaN(normalizedCost) || normalizedCost < 0) {
        toast.error("Valor de custo inválido");
        return;
      }

      payload.vlrCusto = normalizedCost;
      updateAssetMutation.mutate(payload as any);
      return;
    }

    if (editingField === "dtAquis") {
      if (!DATE_MASK_REGEX.test(trimmedValue)) {
        toast.error("Data de aquisição deve estar no formato DD-MM-YYYY");
        return;
      }

      payload.dtAquis = trimmedValue;
      updateAssetMutation.mutate(payload as any);
      return;
    }

    if (editingField === "anoAquis") {
      if (!trimmedValue) {
        toast.error("Ano de aquisição é obrigatório para esta edição");
        return;
      }

      const year = Number(trimmedValue);
      if (!Number.isInteger(year) || year <= 0) {
        toast.error("Ano de aquisição inválido");
        return;
      }

      payload.anoAquis = year;
      updateAssetMutation.mutate(payload as any);
      return;
    }

    payload[editingField] = rawValue;
    updateAssetMutation.mutate(payload as any);
  };

  const handleDeleteAsset = (id: number) => {
    if (window.confirm("Tem certeza que deseja remover este bem?")) {
      deleteAssetMutation.mutate(id);
    }
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
                Campos: Filial, Nr. bem, Descrição, Marca, Modelo, Conta,
                Centro de Custo, Local, Fornecedor, Dt. Aquis., Ano Aquis. e
                Vlr. Custo.
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
                Clique em qualquer coluna para editar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetsQuery.isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto" />
                  <p className="text-gray-400 mt-2">Carregando dados...</p>
                </div>
              ) : (assetsQuery.data || []).length === 0 ? (
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
                      {(assetsQuery.data || []).map((asset: any) => (
                        <TableRow
                          key={asset.id}
                          className="border-sky-700/20 hover:bg-slate-700/30"
                        >
                          <TableCell className="text-white">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "filial")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.filial}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "nrBem")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.nrBem}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() =>
                                handleOpenFieldEdit(asset, "descricao")
                              }
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.descricao}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "marca")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.marca || "-"}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "modelo")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.modelo || "-"}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "conta")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.conta}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() =>
                                handleOpenFieldEdit(asset, "centroCusto")
                              }
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.centroCusto}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "local")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.local || "-"}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() =>
                                handleOpenFieldEdit(asset, "fornecedor")
                              }
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.fornecedor || "-"}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "dtAquis")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.dtAquis}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "anoAquis")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {asset.anoAquis || "-"}
                            </button>
                          </TableCell>
                          <TableCell className="text-sky-400 font-semibold">
                            <button
                              type="button"
                              disabled={isAssetMutating}
                              onClick={() => handleOpenFieldEdit(asset, "vlrCusto")}
                              className="text-left hover:text-sky-300 transition"
                            >
                              {formatCurrencyBRL(asset.vlrCusto)}
                            </button>
                          </TableCell>
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
              <Input
                value={assetFormData.conta}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    conta: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Centro de Custo *</Label>
              <Input
                value={assetFormData.centroCusto}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    centroCusto: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Local</Label>
              <Input
                value={assetFormData.local}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    local: event.target.value,
                  }))
                }
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
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
              <Label className="text-gray-300">Dt. Aquis. * (DD-MM-YYYY)</Label>
              <Input
                value={assetFormData.dtAquis}
                onChange={event =>
                  setAssetFormData(current => ({
                    ...current,
                    dtAquis: event.target.value,
                  }))
                }
                placeholder="DD-MM-YYYY"
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

      <Dialog
        open={isFieldEditDialogOpen}
        onOpenChange={open => {
          setIsFieldEditDialogOpen(open);
          if (!open) {
            setEditingAssetId(null);
            setEditingField(null);
            setEditingFieldValue("");
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 border-sky-700/30">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar {editingField ? ASSET_FIELD_LABEL[editingField] : "campo"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Atualize o valor da coluna selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">
                {editingField ? ASSET_FIELD_LABEL[editingField] : "Campo"}
                {editingField &&
                [
                  "filial",
                  "nrBem",
                  "descricao",
                  "conta",
                  "centroCusto",
                  "dtAquis",
                  "vlrCusto",
                ].includes(editingField)
                  ? " *"
                  : ""}
              </Label>
              <Input
                type={
                  editingField === "anoAquis" || editingField === "vlrCusto"
                    ? "number"
                    : "text"
                }
                step={editingField === "vlrCusto" ? "0.01" : undefined}
                placeholder={
                  editingField === "dtAquis"
                    ? "DD-MM-YYYY"
                    : editingField === "vlrCusto"
                      ? "Ex: 1500,00"
                      : undefined
                }
                value={editingFieldValue}
                onChange={event => setEditingFieldValue(event.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Button
                onClick={handleSaveFieldEdit}
                className="flex-1 bg-sky-600 hover:bg-sky-700"
                disabled={isAssetMutating || !editingField || !editingAssetId}
              >
                {updateAssetMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-gray-300 hover:bg-slate-700"
                onClick={() => setIsFieldEditDialogOpen(false)}
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
