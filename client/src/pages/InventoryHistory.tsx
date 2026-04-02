import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { format, subDays } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Package } from "lucide-react";

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

  date.setHours(0, 0, 0, 0);
  return date;
}

export default function InventoryHistory() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "dd-MM-yyyy"));
  const [endDate, setEndDate] = useState(format(new Date(), "dd-MM-yyyy"));

  const { data: movements = [] } = trpc.inventory.getAllMovements.useQuery();
  const { data: inventoryItems = [] } = trpc.inventory.list.useQuery();

  // Filtrar movimentações por data e categoria
  const filteredMovements = useMemo(() => {
    const start = parseMaskedDate(startDate);
    const end = parseMaskedDate(endDate);

    if (!start || !end) return [];

    end.setDate(end.getDate() + 1);

    return movements.filter((m: any) => {
      const movementDate = new Date(m.createdAt);
      const dateMatch = movementDate >= start && movementDate <= end;
      const categoryMatch =
        selectedCategory === "all" ||
        inventoryItems.find((item: any) => item.id === m.inventoryId)?.category === selectedCategory;
      return dateMatch && categoryMatch;
    });
  }, [movements, inventoryItems, selectedCategory, startDate, endDate]);

  // Dados para gráfico de consumo por dia
  const consumptionByDay = useMemo(() => {
    const data: Record<string, { date: string; entrada: number; saida: number }> = {};

    filteredMovements.forEach((m: any) => {
      const date = format(new Date(m.createdAt), "dd/MM");
      if (!data[date]) {
        data[date] = { date, entrada: 0, saida: 0 };
      }
      if (m.type === "entrada") {
        data[date].entrada += m.quantity;
      } else {
        data[date].saida += m.quantity;
      }
    });

    return Object.values(data).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredMovements]);

  // Dados para gráfico de tipo de movimentação
  const movementTypeData = useMemo(() => {
    const entrada = filteredMovements.filter((m: any) => m.type === "entrada").length;
    const saida = filteredMovements.filter((m: any) => m.type === "saida").length;
    return [
      { name: "Entrada", value: entrada, fill: "#22c55e" },
      { name: "Saída", value: saida, fill: "#ef4444" },
    ];
  }, [filteredMovements]);

  // Dados para gráfico de categoria
  const consumptionByCategory = useMemo(() => {
    const data: Record<string, { category: string; quantidade: number }> = {};

    filteredMovements.forEach((m: any) => {
      const item = inventoryItems.find((i: any) => i.id === m.inventoryId);
      if (item) {
        if (!data[item.category]) {
          data[item.category] = { category: item.category, quantidade: 0 };
        }
        if (m.type === "saida") {
          data[item.category].quantidade += m.quantity;
        }
      }
    });

    return Object.values(data).sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredMovements, inventoryItems]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalEntrada = filteredMovements
      .filter((m: any) => m.type === "entrada")
      .reduce((sum: number, m: any) => sum + m.quantity, 0);
    const totalSaida = filteredMovements
      .filter((m: any) => m.type === "saida")
      .reduce((sum: number, m: any) => sum + m.quantity, 0);
    const balance = totalEntrada - totalSaida;

    return { totalEntrada, totalSaida, balance };
  }, [filteredMovements]);

  const categories = Array.from(new Set(inventoryItems.map((item: any) => item.category)));

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Histórico de Movimentações</h1>
          <p className="text-gray-400">Análise de consumo e tendências do inventário</p>
        </div>

        {/* Filtros */}
        <Card className="bg-slate-800 border-orange-700/30 mb-6">
          <CardHeader>
            <CardTitle className="text-orange-400">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-300">Data Inicial</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={startDate}
                  onChange={(e) => setStartDate(formatDateInput(e.target.value))}
                  placeholder="DD-MM-YYYY"
                  className="bg-slate-700 border-orange-700/30 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Data Final</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={endDate}
                  onChange={(e) => setEndDate(formatDateInput(e.target.value))}
                  placeholder="DD-MM-YYYY"
                  className="bg-slate-700 border-orange-700/30 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-gray-300">Categoria</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-slate-700 border-orange-700/30 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-orange-700/30">
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setStartDate(format(subDays(new Date(), 30), "dd-MM-yyyy"));
                    setEndDate(format(new Date(), "dd-MM-yyyy"));
                    setSelectedCategory("all");
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  Resetar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-orange-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                Total Entrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{stats.totalEntrada}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-orange-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
                Total Saída
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{stats.totalSaida}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-orange-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.balance >= 0 ? "text-green-500" : "text-red-500"}`}>
                {stats.balance}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-orange-700/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Total Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">{filteredMovements.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Consumo por Dia */}
          <Card className="bg-slate-800 border-orange-700/30">
            <CardHeader>
              <CardTitle className="text-orange-400">Consumo por Dia</CardTitle>
              <CardDescription className="text-gray-400">Entrada vs Saída</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #ea580c" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="entrada" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="saida" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Tipo de Movimentação */}
          <Card className="bg-slate-800 border-orange-700/30">
            <CardHeader>
              <CardTitle className="text-orange-400">Distribuição de Movimentações</CardTitle>
              <CardDescription className="text-gray-400">Entrada vs Saída</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={movementTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {movementTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #ea580c" }}
                    labelStyle={{ color: "#fff" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Consumo por Categoria */}
          <Card className="bg-slate-800 border-orange-700/30 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-orange-400">Consumo por Categoria</CardTitle>
              <CardDescription className="text-gray-400">Quantidade de saídas por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={consumptionByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="category" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #ea580c" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="quantidade" fill="#ea580c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Movimentações */}
        <Card className="bg-slate-800 border-orange-700/30">
          <CardHeader>
            <CardTitle className="text-orange-400">Histórico Detalhado</CardTitle>
            <CardDescription className="text-gray-400">Todas as movimentações registadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-700/30">
                    <th className="text-left py-3 px-4 text-gray-400">Item</th>
                    <th className="text-left py-3 px-4 text-gray-400">Tipo</th>
                    <th className="text-left py-3 px-4 text-gray-400">Quantidade</th>
                    <th className="text-left py-3 px-4 text-gray-400">Motivo</th>
                    <th className="text-left py-3 px-4 text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.length > 0 ? (
                    filteredMovements.map((movement: any) => {
                      const item = inventoryItems.find((i: any) => i.id === movement.inventoryId);
                      return (
                        <tr key={movement.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-white">{item?.name || "N/A"}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                movement.type === "entrada"
                                  ? "bg-green-600/20 text-green-400"
                                  : "bg-red-600/20 text-red-400"
                              }`}
                            >
                              {movement.type === "entrada" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-medium">{movement.quantity}</td>
                          <td className="py-3 px-4 text-gray-400">{movement.reason || "-"}</td>
                          <td className="py-3 px-4 text-gray-400">
                            {format(new Date(movement.createdAt), "dd/MM/yyyy HH:mm")}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 px-4 text-center text-gray-400">
                        Nenhuma movimentação encontrada para o período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
