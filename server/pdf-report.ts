import * as db from './db';
import PDFDocument from 'pdfkit';
import { createWriteStream, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export interface PDFReportData {
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

export async function generatePDFReportData(spaceId: number, weekStartDate: string): Promise<PDFReportData> {
  // Buscar dados do espaço
  const spaces = await db.listConsumableSpaces();
  const space = spaces.find((s: any) => s.id === spaceId);
  
  if (!space) {
    throw new Error('Espaço não encontrado');
  }

  // Buscar consumíveis com dados da semana
  const consumables = await db.listConsumablesWithWeeklyData({
    spaceId,
    weekStartDate,
  });

  // Calcular estatísticas
  let criticalStock = 0;
  let lowStock = 0;
  let normalStock = 0;

  const consumableData = consumables.map((c: any) => {
    const status = c.currentStock <= 0 ? 'SEM ESTOQUE' : 
                   c.currentStock < c.minStock ? 'ABAIXO DO MÍNIMO' : 
                   c.currentStock > c.maxStock ? 'ACIMA DO MÁXIMO' : 'NORMAL';
    
    if (status === 'SEM ESTOQUE') criticalStock++;
    else if (status === 'ABAIXO DO MÍNIMO') lowStock++;
    else normalStock++;

    return {
      id: c.id,
      name: c.name,
      category: c.category,
      currentStock: c.currentStock || 0,
      minStock: c.minStock || 0,
      maxStock: c.maxStock || 0,
      repor: c.replenishStock || 0,
      status,
    };
  });

  // Calcular semana
  const startDate = new Date(weekStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  return {
    spaceName: space.name,
    weekStartDate: startDate,
    weekEndDate: endDate,
    generatedAt: new Date(),
    consumables: consumableData,
    statistics: {
      totalConsumables: consumableData.length,
      criticalStock,
      lowStock,
      normalStock,
    },
  };
}

export async function generatePDFReport(reportData: PDFReportData): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const filename = `relatorio_consumo_${Date.now()}.pdf`;
      const filepath = join('/tmp', filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = createWriteStream(filepath);

      doc.pipe(stream);

      // Título
      doc.fontSize(20).fillColor('#FF8C00').text('RELATÓRIO DE CONSUMO', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#333').text(`Unidade: ${reportData.spaceName}`, { align: 'center' });
      doc.fontSize(10).fillColor('#666').text(
        `Período: ${reportData.weekStartDate.toLocaleDateString('pt-BR')} a ${reportData.weekEndDate.toLocaleDateString('pt-BR')}`,
        { align: 'center' }
      );
      doc.moveDown();

      // Estatísticas
      doc.fontSize(12).fillColor('#333').text('RESUMO', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Total de Consumíveis: ${reportData.statistics.totalConsumables}`);
      doc.text(`Estoque Normal: ${reportData.statistics.normalStock}`);
      doc.text(`Estoque Baixo: ${reportData.statistics.lowStock}`);
      doc.text(`Estoque Crítico: ${reportData.statistics.criticalStock}`);
      doc.moveDown();

      // Tabela de consumíveis
      doc.fontSize(12).fillColor('#333').text('DETALHES DOS CONSUMÍVEIS', { underline: true });
      doc.moveDown(0.5);

      // Cabeçalho da tabela
      const tableTop = doc.y;
      doc.fontSize(9).fillColor('#333');
      doc.text('Nome', 50, tableTop);
      doc.text('Categoria', 180, tableTop);
      doc.text('Atual', 280, tableTop);
      doc.text('Mín', 330, tableTop);
      doc.text('Máx', 370, tableTop);
      doc.text('Repor', 410, tableTop);
      doc.text('Status', 470, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.moveDown();

      // Dados da tabela
      let y = tableTop + 20;
      doc.fontSize(8);

      reportData.consumables.forEach((item, index) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        // Cor berdasarkan status
        if (item.status === 'SEM ESTOQUE' || item.status === 'ABAIXO DO MÍNIMO') {
          doc.fillColor('#d00');
        } else if (item.status === 'NORMAL') {
          doc.fillColor('#0a0');
        } else {
          doc.fillColor('#333');
        }

        doc.text(String(item.name).substring(0, 25), 50, y);
        doc.text(String(item.category || '-').substring(0, 15), 180, y);
        doc.text(String(item.currentStock), 280, y);
        doc.text(String(item.minStock), 330, y);
        doc.text(String(item.maxStock), 370, y);
        doc.text(String(item.repor), 410, y);
        doc.text(item.status.substring(0, 12), 470, y);

        y += 15;
      });

      // Rodapé
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#666');
      doc.text(`Gerado em: ${reportData.generatedAt.toLocaleString('pt-BR')}`, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (err: Error) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}
