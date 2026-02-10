"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/supabase";
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
import { Input } from "@/components/ui/input";
import { Pencil, LogOut, ChevronLeft, ChevronRight, Search, Plus, Loader2, ArrowUpDown, Users, Trash2 } from "lucide-react";
import EditStoryModal from "../../features/stories/components/EditStoryModal";
import UploadBatchModal from "../../features/batch-upload/components/UploadBatchModal";
import BulkEditRabbiModal from "../../features/stories/components/BulkEditRabbiModal"; 
import BulkDeleteModal from "../../features/stories/components/BulkDeleteModal";

// TYPES - Matching NEW database schema
export type Story = {
  story_id: string;            // External ID (Ad0001) - PRIMARY KEY
  rabbi_he: string | null;     // Rabbi name in Hebrew
  rabbi_en: string | null;     // Rabbi name in English
  date_he: string;             // Hebrew date: "א' אדר"
  date_en: string;             // English date: "1 Adar"
  title_he: string | null;     // Hebrew title
  title_en: string | null;     // English title
  body_he: string | null;      // Hebrew story content
  body_en: string | null;      // English story content
  tags: string[];              // Tags array
  created_at?: string;         // Timestamp
};

const PAGE_SIZE = 50;

export default function AdminDashboard() {
  const router = useRouter();

  // STATE
  const supabase = createSupabaseBrowserClient();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination, Search, Sort
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Month Filter State
  const [monthFilter, setMonthFilter] = useState("");
  
  // Sorting State
  const [sortCol, setSortCol] = useState<string>("story_id");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  
  // Modals
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // CHECK AUTH
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
    };
    checkUser();
  }, [router]);

  // FETCH DATA
  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("stories")
        .select("*", { count: 'exact' });

      // MONTH FILTER
      if (monthFilter) {
        query = query.ilike('date_en', `%${monthFilter}%`);
      }

      // SMART SEARCH LOGIC
      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        
        // 1. EXACT ID MATCH: If pattern is AdXXXX or Ad1-XXXX, search ONLY story_id
        const idPattern = /^Ad\d+-?\d*$/i;
        if (idPattern.test(term)) {
          // Normalize to uppercase to match database format (Ad0001)
          const normalizedId = term.charAt(0).toUpperCase() + term.charAt(1).toLowerCase() + term.slice(2);
          // Exact match in story_id column only
          query = query.eq('story_id', normalizedId);
        } 
        // 2. MULTI-WORD SEARCH: Use AND logic (all words must be present)
        else if (term.includes(' ')) {
          const words = term.split(/\s+/).filter(w => w.length > 0);
          
          // For AND logic with Supabase, we need to chain .or() calls
          // Each word must appear in at least one column
          words.forEach(word => {
            query = query.or(`title_en.ilike.%${word}%,title_he.ilike.%${word}%,body_en.ilike.%${word}%,body_he.ilike.%${word}%,story_id.ilike.%${word}%,rabbi_en.ilike.%${word}%,rabbi_he.ilike.%${word}%`);
          });
        }
        // 3. SINGLE WORD: Search across all columns (OR logic)
        else {
          query = query.or(`title_en.ilike.%${term}%,title_he.ilike.%${term}%,body_en.ilike.%${term}%,body_he.ilike.%${term}%,story_id.ilike.%${term}%,rabbi_en.ilike.%${term}%,rabbi_he.ilike.%${term}%`);
        }
      }

      // FIX: Dynamic Sorting
      // Date sorting now uses date_en for simple numeric sorting
      query = query.order(sortCol, { ascending: sortAsc });

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setStories(data || []);
      setTotalCount(count || 0);

    } catch (error: any) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, monthFilter, sortCol, sortAsc]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // HANDLERS
  const handleSearch = () => {
    setPage(1); // Reset to page 1 when searching
    fetchStories();
  };

  const handleSort = (col: string) => {
    if (col === sortCol) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleDeleteStory = async (story: Story) => {
    if (!confirm(`Are you sure you want to delete story ${story.story_id}?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('story_id', story.story_id);

      if (error) throw error;

      // Show success and refresh
      alert(`Story ${story.story_id} deleted successfully!`);
      fetchStories();
    } catch (error: any) {
      alert(`Error deleting story: ${error.message}`);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-10 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Dashboard</h1>
          <p className="text-gray-500 mt-1">Total Stories: <b>{totalCount}</b></p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
          <Button variant="outline" onClick={() => setIsBulkEditOpen(true)} className="border-purple-200 text-purple-700 hover:bg-purple-50">
            <Users className="mr-2 h-4 w-4" /> Bulk Edit Rabbis
          </Button>
          <Button variant="outline" onClick={() => setIsBulkDeleteOpen(true)} className="border-red-200 text-red-700 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" /> Bulk Delete
          </Button>
          <Button onClick={() => setIsUploadOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Upload Batch
          </Button>
        </div>
      </div>

      {/* Search + Month Filter */}
      <div className="flex gap-2 mb-6 max-w-2xl">
          <select
            value={monthFilter}
            onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
            className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Months</option>
            <option value="Nissan">Nissan / ניסן</option>
            <option value="Iyar">Iyar / אייר</option>
            <option value="Sivan">Sivan / סיון</option>
            <option value="Tamuz">Tamuz / תמוז</option>
            <option value="Av">Av / אב</option>
            <option value="Elul">Elul / אלול</option>
            <option value="Tishrei">Tishrei / תשרי</option>
            <option value="Cheshvan">Cheshvan / חשון</option>
            <option value="Kislev">Kislev / כסלו</option>
            <option value="Tevet">Tevet / טבת</option>
            <option value="Shevat">Shevat / שבט</option>
            <option value="Adar">Adar / אדר</option>
          </select>
          <Input 
            placeholder="Search in Title, Body, or ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-white"
          />
          <Button variant="secondary" onClick={handleSearch}>
              <Search className="h-4 w-4" />
          </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/80">
            <TableRow>
              {/* Sortable Headers */}
              <TableHead onClick={() => handleSort('story_id')} className="cursor-pointer hover:bg-gray-100 w-[100px]">
                  <div className="flex items-center gap-1">ID <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead onClick={() => handleSort('date_he')} className="cursor-pointer hover:bg-gray-100 w-[130px]">
                  <div className="flex items-center gap-1">Hebrew Date <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead onClick={() => handleSort('date_en')} className="cursor-pointer hover:bg-gray-100 w-[130px]">
                  <div className="flex items-center gap-1">English Date <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="w-[150px] text-right" dir="rtl">Rabbi (HE)</TableHead>
              <TableHead className="w-[150px]">Rabbi (EN)</TableHead>
              <TableHead onClick={() => handleSort('title_en')} className="cursor-pointer hover:bg-gray-100 w-[25%]">
                  <div className="flex items-center gap-1">Title (EN) <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="w-[25%] text-right">Title (HE)</TableHead>
              <TableHead className="text-center w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                        <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                    </TableCell>
                </TableRow>
            ) : stories.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-gray-500">No stories found.</TableCell>
                </TableRow>
            ) : (
                stories.map((story) => (
                <TableRow key={story.story_id} className="hover:bg-blue-50/30">
                    <TableCell className="font-mono text-xs">{story.story_id}</TableCell>
                    <TableCell className="font-serif text-lg" dir="rtl">{story.date_he}</TableCell>
                    <TableCell className="font-medium">{story.date_en}</TableCell>
                    <TableCell className="text-right font-serif text-lg" dir="rtl">
                        <div className="max-w-[200px] truncate ml-auto">
                            {story.rabbi_he || <span className="text-gray-400 text-sm">—</span>}
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate">
                            {story.rabbi_en || <span className="text-gray-400 text-sm">—</span>}
                        </div>
                    </TableCell>
                    <TableCell>
                        <div className="max-w-[300px] truncate" title={story.title_en || ""}>
                            {story.title_en || <span className="text-red-300 italic text-xs">Missing</span>}
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-serif text-lg">
                        <div className="max-w-[300px] truncate ml-auto" dir="rtl" title={story.title_he || ""}>
                            {story.title_he || <span className="text-red-300 italic text-sm">---</span>}
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedStory(story); setIsEditOpen(true); }}>
                                <Pencil className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteStory(story)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </div>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
             <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages || 1}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
        </div>
      </div>

      <EditStoryModal 
        story={selectedStory} isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} onSaved={fetchStories} 
      />
      <UploadBatchModal 
        isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} 
        onSuccess={fetchStories} 
      />
      <BulkEditRabbiModal
        isOpen={isBulkEditOpen}
        onClose={() => setIsBulkEditOpen(false)}
        onSuccess={fetchStories}
      />
      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onSuccess={fetchStories}
      />
    </div>
  );
}