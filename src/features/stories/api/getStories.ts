import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { Story } from "../types";

export const getStories = async (): Promise<Story[]> => {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    // Sort chronologically: Month Index (1-12) then Day
    .order("hebrew_month_index", { ascending: true })
    .order("hebrew_day", { ascending: true });

  if (error) {
    console.error("Error fetching stories:", error);
    throw new Error("Could not fetch stories");
  }

  return data || [];
};
