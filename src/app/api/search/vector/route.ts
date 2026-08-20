import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function stripNikud(text: string): string {
  if (!text) return '';
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function cleanHebrewWords(text: string): string[] {
  if (!text) return [];
  const cleaned = stripNikud(text).replace(/["'״׳]/g, ' ');
  const honorifics = new Set([
    'הגאון', 'רבי', 'הרב', 'האדמור', 'האדמו"ר', 'מרן', 'הרהק', 'הרה"ק',
    'הרהצ', 'הרה"צ', 'זצל', 'זצ"ל', 'זיע', 'זי"ע', 'זצוקל', 'זצוק"ל',
    'שליטא', 'שליט"א', 'זל', 'ז"ל', 'הקדוש', 'הצדיק'
  ]);
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const core = words.filter(w => !honorifics.has(w));
  return core.length > 0 ? core : words;
}

export async function POST(req: NextRequest) {
  try {
    const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );
    const { query, isHe: isHeParam } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const isHebrew = isHeParam !== undefined ? Boolean(isHeParam) : /[\u0590-\u05FF]/.test(query);

    // 1. Direct multi-column smart search
    const cleanQuery = stripNikud(query).trim();
    const searchWords = cleanHebrewWords(query);

    let dbQuery = supabase
      .from('stories')
      .select('story_id, title_he, title_en, rabbi_he, rabbi_en, date_he, date_en, body_he, body_en');

    searchWords.forEach(word => {
      const wordVariants = [word];
      // Hebrew spelling interchangeability (e.g. עקיבה <-> עקיבא)
      if (word.endsWith('ה') && word.length > 3) {
        wordVariants.push(word.slice(0, -1) + 'א');
      } else if (word.endsWith('א') && word.length > 3) {
        wordVariants.push(word.slice(0, -1) + 'ה');
      }

      const orClauses: string[] = [];
      wordVariants.forEach(variant => {
        orClauses.push(`title_he_clean.ilike.%${variant}%`);
        orClauses.push(`title_he.ilike.%${variant}%`);
        orClauses.push(`title_en.ilike.%${variant}%`);
        orClauses.push(`rabbi_he.ilike.%${variant}%`);
        orClauses.push(`rabbi_en.ilike.%${variant}%`);
        orClauses.push(`body_he_clean.ilike.%${variant}%`);
        orClauses.push(`body_en.ilike.%${variant}%`);
      });

      dbQuery = dbQuery.or(orClauses.join(','));
    });

    const { data: matchedStories, error: dbError } = await dbQuery.limit(10);
    let stories = matchedStories || [];

    // 2. Semantic vector search fallback if no direct matches
    if (stories.length === 0) {
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: cleanQuery.replace(/\n/g, " "),
          dimensions: 1536
        });

        const embedding = embeddingResponse.data[0].embedding;

        const { data: vectorStories } = await supabase.rpc("match_documents", {
          query_embedding: embedding,
          match_threshold: 0.35,
          match_count: 5
        });

        if (vectorStories && vectorStories.length > 0) {
          stories = vectorStories;
        }
      } catch (embErr: any) {
        console.warn("Vector search fallback failed:", embErr?.message);
      }
    }

    // 3. Format context for LLM
    const context = stories.map((s: any) => {
      const title = isHebrew ? (s.title_he || s.title_en) : (s.title_en || s.title_he);
      const rabbi = isHebrew ? (s.rabbi_he || s.rabbi_en) : (s.rabbi_en || s.rabbi_he);
      const date = isHebrew ? (s.date_he || s.date_en) : (s.date_en || s.date_he);
      const body = isHebrew ? (s.body_he || s.body_en) : (s.body_en || s.body_he);
      return `Title: ${title}\nRabbi: ${rabbi}\nDate: ${date}\nContent: ${body?.substring(0, 1000)}`;
    }).join("\n\n---\n\n");

    const systemPrompt = isHebrew
      ? `אתה עוזר נבון, חם ומספר סיפורים באפליקציית "סיפוריא" (Sipuraya) לסיפורים יהודיים.
תפקידך לענות על שאלת המשתמש או לסכם את הסיפורים הרלוונטיים אך ורק על סמך ההקשר המצורף.
אם יש בהקשר סיפורים רלוונטיים, סכם בקצרה ובחום את עיקרי הסיפור (עד 70 מילים).
אם אין בהקשר מידע רלוונטי כלל, כתוב בנימוס: "לא מצאנו סיפור מדויק בנושא זה, אך הנה מספר סיפורים שעשויים לעניין אותך." ואל תמציא מידע.`
      : `You are a helpful, warm, and storytelling-oriented assistant for "Sipuraya", a daily Jewish story app.
Your goal is to answer the user's question or summarize the stories based ONLY on the provided story context.
If relevant stories are found in the context, summarize the essence warmly and concisely (under 70 words).
If the context is not relevant, politely say "I couldn't find a story about that exactly, but here are some related stories you might like." and do not make up information.`;

    let answer: string | null = null;
    if (stories.length > 0) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${context}\n\nQuery: ${query}` }
        ],
        temperature: 0.7,
      });
      answer = completion.choices[0]?.message?.content || null;
    } else {
      answer = isHebrew
        ? `לא נמצאו סיפורים עבור "${query}". נסו לחפש בשם אחר או במילות מפתח כלליות יותר.`
        : `No stories found for "${query}". Try searching with different keywords.`;
    }

    return NextResponse.json({ stories, answer });

  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
