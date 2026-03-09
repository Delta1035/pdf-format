import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse';

export interface PdfContent {
  text: string;
  pages: number;
  info: Record<string, unknown>;
}

export async function readPdf(filePath: string): Promise<PdfContent> {
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pages: data.numpages,
    info: data.info as Record<string, unknown>,
  };
}
