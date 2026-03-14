import OpenAI from 'openai';

export interface DocContent {
  text: string;
  pages: number;
  info: Record<string, unknown>;
}

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
});

const SYSTEM_PROMPT = `你是一个文档结构化专家。用户会给你一段从文档中提取的文本，你需要：
1. 判断文档类型（如：发票、合同、报告、论文、简历等）
2. 提取文档的核心结构化信息
3. 以规范的 JSON 格式输出，不要包含任何额外说明文字

输出格式要求：
- 直接返回 JSON 对象，不要用 markdown 代码块包裹
- 根据文档类型自动决定字段
- 字段名使用英文 camelCase
- 如有多条记录（如发票明细）使用数组`;

export interface AIResult {
  data: unknown;
  durationMs: number;
}

export async function processWithAI(doc: DocContent): Promise<AIResult> {
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

  const userMessage = `请分析以下文档内容（共 ${doc.pages} 页），提取结构化数据：\n\n${doc.text}`;

  const start = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.1,
  });
  const durationMs = Date.now() - start;

  const content = response.choices[0]?.message?.content ?? '';

  try {
    return { data: JSON.parse(content), durationMs };
  } catch {
    // 如果 AI 返回了 markdown 代码块，尝试提取其中的 JSON
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return { data: JSON.parse(match[1]), durationMs };
    }
    throw new Error(`AI 返回内容无法解析为 JSON:\n${content}`);
  }
}
