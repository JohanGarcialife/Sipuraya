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
import { ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";

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
  const [uploadingImage, setUploadingImage] = useState(false);
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
    image_url: story?.image_url || "",
  });

  // When the story prop changes, update the form data
  useEffect(() => {
    if (story) {
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
        image_url: story.image_url || "",
      });
    }
  }, [story?.story_id]); // Depend only on story_id to prevent overwrite while typing

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !story) return;

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${story.story_id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // 1. Upload the image
      const { error: uploadError } = await supabase.storage
        .from('story_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story_images')
        .getPublicUrl(filePath);

      // 3. Update local state (it will be saved to DB when user clicks Save)
      handleChange('image_url', publicUrl);
      toast.success("Image uploaded successfully! Don't forget to click Save.");

    } catch (err: any) {
      toast.error("Failed to upload image", { description: err.message });
    } finally {
      setUploadingImage(false);
    }
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
        image_url: formData.image_url,
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
          {/* Image Section */}
          <div className="border-b pb-4">
            <h3 className="mb-3 font-bold text-lg">Featured Image</h3>
            <div className="flex items-start gap-6">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                {formData.image_url ? (
                  <>
                    <Image
                      src={formData.image_url}
                      alt="Story Image"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleChange('image_url', '')}
                      className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-80 hover:bg-red-600 hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="space-y-3">
                <Label htmlFor="image-upload" className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                  {uploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                  {uploadingImage ? "Uploading..." : "Upload New Image"}
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, WebP. Recommended ratio: 16:9. <br/>
                  Images generated by AI tools (like ChatGPT) look best here.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs">Or paste URL:</Label>
                  <Input 
                    placeholder="https://..." 
                    value={formData.image_url} 
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Section - Full Width */}
          <div className="border-b pb-4">
            <h3 className="mb-3 font-bold text-lg">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Dates */}
              <div className="space-y-2">
                <Label>English Date (e.g., 1 Adar)</Label>
                <Input
                  value={formData.date_en}
                  onChange={(e) => handleChange("date_en", e.target.value)}
                  placeholder="1 Adar"
                />
              </div>
              <div className="space-y-2">
                <Label>Hebrew Date (e.g., א' אדר)</Label>
                <Input
                  value={formData.date_he}
                  onChange={(e) => handleChange("date_he", e.target.value)}
                  placeholder="א' אדר"
                  dir="rtl"
                />
              </div>
              
              {/* Rabbi Names */}
              <div className="space-y-2">
                <Label>Rabbi Name (English)</Label>
                <Input
                  value={formData.rabbi_en}
                  onChange={(e) => handleChange("rabbi_en", e.target.value)}
                  placeholder="Rabbi Shlomo ben Masud"
                />
              </div>
              <div className="space-y-2">
                <Label>Rabbi Name (Hebrew)</Label>
                <Input
                  value={formData.rabbi_he}
                  onChange={(e) => handleChange("rabbi_he", e.target.value)}
                  placeholder="רבי שלמה בן מסעוד"
                  dir="rtl"
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
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Promotion & Tags</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.tags.includes("holiday") ? "default" : "outline"}
                  size="sm"
                  className={formData.tags.includes("holiday") ? "bg-amber-600 hover:bg-amber-700" : ""}
                  onClick={() => {
                    const newTags = formData.tags.includes("holiday")
                      ? formData.tags.filter(t => t !== "holiday")
                      : [...formData.tags, "holiday"];
                    setFormData(prev => ({ ...prev, tags: newTags }));
                  }}
                >
                  🕍 Holiday Section
                </Button>
                <Button
                  type="button"
                  variant={formData.tags.includes("new") ? "default" : "outline"}
                  size="sm"
                  className={formData.tags.includes("new") ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => {
                    const newTags = formData.tags.includes("new")
                      ? formData.tags.filter(t => t !== "new")
                      : [...formData.tags, "new"];
                    setFormData(prev => ({ ...prev, tags: newTags }));
                  }}
                >
                  🆕 Recently Added
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wider">Internal Tags (Comma Separated)</Label>
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
              <p className="text-xs text-gray-400">
                Use the buttons above to quickly feature this story, or add custom tags below.
              </p>
            </div>
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
