import * as XLSX from 'xlsx';
import * as db from './db';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface ExcelReportData {
  spaceName: string;
  weekStartDate: Date;
  weekEndDate: Date;
  generatedAt: Date;
  consumables: Array<{
    id: number;
    name: string;
    category: string | null;
    currentStock: number;
    minStock: number;
    maxStock: number;
    repor: number;
    status: string;
  }>;
  statistics: {
    totalConsumables: number;
    criticalStock: number;
    lowStock: number;
    normalStock: number;
  };
}

export async function generateExcelReport(reportData: ExcelReportData): Promise<string> {
  // Criar workbook
  const wb = XLSX.utils.book_new();

  // ===== SHEET 1: Resumo =====
  const summaryData = [
    ['RELATÓRIO DE CONSUMO SEMANAL'],
    [],
    ['Unidade:', reportData.spaceName],
    ['Período:', `${reportData.weekStartDate.toLocaleDateString('pt-BR')} a ${reportData.weekEndDate.toLocaleDateString('pt-BR')}`],
    ['Gerado em:', reportData.generatedAt.toLocaleString('pt-BR')],
    [],
    ['RESUMO DE ESTOQUE'],
    ['Total de Consumíveis:', reportData.statistics.totalConsumables],
    ['Estoque Crítico:', reportData.statistics.criticalStock],
    ['Estoque Baixo:', reportData.statistics.lowStock],
    ['Estoque Normal:', reportData.statistics.normalStock],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');

  // ===== SHEET 2: Consumíveis =====
  const consumablesHeader = [
    'Produto',
    'Categoria',
    'Est. Atual',
    'Est. Mínimo',
    'Est. Máximo',
    'Repor',
    'Status',
  ];

  const consumablesData = [
    consumablesHeader,
    ...reportData.consumables.map(c => [
      c.name,
      c.category || '-',
      c.currentStock,
      c.minStock,
      c.maxStock,
      c.repor,
      c.status,
    ]),
  ];

  const consumablesSheet = XLSX.utils.aoa_to_sheet(consumablesData);
  consumablesSheet['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
  ];

  // Formatar cabeçalho
  const headerRange = XLSX.utils.decode_range(consumablesSheet['!ref'] || 'A1');
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!consumablesSheet[address]) continue;
    consumablesSheet[address].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'FF8C00' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        left: { style: 'thin' },
        right: { style: 'thin' },
        top: { style: 'thin' },
        bottom: { style: 'thin' },
      },
    };
  }

  // Formatar dados
  for (let R = 2; R <= consumablesData.length; ++R) {
    for (let C = 0; C < consumablesHeader.length; ++C) {
      const address = XLSX.utils.encode_col(C) + R;
      if (!consumablesSheet[address]) continue;

      const status = consumablesSheet[address].v;
      let bgColor = 'FFFFFF';

      if (status === 'CRÍTICO') bgColor = 'FF0000';
      else if (status === 'BAIXO') bgColor = 'FFA500';
      else if (status === 'OK') bgColor = '00AA00';

      consumablesSheet[address].s = {
        fill: { fgColor: { rgb: bgColor } },
        font: { color: { rgb: status !== 'OK' && status !== 'CRÍTICO' ? '000000' : 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          left: { style: 'thin' },
          right: { style: 'thin' },
          top: { style: 'thin' },
          bottom: { style: 'thin' },
        },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, consumablesSheet, 'Consumíveis');

  // ===== SHEET 3: Análise =====
  const analysisData = [
    ['ANÁLISE DE ESTOQUE'],
    [],
    ['Categoria', 'Quantidade', 'Percentual'],
    ['Estoque Crítico', reportData.statistics.criticalStock, `${((reportData.statistics.criticalStock / reportData.statistics.totalConsumables) * 100).toFixed(1)}%`],
    ['Estoque Baixo', reportData.statistics.lowStock, `${((reportData.statistics.lowStock / reportData.statistics.totalConsumables) * 100).toFixed(1)}%`],
    ['Estoque Normal', reportData.statistics.normalStock, `${((reportData.statistics.normalStock / reportData.statistics.totalConsumables) * 100).toFixed(1)}%`],
  ];

  const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);
  analysisSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, analysisSheet, 'Análise');

  // Salvar arquivo
  const filename = `relatorio_consumo_${Date.now()}.xlsx`;
  const filepath = join('/tmp', filename);
  XLSX.writeFile(wb, filepath);
  return filepath;
}

export async function generateReportData(spaceId: number, weekStartDateStr: string): Promise<ExcelReportData> {
  // Parse da data
  const [year, month, day] = weekStartDateStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Buscar dados de consumíveis (placeholder - será implementado no routers)
  const consumables: any[] = [];

  // Calcular estatísticas
  const statistics = {
    totalConsumables: (consumables as any[]).length,
    criticalStock: (consumables as any[]).filter((c: any) => c.currentStock < c.minStock).length,
    lowStock: (consumables as any[]).filter((c: any) => c.currentStock >= c.minStock && c.currentStock < (c.maxStock * 0.3)).length,
    normalStock: (consumables as any[]).filter((c: any) => c.currentStock >= (c.maxStock * 0.3)).length,
  };

  return {
    spaceName: 'Unidade',
    weekStartDate: startDate,
    weekEndDate: endDate,
    generatedAt: new Date(),
    consumables: consumables.map((c: any) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      currentStock: c.currentStock,
      minStock: c.minStock,
      maxStock: c.maxStock,
      repor: c.maxStock - c.currentStock,
      status: c.currentStock < c.minStock ? 'CRÍTICO' : c.currentStock < (c.maxStock * 0.3) ? 'BAIXO' : 'OK',
    })),
    statistics,
  };
}
