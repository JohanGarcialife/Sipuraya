"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, LogOut } from "lucide-react"; // Make sure to install: npm install lucide-react
import EditStoryModal from "@/app/components/admin/EditStoryModal";
import UploadBatchModal from "@/app/components/admin/UploadBatchModal";

// Define Story Type matching your Supabase Schema
export type Story = {
  id: number;
  external_id: string;
  hebrew_month: string;
  hebrew_day: number;
  title_en: string;
  title_he: string;
  body_en: string;
  body_he: string;
};

export default function AdminDashboard() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the Edit Modal
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const router = useRouter();

  // Initial Load
  useEffect(() => {
    checkUser();
    fetchStories();
  }, []);

  // 1. Check Authentication
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  // 2. Fetch Stories from DB
  const fetchStories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      // Sort chronologically: Month Index (1-12) then Day
      .order("hebrew_month_index", { ascending: true }) 
      .order("hebrew_day", { ascending: true })
      .limit(100); // Pagination can be added later

    if (error) {
      console.error("Error fetching data:", error);
    } else {
      setStories(data || []);
    }
    setLoading(false);
  };

  // 3. Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // 4. Handle Edit Click
  const handleEditClick = (story: Story) => {
    setSelectedStory(story);
    setIsModalOpen(true);
  };

  // 5. Handle Modal Actions
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStory(null);
  };

  const handleSaved = () => {
    fetchStories(); // Refresh the table to show new data
  };

  if (loading && stories.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg text-gray-500">Loading Content Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Content Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage and edit your daily stories.</p>
        </div>
        
        <div className="flex gap-3">
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

      {/* Table Section */}
      <div className="bg-white rounded-md shadow-sm border">
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
            {stories.map((story) => (
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
                  <div className="max-w-[300px] truncate font-medium text-gray-900" title={story.title_en || ""}>
                    {story.title_en || <span className="text-red-400 italic">Missing Title</span>}
                  </div>
                </TableCell>
                
                {/* Title HE */}
                <TableCell className="text-right font-serif text-lg">
                   <div className="max-w-[300px] truncate ml-auto" dir="rtl" title={story.title_he || ""}>
                    {story.title_he || <span className="text-red-400 text-sm italic">Missing Title</span>}
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
        <div className="p-4 border-t text-xs text-gray-500 text-center">
            Showing first 100 stories. Scroll down to load more (feature pending).
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
   onSuccess={fetchStories} // Esto hará que la tabla se actualice sola al terminar
/>
    </div>
  );
}