#!/usr/bin/env node
import dotenv from 'dotenv';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: `.env.${NODE_ENV}` });
dotenv.config({ path: '.env' }); // fallback，不覆盖已有值
import { writeFile, mkdir, readFile } from 'fs/promises';
import { resolve, extname, basename, join, dirname } from 'path';
import { readPdf } from './pdf-reader.js';
import { readWord } from './word-reader.js';
import { readExcel } from './excel-reader.js';
import { processWithAI, type DocContent } from './ai-processor.js';

function parseArgs(args: string[]): { filePath: string; outputPath?: string; schemaPath?: string } {
  function extractFlag(a: string[], flag: string): [string | undefined, string[]] {
    const idx = a.indexOf(flag);
    if (idx === -1) return [undefined, a];
    const value = a[idx + 1];
    return [value, a.filter((_, i) => i !== idx && i !== idx + 1)];
  }

  let outputPath: string | undefined;
  let schemaPath: string | undefined;
  [outputPath, args] = extractFlag(args, '--output');
  [schemaPath, args] = extractFlag(args, '--schema');

  const filePath = args[0];
  if (!filePath) {
    console.error('用法: pnpm start <文件路径> [--output <输出文件路径>] [--schema <JSON格式文件路径>]');
    console.error('支持格式: .pdf, .docx, .doc, .xlsx, .xls');
    process.exit(1);
  }

  return { filePath, outputPath, schemaPath };
}

async function readDocument(filePath: string): Promise<DocContent> {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return readPdf(filePath);
    case '.docx':
    case '.doc':
      return readWord(filePath);
    case '.xlsx':
    case '.xls':
      return readExcel(filePath);
    default:
      console.error(`不支持的文件格式: ${ext}`);
      console.error('支持格式: .pdf, .docx, .doc, .xlsx, .xls');
      process.exit(1);
  }
}

const DEFAULT_OUTPUT_DIR = 'output';

async function main() {
  const args = process.argv.slice(2);
  const { filePath, outputPath, schemaPath } = parseArgs(args);
  const absolutePath = resolve(filePath);

  let schema: string | undefined;
  if (schemaPath) {
    schema = await readFile(resolve(schemaPath), 'utf-8');
    console.log(`已加载 JSON 格式模板: ${schemaPath}`);
  }

  console.log(`正在读取文档: ${absolutePath}`);
  const doc = await readDocument(absolutePath);
  console.log(`提取完成，共 ${doc.pages} 页，${doc.text.length} 字符`);

  console.log('正在调用 AI 结构化数据...');
  const { data, durationMs } = await processWithAI(doc, schema);
  console.log(`AI 接口耗时: ${(durationMs / 1000).toFixed(2)}s`);

  const json = JSON.stringify(data, null, 2);

  const outPath = outputPath
    ? resolve(outputPath)
    : resolve(join(DEFAULT_OUTPUT_DIR, basename(absolutePath, extname(absolutePath)) + '.json'));

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, json, 'utf-8');
  console.log(`已保存到: ${outPath}`);
}

main().catch((err) => {
  console.error('错误:', err.message);
  process.exit(1);
});
