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
  
  // Search and Replace values
  const [searchHe, setSearchHe] = useState("");
  const [replaceHe, setReplaceHe] = useState("");
  const [searchEn, setSearchEn] = useState("");
  const [replaceEn, setReplaceEn] = useState("");
  
  // Preview
  const [matchCount, setMatchCount] = useState<number | null>(null);

  // NEW: Rabbi options from API
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

  const handlePreview = async () => {
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

      const { data, count, error } = await query;

      if (error) throw error;

      setMatchCount(count || 0);
      
      if (count === 0) {
        toast.info("No matching stories found");
      } else {
        toast.success(`Found ${count} matching stories`);
      }
    } catch (error: any) {
      toast.error("Error searching stories", {
        description: error.message,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBulkReplace = async () => {
    if (matchCount === null || matchCount === 0) {
      toast.error("Please preview changes first");
      return;
    }

    if (!replaceHe && !replaceEn) {
      toast.error("Please enter at least one replacement value");
      return;
    }

    setLoading(true);

    try {
      // DEBUG: Log Search Params
      console.log("[BulkEdit] 🔍 Search Params:", { searchHe, searchEn });

      // First, get all matching story IDs
      let query = supabase.from("stories").select("story_id");
      
      if (searchHe) {
        // Normalize Hebrew text to NFC to ensure consistent byte sequence
        // Also strip invisible characters (like Left-to-Right marks)
        const cleanHe = searchHe.trim().normalize("NFC").replace(/[\u200E\u200F\u202A-\u202E]/g, "");
        console.log(`[BulkEdit] Searching Hebrew (normalized): "${cleanHe}"`);
        query = query.ilike("rabbi_he", `%${cleanHe}%`);
      }
      if (searchEn) {
        query = query.ilike("rabbi_en", `%${searchEn.trim()}%`);
      }

      const { data: stories, error: fetchError } = await query;
      
      if (fetchError) {
          console.error("[BulkEdit] ❌ Fetch Error:", fetchError);
          throw fetchError;
      }

      // Safety Check: If user types "a" or something that matches EVERYTHING, warn them
      // In this specialized tool, we just log it, but the Preview button is their safeguard
      console.log(`[BulkEdit] found ${stories?.length} matching stories`);
      if (stories && stories.length > 0) {
          console.log("[BulkEdit] Sample IDs:", stories.slice(0, 5).map(s => s.story_id));
      }

      if (!stories || stories.length === 0) {
        toast.error("No stories found to update");
        setLoading(false);
        return;
      }

      // Build update object
      const updateData: any = {};
      if (replaceHe) updateData.rabbi_he = replaceHe;
      if (replaceEn) updateData.rabbi_en = replaceEn;

      console.log("[BulkEdit] 🛠️ Update Payload:", updateData);

      // Update in chunks to avoid request size limits
      const CHUNK_SIZE = 100;
      const allIds = stories.map(s => s.story_id);
      
      for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
          const chunk = allIds.slice(i, i + CHUNK_SIZE);
          console.log(`[BulkEdit] Processing chunk ${i / CHUNK_SIZE + 1}, size: ${chunk.length}`);
          
          const { error: updateError } = await supabase
            .from("stories")
            .update(updateData)
            .in("story_id", chunk);

          if (updateError) {
              console.error(`[BulkEdit] ❌ Update Error in chunk ${i}:`, updateError);
              throw updateError;
          }
      }

      console.log("[BulkEdit] ✅ Update Complete");

      toast.success(`Successfully updated ${stories.length} stories!`);
      onSuccess();
      onClose();
      
      // Reset form
      setSearchHe("");
      setReplaceHe("");
      setSearchEn("");
      setReplaceEn("");
      setMatchCount(null);
    } catch (error: any) {
      console.error("[BulkEdit] 🚨 Critical Error:", error);
      toast.error("Error updating stories", {
        description: error.message,
      });
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
            Search for stories containing a specific rabbi name (partial match supported) and replace it across all matching stories.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Search Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Find Stories With:</h4>
            {loadingOptions && <p className="text-sm text-muted-foreground">Loading rabbi names...</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rabbi Name (Hebrew)</Label>
                <Input
                  value={searchHe}
                  onChange={(e) => setSearchHe(e.target.value)}
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
                  onChange={(e) => setSearchEn(e.target.value)}
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

          {/* Replace Section */}
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
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Updating..." : <><RefreshCw className="mr-2 h-4 w-4" /> Apply Changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
