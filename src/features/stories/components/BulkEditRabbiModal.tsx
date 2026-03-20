"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BulkEditRabbiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkEditRabbiModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkEditRabbiModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Mode: "replace" = update existing names | "fill" = fill in missing (null) rabbi_he
  const [mode, setMode] = useState<"replace" | "fill">("replace");

  // Search and Replace values
  const [searchHe, setSearchHe] = useState("");
  const [replaceHe, setReplaceHe] = useState("");
  const [searchEn, setSearchEn] = useState("");
  const [replaceEn, setReplaceEn] = useState("");

  // Fill-missing mode values
  const [fillEnglishName, setFillEnglishName] = useState("");
  const [fillHebrewName, setFillHebrewName] = useState("");

  // Preview
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // Rabbi options from API
  const [rabbiOptionsHe, setRabbiOptionsHe] = useState<string[]>([]);
  const [rabbiOptionsEn, setRabbiOptionsEn] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Fetch unique rabbi names on mount
  useEffect(() => {
    const fetchRabbis = async () => {
      try {
        const res = await fetch("/api/rabbis/unique");
        const data = await res.json();
        setRabbiOptionsHe(data.hebrew || []);
        setRabbiOptionsEn(data.english || []);
      } catch (error) {
        console.error("[BulkEdit] Failed to fetch rabbi options:", error);
        toast.error("Failed to load rabbi options");
      } finally {
        setLoadingOptions(false);
      }
    };
    if (isOpen) fetchRabbis();
  }, [isOpen]);

  const resetForm = () => {
    setSearchHe("");
    setReplaceHe("");
    setSearchEn("");
    setReplaceEn("");
    setFillEnglishName("");
    setFillHebrewName("");
    setMatchCount(null);
  };

  // ── PREVIEW ──────────────────────────────────────────────
  const handlePreview = async () => {
    if (mode === "fill") {
      if (!fillEnglishName.trim()) {
        toast.error("Please enter the English Rabbi name to search for");
        return;
      }
      setSearchLoading(true);
      setMatchCount(null);
      try {
        const { count, error } = await supabase
          .from("stories")
          .select("story_id", { count: "exact", head: true })
          .ilike("rabbi_en", `%${fillEnglishName.trim()}%`)
          .is("rabbi_he", null);
        if (error) throw error;
        setMatchCount(count || 0);
        if ((count || 0) === 0) toast.info("No stories found with missing Hebrew rabbi name for that English name");
        else toast.success(`Found ${count} stories with missing Hebrew rabbi name`);
      } catch (err: any) {
        toast.error("Error searching", { description: err.message });
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    // Replace mode
    if (!searchHe && !searchEn) {
      toast.error("Please enter at least one search term");
      return;
    }
    setSearchLoading(true);
    setMatchCount(null);
    try {
      let query = supabase.from("stories").select("story_id", { count: "exact", head: false });
      if (searchHe) {
        const cleanHe = searchHe.trim().normalize("NFC").replace(/[\u200E\u200F\u202A-\u202E]/g, "");
        query = query.ilike("rabbi_he", `%${cleanHe}%`);
      }
      if (searchEn) {
        query = query.ilike("rabbi_en", `%${searchEn.trim()}%`);
      }
      const { count, error } = await query;
      if (error) throw error;
      setMatchCount(count || 0);
      if (count === 0) toast.info("No matching stories found");
      else toast.success(`Found ${count} matching stories`);
    } catch (error: any) {
      toast.error("Error searching stories", { description: error.message });
    } finally {
      setSearchLoading(false);
    }
  };

  // ── APPLY ─────────────────────────────────────────────────
  const handleBulkReplace = async () => {
    if (matchCount === null || matchCount === 0) {
      toast.error("Please preview changes first");
      return;
    }
    setLoading(true);

    try {
      // ── FILL MISSING MODE ──
      if (mode === "fill") {
        if (!fillHebrewName.trim()) {
          toast.error("Please enter the Hebrew Rabbi name to fill in");
          setLoading(false);
          return;
        }

        // Get all story IDs that match
        const { data: stories, error: fetchError } = await supabase
          .from("stories")
          .select("story_id, rabbi_en")
          .ilike("rabbi_en", `%${fillEnglishName.trim()}%`)
          .is("rabbi_he", null);
        if (fetchError) throw fetchError;
        if (!stories || stories.length === 0) {
          toast.error("No stories found to update");
          setLoading(false);
          return;
        }

        const CHUNK_SIZE = 100;
        const allIds = stories.map(s => s.story_id);
        for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
          const chunk = allIds.slice(i, i + CHUNK_SIZE);
          const { error: updateError } = await supabase
            .from("stories")
            .update({ rabbi_he: fillHebrewName.trim() })
            .in("story_id", chunk);
          if (updateError) throw updateError;
        }

        // Also save to the rabbis lookup table for future uploads
        // Get the exact rabbi_en value (from the first match)
        const exactEnName = stories[0]?.rabbi_en;
        if (exactEnName) {
          await supabase
            .from("rabbis")
            .upsert(
              [{ name_en: exactEnName, name_he: fillHebrewName.trim() }],
              { onConflict: "name_en", ignoreDuplicates: false }
            );
          console.log(`[BulkEdit] ✅ Saved rabbi EN→HE pair to permanent rabbis table`);
        }

        toast.success(`Successfully filled Hebrew rabbi name for ${stories.length} stories!`);
        onSuccess();
        onClose();
        resetForm();
        return;
      }

      // ── REPLACE MODE ──
      if (!replaceHe && !replaceEn) {
        toast.error("Please enter at least one replacement value");
        setLoading(false);
        return;
      }

      let query = supabase.from("stories").select("story_id, rabbi_en");
      if (searchHe) {
        const cleanHe = searchHe.trim().normalize("NFC").replace(/[\u200E\u200F\u202A-\u202E]/g, "");
        query = query.ilike("rabbi_he", `%${cleanHe}%`);
      }
      if (searchEn) {
        query = query.ilike("rabbi_en", `%${searchEn.trim()}%`);
      }

      const { data: stories, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      if (!stories || stories.length === 0) {
        toast.error("No stories found to update");
        setLoading(false);
        return;
      }

      const updateData: any = {};
      if (replaceHe) updateData.rabbi_he = replaceHe;
      if (replaceEn) updateData.rabbi_en = replaceEn;

      const CHUNK_SIZE = 100;
      const allIds = stories.map(s => s.story_id);
      for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
        const chunk = allIds.slice(i, i + CHUNK_SIZE);
        const { error: updateError } = await supabase
          .from("stories")
          .update(updateData)
          .in("story_id", chunk);
        if (updateError) throw updateError;
      }

      // Save to rabbis table for future uploads
      if (replaceHe) {
        const exactEnName = stories[0]?.rabbi_en;
        const finalEnName = replaceEn || exactEnName;
        if (finalEnName) {
          await supabase
            .from("rabbis")
            .upsert(
              [{ name_en: finalEnName, name_he: replaceHe }],
              { onConflict: "name_en", ignoreDuplicates: false }
            );
        }
      }

      toast.success(`Successfully updated ${stories.length} stories!`);
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error("[BulkEdit] 🚨 Critical Error:", error);
      toast.error("Error updating stories", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Rabbi Names</DialogTitle>
          <DialogDescription>
            Update rabbi names across all matching stories at once.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Mode Tabs */}
          <div className="flex gap-2 border-b pb-3">
            <button
              onClick={() => { setMode("fill"); resetForm(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "fill"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ✏️ Fill Missing Hebrew Names
            </button>
            <button
              onClick={() => { setMode("replace"); resetForm(); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === "replace"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🔄 Find & Replace Names
            </button>
          </div>

          {/* FILL MISSING MODE */}
          {mode === "fill" && (
            <div className="space-y-4">
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Use this to fill in missing Hebrew rabbi names. Find all stories with a specific English rabbi name where the Hebrew name is blank, and set the Hebrew name for all of them.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Find by English Rabbi Name</Label>
                  <Input
                    value={fillEnglishName}
                    onChange={(e) => { setFillEnglishName(e.target.value); setMatchCount(null); }}
                    placeholder="e.g. Rabbi Shmuel HaLevi Kelin"
                    list="rabbi-fill-options-en"
                    disabled={loadingOptions}
                  />
                  <datalist id="rabbi-fill-options-en">
                    {rabbiOptionsEn.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-400">Only stories with missing Hebrew name are affected</p>
                </div>
                <div className="space-y-2">
                  <Label>Set Hebrew Rabbi Name</Label>
                  <Input
                    value={fillHebrewName}
                    onChange={(e) => setFillHebrewName(e.target.value)}
                    placeholder="הגאון רבי שמואל הלוי קעלין"
                    dir="rtl"
                  />
                  <p className="text-xs text-gray-400">This will also be saved for future uploads</p>
                </div>
              </div>
            </div>
          )}

          {/* REPLACE MODE */}
          {mode === "replace" && (
            <>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Find Stories With:</h4>
                {loadingOptions && <p className="text-sm text-muted-foreground">Loading rabbi names...</p>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rabbi Name (Hebrew)</Label>
                    <Input
                      value={searchHe}
                      onChange={(e) => { setSearchHe(e.target.value); setMatchCount(null); }}
                      placeholder="רבי שלמה בן מסעוד"
                      dir="rtl"
                      list="rabbi-options-he"
                      disabled={loadingOptions}
                    />
                    <datalist id="rabbi-options-he">
                      {rabbiOptionsHe.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <Label>Rabbi Name (English)</Label>
                    <Input
                      value={searchEn}
                      onChange={(e) => { setSearchEn(e.target.value); setMatchCount(null); }}
                      placeholder="Rabbi Shlomo ben Masud"
                      list="rabbi-options-en"
                      disabled={loadingOptions}
                    />
                    <datalist id="rabbi-options-en">
                      {rabbiOptionsEn.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">Replace With:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Rabbi Name (Hebrew)</Label>
                    <Input
                      value={replaceHe}
                      onChange={(e) => setReplaceHe(e.target.value)}
                      placeholder="רבי יעקב אבוחצירא"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Rabbi Name (English)</Label>
                    <Input
                      value={replaceEn}
                      onChange={(e) => setReplaceEn(e.target.value)}
                      placeholder="Rabbi Yaakov Abuchatzeira"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Preview Button */}
          <div className="flex items-center gap-4 border-t pt-4">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={searchLoading || loading}
              className="flex-1"
            >
              {searchLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {searchLoading ? "Searching..." : <><Search className="mr-2 h-4 w-4" /> Preview Changes</>}
            </Button>

            {matchCount !== null && (
              <div className="flex-1 text-center p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm font-semibold text-blue-900">
                  {matchCount} {matchCount === 1 ? "story" : "stories"} will be updated
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkReplace}
            disabled={loading || matchCount === null || matchCount === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Updating..." : <><RefreshCw className="mr-2 h-4 w-4" /> Apply Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
