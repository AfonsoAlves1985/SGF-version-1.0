import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Plus, Edit2, Trash2, Download, Calendar, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contracts() {
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    description: "",
    contractType: "mensal" as "mensal" | "anual",
    value: "",
    signatureDate: "",
    endDate: "",
    monthlyPaymentDate: "",
    notes: "",
  });

  const { data: spaces = [] } = trpc.consumableSpaces.list.useQuery();
  const { data: contracts = [] } = trpc.contracts.list.useQuery(
    selectedSpace ? { spaceId: selectedSpace } : undefined,
    { enabled: !!selectedSpace }
  );
  const { data: alerts = [] } = trpc.contracts.getAlerts.useQuery(
    selectedSpace ? selectedSpace : undefined,
    { enabled: !!selectedSpace }
  );

  const createMutation = trpc.contracts.create.useMutation();
  const updateMutation = trpc.contracts.update.useMutation();
  const deleteMutation = trpc.contracts.delete.useMutation();

  const handleCreate = async () => {
    if (!selectedSpace) {
      toast.error("Selecione uma unidade");
      return;
    }

    if (!formData.companyName || !formData.description || !formData.value || !formData.endDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const monthlyPaymentDate = formData.contractType === "mensal" && formData.monthlyPaymentDate 
        ? parseInt(formData.monthlyPaymentDate) 
        : undefined;
      
      await createMutation.mutateAsync({
        spaceId: selectedSpace,
        ...formData,
        signatureDate: new Date(formData.signatureDate),
        endDate: new Date(formData.endDate),
        monthlyPaymentDate,
      });

      setFormData({
        companyName: "",
        description: "",
        contractType: "mensal",
        value: "",
        signatureDate: "",
        endDate: "",
        monthlyPaymentDate: "",
        notes: "",
      });
      setIsCreating(false);
      toast.success("Contrato criado com sucesso");
    } catch (error) {
      toast.error("Erro ao criar contrato");
    }
  };

  const handleDelete = async (contractId: number) => {
    if (confirm("Tem certeza que deseja deletar este contrato?")) {
      try {
        await deleteMutation.mutateAsync(contractId);
        toast.success("Contrato deletado com sucesso");
      } catch (error) {
        toast.error("Erro ao deletar contrato");
      }
    }
  };

  const criticalAlerts = alerts.filter((a: any) => a.alertType === "contract_expiry");
  const monthlyAlerts = alerts.filter((a: any) => a.alertType === "monthly_payment");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
        <p className="text-gray-600 mt-1">Gerencie contratos de serviços por unidade</p>
      </div>

      {/* Seletor de Unidades */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Unidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {spaces.map((space: any) => (
              <button
                key={space.id}
                onClick={() => setSelectedSpace(space.id)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  selectedSpace === space.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {space.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSpace && (
        <>
          {/* Alertas */}
          {(criticalAlerts.length > 0 || monthlyAlerts.length > 0) && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas de Contratos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {criticalAlerts.map((alert: any) => (
                  <div key={alert.id} className="p-3 bg-red-100 border border-red-300 rounded">
                    <p className="font-semibold text-red-900">
                      Contrato vencendo em {alert.daysUntilEvent} dias
                    </p>
                    <p className="text-sm text-red-800">{alert.contracts_companyName}</p>
                  </div>
                ))}
                {monthlyAlerts.map((alert: any) => (
                  <div key={alert.id} className="p-3 bg-yellow-100 border border-yellow-300 rounded">
                    <p className="font-semibold text-yellow-900">
                      Pagamento mensal vencido
                    </p>
                    <p className="text-sm text-yellow-800">{alert.contracts_companyName}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Botão Criar */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Contratos da Unidade</h2>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Contrato
            </Button>
          </div>

          {/* Formulário Criar */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>Novo Contrato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Nome da Empresa"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value as "mensal" | "anual" })}
                    className="px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <textarea
                  placeholder="Descrição do Serviço"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Valor"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                  {formData.contractType === "mensal" && (
                    <Input
                      type="number"
                      placeholder="Dia do Pagamento (1-31)"
                      value={formData.monthlyPaymentDate}
                      onChange={(e) => setFormData({ ...formData, monthlyPaymentDate: e.target.value })}
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="date"
                    placeholder="Data de Assinatura"
                    value={formData.signatureDate}
                    onChange={(e) => setFormData({ ...formData, signatureDate: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Data de Término"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
                <textarea
                  placeholder="Notas (opcional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700">
                    Salvar
                  </Button>
                  <Button onClick={() => setIsCreating(false)} variant="outline">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Contratos */}
          <div className="space-y-3">
            {contracts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-600">
                  Nenhum contrato cadastrado para esta unidade
                </CardContent>
              </Card>
            ) : (
              contracts.map((contract: any) => (
                <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{contract.contracts_companyName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{contract.contracts_description}</p>
                        <div className="flex gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            R$ {parseFloat(contract.contracts_value).toLocaleString("pt-BR")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Vence: {new Date(contract.contracts_endDate).toLocaleDateString("pt-BR")}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            contract.contracts_status === "ativo"
                              ? "bg-green-100 text-green-800"
                              : contract.contracts_status === "inativo"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {contract.contracts_status === "ativo" ? "Ativo" : contract.contracts_status === "inativo" ? "Inativo" : "Vencido"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {contract.contracts_documentUrl && (
                          <a
                            href={contract.contracts_documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </a>
                        )}
                        <button
                          onClick={() => setEditingId(contract.id)}
                          className="p-2 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(contract.id)}
                          className="p-2 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
