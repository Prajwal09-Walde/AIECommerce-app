"use server";

import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Order from "@/models/Order";
import User from "@/models/User";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Very basic, highly robust TF-IDF-like chunk retriever implemented in pure JS.
 * Splitting text by sentence groups, tokenizing, and scoring based on term overlap.
 */
function retrieveGuidelines(guidelinesText: string, query: string, topK: number = 3): string[] {
  if (!guidelinesText || !guidelinesText.trim()) return [];
  
  // 1. Chunk by paragraphs or groups of 2-3 sentences
  const paragraphs = guidelinesText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 10);
  
  const chunks: string[] = [];
  paragraphs.forEach(p => {
    // If a paragraph is too long, we split it by sentences
    const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(" ").trim();
      if (chunk.length > 10) {
        chunks.push(chunk);
      }
    }
  });

  if (chunks.length === 0) return [];

  // 2. Tokenize and normalize query
  const queryTokens = query.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (queryTokens.length === 0) {
    // Fallback: return top K chunks directly
    return chunks.slice(0, topK);
  }

  // 3. Score chunks based on token overlaps
  const scoredChunks = chunks.map(chunk => {
    const chunkLower = chunk.toLowerCase();
    let score = 0;
    queryTokens.forEach(token => {
      if (chunkLower.includes(token)) {
        score += 1;
        // Extra weight if exact word boundary
        const regex = new RegExp(`\\b${token}\\b`, "i");
        if (regex.test(chunk)) {
          score += 1.5;
        }
      }
    });
    return { chunk, score };
  });

  // Sort by score descending and return top K
  return scoredChunks
    .filter(sc => sc.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(sc => sc.chunk)
    .slice(0, topK);
}

