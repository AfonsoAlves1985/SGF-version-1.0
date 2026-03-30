import * as db from './db';
import { join } from 'path';
import puppeteer from 'puppeteer';

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

export async function generatePDFReport(reportData: PDFReportData): Promise<string> {
  // Criar HTML para converter em PDF
  const htmlContent = generateHTMLReport(reportData);
  
  // Usar puppeteer para converter HTML em PDF
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });
    
    const filename = `relatorio_consumo_${Date.now()}.pdf`;
    const filepath = join('/tmp', filename);
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      printBackground: true,
    });
    
    return filepath;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error(`Falha ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function generateHTMLReport(reportData: PDFReportData): string {
  // Dividir consumíveis em grupos de 15 por página
  const itemsPerPage = 15;
  const pages: typeof reportData.consumables[] = [];
  
  for (let i = 0; i < reportData.consumables.length; i += itemsPerPage) {
    pages.push(reportData.consumables.slice(i, i + itemsPerPage));
  }

  const consumablesPages = pages.map((pageItems, pageIndex) => `
    <div class="page-break">
      <h3 style="margin-top: 0; color: #FF8C00; border-bottom: 2px solid #FF8C00; padding-bottom: 8px;">
        📋 DETALHES DOS CONSUMÍVEIS - Página ${pageIndex + 1} de ${pages.length}
      </h3>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Est. Atual</th>
            <th>Est. Mín.</th>
            <th>Est. Máx.</th>
            <th>Repor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${pageItems.map(c => `
            <tr>
              <td>${c.name}</td>
              <td>${c.category || '-'}</td>
              <td style="text-align: center;">${c.currentStock}</td>
              <td style="text-align: center;">${c.minStock}</td>
              <td style="text-align: center;">${c.maxStock}</td>
              <td style="text-align: center;">${c.repor}</td>
              <td style="text-align: center; background-color: ${getStatusColor(c.status)}; color: ${getStatusTextColor(c.status)}; font-weight: bold; border-radius: 3px; padding: 4px;">${c.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  const totalPercentage = reportData.statistics.totalConsumables > 0 ? 100 : 0;
  const criticalPercentage = reportData.statistics.totalConsumables > 0 
    ? ((reportData.statistics.criticalStock / reportData.statistics.totalConsumables) * 100).toFixed(1)
    : 0;
  const lowPercentage = reportData.statistics.totalConsumables > 0
    ? ((reportData.statistics.lowStock / reportData.statistics.totalConsumables) * 100).toFixed(1)
    : 0;
  const normalPercentage = reportData.statistics.totalConsumables > 0
    ? ((reportData.statistics.normalStock / reportData.statistics.totalConsumables) * 100).toFixed(1)
    : 0;

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório de Consumo Semanal</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.5;
          background: white;
        }
        
        .page-break {
          page-break-after: always;
          padding: 20px;
          min-height: 280mm;
        }
        
        .page-break:last-child {
          page-break-after: avoid;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 3px solid #FF8C00;
          padding-bottom: 12px;
        }
        
        .header h1 {
          font-size: 22px;
          color: #FF8C00;
          margin-bottom: 8px;
        }
        
        .info-section {
          background-color: #f5f5f5;
          padding: 12px;
          margin-bottom: 15px;
          border-left: 4px solid #FF8C00;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .info-section p {
          margin: 4px 0;
        }
        
        .info-section strong {
          color: #FF8C00;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #FF8C00;
          margin-top: 18px;
          margin-bottom: 12px;
          border-bottom: 2px solid #FF8C00;
          padding-bottom: 6px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .summary-card {
          background-color: #f9f9f9;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 3px;
          text-align: center;
          font-size: 12px;
        }
        
        .summary-card .label {
          font-size: 11px;
          color: #666;
          margin-bottom: 6px;
        }
        
        .summary-card .value {
          font-size: 20px;
          font-weight: bold;
          color: #FF8C00;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 12px;
        }
        
        table thead {
          background-color: #FF8C00;
          color: white;
        }
        
        table th {
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #FF8C00;
        }
        
        table td {
          padding: 8px;
          border: 1px solid #ddd;
        }
        
        table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .analysis-section {
          margin-top: 15px;
        }
        
        .analysis-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .analysis-item {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 12px;
        }
        
        .analysis-item .label {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .analysis-item .value {
          font-size: 16px;
          font-weight: bold;
          color: #FF8C00;
        }
        
        .analysis-item .percentage {
          font-size: 11px;
          color: #999;
          margin-top: 4px;
        }
        
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 10px;
          color: #999;
        }
        
        h3 {
          font-size: 14px;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .page-break {
            page-break-after: always;
            margin: 0;
            padding: 15mm;
            min-height: auto;
          }
        }
      </style>
    </head>
    <body>
      <!-- PÁGINA 1: RESUMO -->
      <div class="page-break">
        <div class="header">
          <h1>📊 RELATÓRIO DE CONSUMO SEMANAL</h1>
        </div>
        
        <div class="info-section">
          <p><strong>Unidade:</strong> ${reportData.spaceName}</p>
          <p><strong>Período:</strong> ${reportData.weekStartDate.toLocaleDateString('pt-BR')} a ${reportData.weekEndDate.toLocaleDateString('pt-BR')}</p>
          <p><strong>Gerado em:</strong> ${reportData.generatedAt.toLocaleString('pt-BR')}</p>
        </div>
        
        <div class="section-title">📈 RESUMO DE ESTOQUE</div>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total de Consumíveis</div>
            <div class="value">${reportData.statistics.totalConsumables}</div>
          </div>
          <div class="summary-card">
            <div class="label">Estoque Crítico</div>
            <div class="value">${reportData.statistics.criticalStock}</div>
          </div>
          <div class="summary-card">
            <div class="label">Estoque Baixo</div>
            <div class="value">${reportData.statistics.lowStock}</div>
          </div>
          <div class="summary-card">
            <div class="label">Estoque Normal</div>
            <div class="value">${reportData.statistics.normalStock}</div>
          </div>
        </div>
        
        <div class="section-title">📊 ANÁLISE DE ESTOQUE</div>
        <div class="analysis-section">
          <div class="analysis-row">
            <div class="analysis-item">
              <div class="label">Estoque Crítico</div>
              <div class="value">${reportData.statistics.criticalStock}</div>
              <div class="percentage">${criticalPercentage}% do total</div>
            </div>
            <div class="analysis-item">
              <div class="label">Estoque Baixo</div>
              <div class="value">${reportData.statistics.lowStock}</div>
              <div class="percentage">${lowPercentage}% do total</div>
            </div>
            <div class="analysis-item">
              <div class="label">Estoque Normal</div>
              <div class="value">${reportData.statistics.normalStock}</div>
              <div class="percentage">${normalPercentage}% do total</div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Sistema de Gestão de Facilities - SGA | Relatório Automático</p>
        </div>
      </div>
      
      <!-- PÁGINAS DE DETALHES -->
      ${consumablesPages}
    </body>
    </html>
  `;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'CRÍTICO':
      return '#FF0000';
    case 'BAIXO':
      return '#FFA500';
    case 'OK':
      return '#00AA00';
    default:
      return '#FFFFFF';
  }
}

function getStatusTextColor(status: string): string {
  switch (status) {
    case 'CRÍTICO':
    case 'OK':
      return '#FFFFFF';
    case 'BAIXO':
      return '#000000';
    default:
      return '#000000';
  }
}

export async function generatePDFReportData(spaceId: number, weekStartDateStr: string): Promise<PDFReportData> {
  // Parse da data
  const [year, month, day] = weekStartDateStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Buscar dados de consumíveis da unidade
  const consumables = await db.listConsumablesWithSpace({ spaceId });
  
  // Buscar nome da unidade
  const spaces = await db.listConsumableSpaces();
  const space = spaces.find((s: any) => s.id === spaceId);
  
  // Calcular estatísticas
  const statistics = {
    totalConsumables: consumables.length,
    criticalStock: consumables.filter((c: any) => c.currentStock < c.minStock).length,
    lowStock: consumables.filter((c: any) => c.currentStock >= c.minStock && c.currentStock < (c.maxStock * 0.3)).length,
    normalStock: consumables.filter((c: any) => c.currentStock >= (c.maxStock * 0.3)).length,
  };

  return {
    spaceName: space?.name || 'Unidade',
    weekStartDate: startDate,
    weekEndDate: endDate,
    generatedAt: new Date(),
    consumables: (consumables as any[]).map((c: any) => ({
      id: c.id,
      name: c.name,
      category: c.category || '-',
      currentStock: c.currentStock || 0,
      minStock: c.minStock || 0,
      maxStock: c.maxStock || 0,
      repor: (c.maxStock || 0) - (c.currentStock || 0),
      status: (c.currentStock || 0) < (c.minStock || 0) ? 'CRÍTICO' : (c.currentStock || 0) < ((c.maxStock || 0) * 0.3) ? 'BAIXO' : 'OK',
    })),
    statistics,
  };
}
