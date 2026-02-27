import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Configure runtime for Edge functionality if compatible, or Node.js for broad compatibility
export const runtime = 'nodejs'; 

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

// Initialize Supabase (Service Role for RPC calls)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. First, check for exact/partial text matches (for Rabbi names or exact titles)
    // We use parallel queries instead of .or() to avoid PostgREST syntax errors with quotes/commas in the query
    const safeIlike = `%${query}%`;
    const [rabbiEn, rabbiHe, titleEn, titleHe] = await Promise.all([
      supabase.from("stories").select("story_id, title_he, title_en, rabbi_he, rabbi_en, date_he, date_en, body_he, body_en").eq("is_published", true).eq("rabbi_en", query).limit(5),
      supabase.from("stories").select("story_id, title_he, title_en, rabbi_he, rabbi_en, date_he, date_en, body_he, body_en").eq("is_published", true).eq("rabbi_he", query).limit(5),
      supabase.from("stories").select("story_id, title_he, title_en, rabbi_he, rabbi_en, date_he, date_en, body_he, body_en").eq("is_published", true).ilike("title_en", safeIlike).limit(5),
      supabase.from("stories").select("story_id, title_he, title_en, rabbi_he, rabbi_en, date_he, date_en, body_he, body_en").eq("is_published", true).ilike("title_he", safeIlike).limit(5)
    ]);

    const combined = [...(rabbiEn.data||[]), ...(rabbiHe.data||[]), ...(titleEn.data||[]), ...(titleHe.data||[])];
    // Deduplicate by story_id
    let stories = Array.from(new Map(combined.map(s => [s.story_id, s])).values());

    // 2. If no direct text matches, fallback to Vector Search
    if (stories.length === 0) {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query.replace(/\n/g, " "),
        dimensions: 1536
      });

      const embedding = embeddingResponse.data[0].embedding;

      const { data: vectorStories, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.5, // Adjust threshold as needed
        match_count: 5        // Limit results
      });

      if (error) {
        console.error("Supabase vector search error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      stories = vectorStories || [];
    }

    // 3. Format Context for LLM
    const context = stories?.map((s: any) => {
      return `Title: ${s.title_en || s.title_he}\nDate: ${s.date_en} (${s.date_he})\nContent: ${s.body_en || s.body_he}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `You are a helpful, warm, and storytelling-oriented assistant for "Sipuraya", a daily Jewish story app.
Your goal is to answer the user's question based ONLY on the provided story context.
If the answer is found in the context, summarize the relevant part of the story to answer the question.
If the answer is NOT in the context, politely say "I couldn't find a story about that exactly, but here are some related stories you might like." and do not make up information.
Keep your answers concise (under 100 words) and inspiring.`;

    // 4. Generate Answer (RAG)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective and fast
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${query}` }
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    return NextResponse.json({ stories, answer });

  } catch (error: any) {
    console.error("Vector Search API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