export async function runAutomatedRAGAnalysis(focus: string, customGuidelines: string) {
  const logs: string[] = [];
  try {
    logs.push(`[${new Date().toLocaleTimeString()}] Starting RAG analysis for focus: "${focus}"...`);
    
    // 1. Connect to DB
    await connectToDatabase();
    logs.push(`[${new Date().toLocaleTimeString()}] Connected to MongoDB instance.`);

    // 2. Ingest products
    const products = await Product.find({}).lean();
    logs.push(`[${new Date().toLocaleTimeString()}] Ingested ${products.length} products from the database.`);

    // 3. Ingest orders and users
    const orders = await Order.find({}).populate("items.productId").lean();
    const users = await User.find({}).lean();
    logs.push(`[${new Date().toLocaleTimeString()}] Ingested ${orders.length} transactions and ${users.length} customer records.`);

    // 4. Run retrieval over user-uploaded documents/guidelines
    logs.push(`[${new Date().toLocaleTimeString()}] Running in-memory semantic indexing on custom guidelines...`);
    const retrievedChunks = retrieveGuidelines(customGuidelines, focus, 3);
    logs.push(`[${new Date().toLocaleTimeString()}] Retrieved ${retrievedChunks.length} matching knowledge chunks.`);

    // Calculate core metrics for RAG Context
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const averageOrderValue = orders.length > 0 ? (totalRevenue / orders.length) : 0;
    const lowStockAlerts = products.filter(p => (p.stock || 0) < 10).length;
    const categoryDistribution: Record<string, number> = {};
    products.forEach(p => {
      categoryDistribution[p.category] = (categoryDistribution[p.category] || 0) + 1;
    });

    // Compile RAG Context
    const dbContext = {
      summary: {
        totalRevenue,
        totalOrders: orders.length,
        averageOrderValue,
        lowStockAlerts,
        totalUsers: users.length,
        categoryCount: Object.keys(categoryDistribution).length
      },
      products: products.map(p => ({
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock
      })),
      orders: orders.map(o => ({
        customer: o.customer,
        totalAmount: o.totalAmount,
        status: o.status,
        createdAt: o.createdAt
      }))
    };

    logs.push(`[${new Date().toLocaleTimeString()}] Context built. Packaging prompt for LLM...`);

    const systemPrompt = `You are a world-class AI eCommerce Data Analyst. Your job is to conduct a professional, data-driven synthesis of store database metrics combined with retrieved business objectives/guidelines.
    
Focus of this Analysis: "${focus}"

=== RETRIEVED BUSINESS/COMPETITOR GUIDELINES ===
${retrievedChunks.length > 0 
  ? retrievedChunks.map((c, i) => `[Chunk ${i+1}]: ${c}`).join("\n") 
  : "No specific extra guidelines provided. Analyze database metrics standardly."}

=== STORE DATABASE METRICS ===
- Total Store Revenue: $${totalRevenue.toFixed(2)}
- Total Completed Orders: ${orders.length}
- Average Order Value: $${averageOrderValue.toFixed(2)}
- Unique Registered Customers: ${users.length}
- Products count in inventory: ${products.length}
- Low Stock Products Count (< 10 items): ${lowStockAlerts}
- Category distribution: ${JSON.stringify(categoryDistribution)}

Products Inventory details:
${products.map(p => `- ${p.name} (Category: ${p.category}, Price: $${p.price}, Stock: ${p.stock})`).join("\n")}

Recent Orders details:
${orders.slice(-5).map(o => `- Customer "${o.customer}": Amount $${o.totalAmount}, Status: ${o.status}, local timezone simulation active.`).join("\n")}

=== INSTRUCTIONS ===
Perform a deep analysis on the data with respect to the Focus of Analysis ("${focus}"). You must synthesize the Database Metrics alongside the Retrieved Business Guidelines.
For example, if guidelines indicate reducing stock or clearing accessories, recommend specific pricing strategies or restocks matching the product details.
Your final response MUST be a JSON object ONLY, valid for JSON.parse, using the exact structure specified below. Do not output anything before or after the JSON code block.

=== OUTPUT JSON FORMAT ===
{
  "summary": "Provide a executive summary paragraph summarizing store health, focusing on the '${focus}' topic and combining MongoDB metrics and retrieved guidelines.",
  "kpis": {
    "totalRevenue": "$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}",
    "totalOrders": ${orders.length},
    "averageOrderValue": "$${averageOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}",
    "lowStockAlerts": ${lowStockAlerts},
    "activeUsers": ${users.length}
  },
  "sections": [
    {
      "title": "Focus Analysis & Guidelines Synthesis",
      "content": "Deep qualitative and quantitative analysis of '${focus}' integrating matching database facts and business guidelines."
    },
    {
      "title": "Inventory and Pricing Adjustments",
      "content": "Specific, data-driven recommendations regarding product stocking, discounts, or risk mitigations."
    }
  ],
  "swot": {
    "strengths": ["Identify 2 strengths based on data"],
    "weaknesses": ["Identify 2 weaknesses based on data"],
    "opportunities": ["Identify 2 opportunities based on data & guidelines"],
    "threats": ["Identify 2 threats based on data & guidelines"]
  },
  "actionableSteps": [
    {
      "task": "Specific task name (e.g. Restock Noise Cancelling Headphones)",
      "reason": "Clear explanation based on data/guidelines",
      "priority": "High" | "Medium" | "Low"
    },
    {
      "task": "Specific task name",
      "reason": "Clear explanation",
      "priority": "High" | "Medium" | "Low"
    }
  ]
}`;

    logs.push(`[${new Date().toLocaleTimeString()}] Prompt generated. Sending generation stream request to Gemini-2.5-Flash...`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text();

    logs.push(`[${new Date().toLocaleTimeString()}] Generation completed successfully.`);

    // Extract JSON from markdown tags if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.substring(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.substring(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.substring(0, jsonText.length - 3);
    }
    jsonText = jsonText.trim();

    const analysis = JSON.parse(jsonText);
    logs.push(`[${new Date().toLocaleTimeString()}] Report parsed and structured.`);

    return {
      success: true,
      logs,
      retrievedChunks,
      analysis
    };

  } catch (error: any) {
    console.error("RAG Analysis Action Error:", error);
    logs.push(`[${new Date().toLocaleTimeString()}] ERROR: ${error.message}`);
    return {
      success: false,
      logs,
      error: error.message
    };
  }
}
