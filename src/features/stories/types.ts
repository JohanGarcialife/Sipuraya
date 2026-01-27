// Matching the Supabase Schema from admin/page.tsx
export type Story = {
  id: number;
  external_id: string;
  hebrew_month: string;
  hebrew_day: number;
  title_en: string;
  title_he: string;
  body_en: string;
  body_he: string;
  rabbi_name?: string;  // NEW: Rabbi name from Hebrew file
  tags?: string[];  // NEW: Metadata tags array
};
