import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemMessage = {
    role: 'system',
    content: 'You are an AI analytics assistant for an ecommerce platform. You help store owners understand their data, sales trends, and customer behavior. Keep your answers concise, business-focused, and professional.',
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    stream: true,
    messages: [systemMessage, ...messages],
  });

  // Type-casting to any resolves the AzureChatCompletions type mismatch between openai and ai SDKs
  const stream = OpenAIStream(response as any);
  return new StreamingTextResponse(stream);
}
