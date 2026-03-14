import { readFile } from 'fs/promises';
import mammoth from 'mammoth';

export interface WordContent {
  text: string;
  pages: number;
  info: Record<string, unknown>;
}

export async function readWord(filePath: string): Promise<WordContent> {
  const buffer = await readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    pages: 1,
    info: {},
  };
}
