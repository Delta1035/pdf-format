import OpenAI from 'openai';
import type { PdfContent } from './pdf-reader.js';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

const SYSTEM_PROMPT = `你是一个文档结构化专家。用户会给你一段从 PDF 中提取的文本，你需要：
1. 判断文档类型（如：发票、合同、报告、论文、简历等）
2. 提取文档的核心结构化信息
3. 以规范的 JSON 格式输出，不要包含任何额外说明文字

输出格式要求：
- 直接返回 JSON 对象，不要用 markdown 代码块包裹
- 根据文档类型自动决定字段
- 字段名使用英文 camelCase
- 如有多条记录（如发票明细）使用数组`;

export async function processWithAI(pdf: PdfContent): Promise<unknown> {
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  const userMessage = `请分析以下 PDF 文档内容（共 ${pdf.pages} 页），提取结构化数据：\n\n${pdf.text}`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content ?? '';

  try {
    return JSON.parse(content);
  } catch {
    // 如果 AI 返回了 markdown 代码块，尝试提取其中的 JSON
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error(`AI 返回内容无法解析为 JSON:\n${content}`);
  }
}
