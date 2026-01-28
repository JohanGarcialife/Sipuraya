import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { Story } from "../types";

export const getStories = async (): Promise<Story[]> => {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*")
    // Sort chronologically by English date (simple format: "1 Adar", "2 Adar", etc.)
    .order("date_en", { ascending: true });

  if (error) {
    console.error("Error fetching stories:", error);
    throw new Error("Could not fetch stories");
  }

  return data || [];
};
