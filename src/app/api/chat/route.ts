import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const runtime = 'edge';

const buildGoogleGenAIPrompt = (messages: any[]) => {
  return messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = "You are an AI analytics assistant for an ecommerce platform. You help store owners understand their data, sales trends, and customer behavior. Keep your answers concise, business-focused, and professional.\n\nUser Question: ";

  // Gemini requires the first message to be from the user, and messages must alternate. 
  // We prepend our system context to the latest message.
  const lastMessage = messages[messages.length - 1];
  const previousMessages = messages.slice(0, messages.length - 1);
  
  const promptMessages = buildGoogleGenAIPrompt([
    ...previousMessages,
    { ...lastMessage, content: systemPrompt + lastMessage.content }
  ]);

  const geminiStream = await genAI
    .getGenerativeModel({ model: 'gemini-2.5-flash' })
    .generateContentStream({
      contents: promptMessages,
    });

  const stream = GoogleGenerativeAIStream(geminiStream);
  return new StreamingTextResponse(stream);
}
