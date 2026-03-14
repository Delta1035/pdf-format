#!/usr/bin/env node
import dotenv from 'dotenv';

const NODE_ENV = process.env.NODE_ENV ?? 'development';
dotenv.config({ path: `.env.${NODE_ENV}` });
dotenv.config({ path: '.env' }); // fallback，不覆盖已有值
import { writeFile, mkdir } from 'fs/promises';
import { resolve, extname, basename, join, dirname } from 'path';
import { readPdf } from './pdf-reader.js';
import { readWord } from './word-reader.js';
import { readExcel } from './excel-reader.js';
import { processWithAI, type DocContent } from './ai-processor.js';

function parseArgs(args: string[]): { filePath: string; outputPath?: string } {
  const outputIndex = args.indexOf('--output');
  let outputPath: string | undefined;

  if (outputIndex !== -1) {
    outputPath = args[outputIndex + 1];
    args = args.filter((_, i) => i !== outputIndex && i !== outputIndex + 1);
  }

  const filePath = args[0];
  if (!filePath) {
    console.error('用法: pnpm start <文件路径> [--output <输出文件路径>]');
    console.error('支持格式: .pdf, .docx, .doc, .xlsx, .xls');
    process.exit(1);
  }

  return { filePath, outputPath };
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
  const { filePath, outputPath } = parseArgs(args);
  const absolutePath = resolve(filePath);

  console.log(`正在读取文档: ${absolutePath}`);
  const doc = await readDocument(absolutePath);
  console.log(`提取完成，共 ${doc.pages} 页，${doc.text.length} 字符`);

  console.log('正在调用 AI 结构化数据...');
  const { data, durationMs } = await processWithAI(doc);
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
