export type Story = {
  id: number;
  external_id: string;
  hebrew_month: string;
  hebrew_month_index: number;
  hebrew_day: number;
  title_en: string | null;
  body_en: string | null;
  title_he: string | null;
  body_he: string | null;
  is_published: boolean;
  created_at: string;
};