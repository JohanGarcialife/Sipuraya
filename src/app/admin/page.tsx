"use client";

import { useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, LogOut, Search } from "lucide-react";
import dynamic from "next/dynamic";

const EditStoryModal = dynamic(
  () => import("@/features/stories/components/EditStoryModal")
);
const UploadBatchModal = dynamic(
  () => import("@/features/batch-upload/components/UploadBatchModal")
);
import { Story } from "@/features/stories/types";
import { useStories } from "@/features/stories/hooks/useStories";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const supabase = createSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const { data: stories, isLoading, isError } = useStories();

  // State for Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State for Search
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();

  // Filter stories based on search term
  const filteredStories = useMemo(() => {
    if (!stories) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return stories.filter((story) => {
      const titleEn = story.title_en?.toLowerCase() || "";
      const titleHe = story.title_he?.toLowerCase() || "";
      const externalId = story.external_id?.toLowerCase() || "";
      return (
        titleEn.includes(lowercasedTerm) ||
        titleHe.includes(lowercasedTerm) ||
        externalId.includes(lowercasedTerm)
      );
    });
  }, [stories, searchTerm]);



  // Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Handle Edit Click
  const handleEditClick = (story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  // Handle Modal Actions
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStory(null);
  };

  const handleSaved = () => {
    // Invalidate the query to refetch the data
    queryClient.invalidateQueries({ queryKey: ["stories"] });
  };


// ... inside AdminDashboard component

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-72 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-48 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
        <div className="rounded-md border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Hebrew Date</TableHead>
                <TableHead className="w-[30%]">Title (English)</TableHead>
                <TableHead className="w-[30%] text-right">Title (Hebrew)</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="mx-auto h-8 w-8 rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-red-500">
          Error loading content. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between rounded-lg border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Content Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Manage and edit your daily stories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
          <Button onClick={() => setIsUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Batch
          </Button>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-8 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Search by title or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
          </div>
      </div>

      {/* Table Section */}
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Hebrew Date</TableHead>
              <TableHead className="w-[30%]">Title (English)</TableHead>
              <TableHead className="w-[30%] text-right">
                Title (Hebrew)
              </TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStories.map((story) => (
              <TableRow key={story.id} className="hover:bg-gray-50/50">
                {/* ID */}
                <TableCell className="font-mono text-xs font-medium text-gray-500">
                  {story.external_id}
                </TableCell>

                {/* Date */}
                <TableCell className="font-medium">
                  {story.hebrew_day} {story.hebrew_month}
                </TableCell>

                {/* Title EN */}
                <TableCell>
                  <div
                    className="max-w-[300px] truncate font-medium text-gray-900"
                    title={story.title_en || ""}
                  >
                    {story.title_en || (
                      <span className="text-red-400 italic">Missing Title</span>
                    )}
                  </div>
                </TableCell>

                {/* Title HE */}
                <TableCell className="text-right font-serif text-lg">
                  <div
                    className="ml-auto max-w-[300px] truncate"
                    dir="rtl"
                    title={story.title_he || ""}
                  >
                    {story.title_he || (
                      <span className="text-sm text-red-400 italic">
                        Missing Title
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(story)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4 text-blue-600" />
                    <span className="sr-only">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Footer info */}
        <div className="border-t p-4 text-center text-xs text-gray-500">
          Showing {filteredStories.length} of {stories?.length || 0} stories.
        </div>
      </div>

      {/* Edit Modal Component */}
      <EditStoryModal
        story={selectedStory}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
      />

      <UploadBatchModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleSaved} // Re-use the same invalidation logic
      />
    </div>
  );
}
