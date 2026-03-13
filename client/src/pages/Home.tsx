import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Package, Users, Calendar, Wrench, Building2, FileText } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">SGA G4 Belém</h1>
            <p className="text-xl text-gray-600">Plataforma Profissional de Gestão de Facilities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader>
                <Package className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Inventário</CardTitle>
                <CardDescription>Controlo centralizado de materiais e equipamentos</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Escala de Equipa</CardTitle>
                <CardDescription>Gestão automática de turnos e sectores</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Building2 className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Reserva de Salas</CardTitle>
                <CardDescription>Calendário visual com disponibilidade em tempo real</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Wrench className="w-8 h-8 text-blue-600 mb-2" />
                <CardTitle>Manutenção</CardTitle>
                <CardDescription>Chamados preventivos e correctivos com priorização</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Button
            size="lg"
            onClick={() => (window.location.href = getLoginUrl())}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
          >
            Aceder à Plataforma
          </Button>

          <p className="text-sm text-gray-600 mt-6">
            Autenticação segura via Manus OAuth
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {user?.name}!</h1>
        <p className="text-gray-600 mt-2">Plataforma de Gestão de Facilities - SGA G4 Belém</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inventário</CardTitle>
                <CardDescription>Gestão de materiais</CardDescription>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Controlo de entrada/saída e alertas de stock</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Escala</CardTitle>
                <CardDescription>Gestão de equipa</CardDescription>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Atribuição automática por sector e turno</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Salas</CardTitle>
                <CardDescription>Reservas e disponibilidade</CardDescription>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Calendário visual com status em tempo real</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Manutenção</CardTitle>
                <CardDescription>Chamados e histórico</CardDescription>
              </div>
              <Wrench className="w-8 h-8 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Preventiva e correctiva com priorização</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fornecedores</CardTitle>
                <CardDescription>Gestão de contratos</CardDescription>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Alertas de vencimento e histórico</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Dashboard</CardTitle>
                <CardDescription>Métricas executivas</CardDescription>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">KPIs, gráficos e relatórios</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
