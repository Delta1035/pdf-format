import { readFile } from 'fs/promises';
import * as XLSX from 'xlsx';

export interface ExcelContent {
  text: string;
  pages: number;
  info: Record<string, unknown>;
}

export async function readExcel(filePath: string): Promise<ExcelContent> {
  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const sheets: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`=== Sheet: ${sheetName} ===\n${csv}`);
  }

  return {
    text: sheets.join('\n\n'),
    pages: workbook.SheetNames.length,
    info: { sheets: workbook.SheetNames },
  };
}
