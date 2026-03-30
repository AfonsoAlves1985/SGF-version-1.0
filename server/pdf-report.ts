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
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const filename = `relatorio_consumo_${Date.now()}.pdf`;
    const filepath = join('/tmp', filename);
    
    await page.pdf({
      path: filepath,
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      printBackground: true,
    });
    
    return filepath;
  } finally {
    await browser.close();
  }
}

function generateHTMLReport(reportData: PDFReportData): string {
  const consumablesRows = reportData.consumables
    .map(c => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${c.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${c.category || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c.currentStock}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c.minStock}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c.maxStock}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${c.repor}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; background-color: ${getStatusColor(c.status)}; color: ${getStatusTextColor(c.status)}; font-weight: bold;">${c.status}</td>
      </tr>
    `)
    .join('');

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
        
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #FF8C00;
          padding-bottom: 15px;
        }
        
        .header h1 {
          font-size: 24px;
          color: #FF8C00;
          margin-bottom: 10px;
        }
        
        .info-section {
          background-color: #f5f5f5;
          padding: 15px;
          margin-bottom: 20px;
          border-left: 4px solid #FF8C00;
        }
        
        .info-section p {
          margin: 5px 0;
          font-size: 14px;
        }
        
        .info-section strong {
          color: #FF8C00;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #FF8C00;
          margin-top: 25px;
          margin-bottom: 15px;
          border-bottom: 2px solid #FF8C00;
          padding-bottom: 8px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .summary-card {
          background-color: #f9f9f9;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          text-align: center;
        }
        
        .summary-card .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        
        .summary-card .value {
          font-size: 24px;
          font-weight: bold;
          color: #FF8C00;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 13px;
        }
        
        table thead {
          background-color: #FF8C00;
          color: white;
        }
        
        table th {
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        
        table td {
          padding: 10px;
          border: 1px solid #ddd;
        }
        
        table tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .status-critico {
          background-color: #FF0000 !important;
          color: white !important;
          font-weight: bold;
        }
        
        .status-baixo {
          background-color: #FFA500 !important;
          color: #000 !important;
          font-weight: bold;
        }
        
        .status-ok {
          background-color: #00AA00 !important;
          color: white !important;
          font-weight: bold;
        }
        
        .analysis-section {
          margin-top: 20px;
        }
        
        .analysis-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
        }
        
        .analysis-item {
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .analysis-item .label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .analysis-item .value {
          font-size: 18px;
          font-weight: bold;
          color: #FF8C00;
        }
        
        .analysis-item .percentage {
          font-size: 12px;
          color: #999;
          margin-top: 5px;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
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
        
        <div class="section-title">📋 DETALHES DOS CONSUMÍVEIS</div>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Est. Atual</th>
              <th>Est. Mínimo</th>
              <th>Est. Máximo</th>
              <th>Repor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${consumablesRows}
          </tbody>
        </table>
        
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
          <p>Este relatório foi gerado automaticamente pelo Sistema de Gestão de Facilities - SGA</p>
        </div>
      </div>
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
