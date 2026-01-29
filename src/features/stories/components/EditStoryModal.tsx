"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Story } from "../types";
import { toast } from "sonner";

interface EditStoryModalProps {
  story: Story | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void; // Trigger refresh after save
}

export default function EditStoryModal({
  story,
  isOpen,
  onClose,
  onSaved,
}: EditStoryModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rabbi_he: story?.rabbi_he || "",
    rabbi_en: story?.rabbi_en || "",
    date_he: story?.date_he || "",
    date_en: story?.date_en || "",
    title_en: story?.title_en || "",
    title_he: story?.title_he || "",
    body_en: story?.body_en || "",
    body_he: story?.body_he || "",
    tags: story?.tags || [],
  });

  // When the story prop changes, update the form data
  useEffect(() => {
    if (story && (formData.title_en !== story.title_en || formData.title_he !== story.title_he)) {
      setFormData({
        rabbi_he: story.rabbi_he || "",
        rabbi_en: story.rabbi_en || "",
        date_he: story.date_he || "",
        date_en: story.date_en || "",
        title_en: story.title_en || "",
        title_he: story.title_he || "",
        body_en: story.body_en || "",
        body_he: story.body_he || "",
        tags: story.tags || [],
      });
    }
  }, [story?.story_id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!story) return;
    setLoading(true);

    const { error } = await supabase
      .from("stories")
      .update({
        rabbi_he: formData.rabbi_he,
        rabbi_en: formData.rabbi_en,
        date_he: formData.date_he,
        date_en: formData.date_en,
        title_en: formData.title_en,
        title_he: formData.title_he,
        body_en: formData.body_en,
        body_he: formData.body_he,
        tags: formData.tags,
      })
      .eq("story_id", story.story_id);

    setLoading(false);

    if (error) {
      toast.error("Error saving story", {
        description: error.message,
      });
    } else {
      toast.success("Story saved successfully!");
      onSaved();
      onClose();
    }
  };

  if (!story) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Story: {story.story_id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metadata Section - Full Width */}
          <div className="border-b pb-4">
            <h3 className="mb-3 font-bold text-lg">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Dates */}
              <div className="space-y-2">
                <Label>Hebrew Date (e.g., א' אדר)</Label>
                <Input
                  value={formData.date_he}
                  onChange={(e) => handleChange("date_he", e.target.value)}
                  placeholder="א' אדר"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>English Date (e.g., 1 Adar)</Label>
                <Input
                  value={formData.date_en}
                  onChange={(e) => handleChange("date_en", e.target.value)}
                  placeholder="1 Adar"
                />
              </div>
              
              {/* Rabbi Names */}
              <div className="space-y-2">
                <Label>Rabbi Name (Hebrew)</Label>
                <Input
                  value={formData.rabbi_he}
                  onChange={(e) => handleChange("rabbi_he", e.target.value)}
                  placeholder="רבי שלמה בן מסעוד"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label>Rabbi Name (English)</Label>
                <Input
                  value={formData.rabbi_en}
                  onChange={(e) => handleChange("rabbi_en", e.target.value)}
                  placeholder="Rabbi Shlomo ben Masud"
                />
              </div>
            </div>
          </div>

          {/* Content Section - Two Columns */}
          <div className="grid grid-cols-2 gap-6">
            {/* English Column */}
            <div className="space-y-4">
              <h3 className="border-b pb-2 font-bold">English</h3>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title_en}
                  onChange={(e) => handleChange("title_en", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  className="min-h-[250px]"
                  value={formData.body_en}
                  onChange={(e) => handleChange("body_en", e.target.value)}
                />
              </div>
            </div>

            {/* Hebrew Column */}
            <div className="space-y-4" dir="rtl">
              <h3 className="border-b pb-2 font-bold">עברית (Hebrew)</h3>
              <div className="space-y-2">
                <Label>כותרת (Title)</Label>
                <Input
                  value={formData.title_he}
                  onChange={(e) => handleChange("title_he", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>תוכן (Body)</Label>
                <Textarea
                  className="min-h-[250px]"
                  value={formData.body_he}
                  onChange={(e) => handleChange("body_he", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tags Section - Full Width */}
          <div className="space-y-2 border-t pt-4">
            <Label>Tags / Metadata</Label>
            <Textarea
              className="min-h-[60px]" 
              placeholder="Enter tags separated by commas (e.g., BIOGRAPHY, Pesach, Education)"
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
              onChange={(e) => {
                const tagsArray = e.target.value
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t.length > 0);
                setFormData((prev) => ({ ...prev, tags: tagsArray }));
              }}
            />
            <p className="text-xs text-gray-500">
              Internal organization tags (extracted from ### markers in source files)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
