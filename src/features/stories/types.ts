// Matching the NEW Supabase Schema with 10 columns
export type Story = {
  story_id: string;            // External ID (Ad0001, Ad0002, etc.) - PRIMARY KEY
  rabbi_he: string | null;     // Rabbi name in Hebrew
  rabbi_en: string | null;     // Rabbi name in English
  date_he: string;             // Hebrew date format: "א' אדר"
  date_en: string;             // English date format: "1 Adar"
  title_he: string | null;     // Hebrew title
  title_en: string | null;     // English title
  body_he: string | null;      // Hebrew story content
  body_en: string | null;      // English story content
  tags: string[];              // Tags array
  embedding?: number[] | null; // AI embedding (optional)
  is_published?: boolean;      // Publishing status
  created_at?: string;         // Timestamp
};
