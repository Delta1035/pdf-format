#!/usr/bin/env node
import 'dotenv/config';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { readPdf } from './pdf-reader.js';
import { processWithAI } from './ai-processor.js';
function parseArgs(args) {
    const outputIndex = args.indexOf('--output');
    let outputPath;
    if (outputIndex !== -1) {
        outputPath = args[outputIndex + 1];
        args = args.filter((_, i) => i !== outputIndex && i !== outputIndex + 1);
    }
    const filePath = args[0];
    if (!filePath) {
        console.error('用法: pnpm start <pdf文件路径> [--output <输出文件路径>]');
        process.exit(1);
    }
    return { filePath, outputPath };
}
async function main() {
    const args = process.argv.slice(2);
    const { filePath, outputPath } = parseArgs(args);
    const absolutePath = resolve(filePath);
    console.log(`正在读取 PDF: ${absolutePath}`);
    const pdf = await readPdf(absolutePath);
    console.log(`提取完成，共 ${pdf.pages} 页，${pdf.text.length} 字符`);
    console.log('正在调用 AI 结构化数据...');
    const result = await processWithAI(pdf);
    const json = JSON.stringify(result, null, 2);
    if (outputPath) {
        const outPath = resolve(outputPath);
        await writeFile(outPath, json, 'utf-8');
        console.log(`已保存到: ${outPath}`);
    }
    else {
        console.log('\n--- 结构化结果 ---\n');
        console.log(json);
    }
}
main().catch((err) => {
    console.error('错误:', err.message);
    process.exit(1);
});
