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
import { Pencil, LogOut, ChevronLeft, ChevronRight, Search, Plus, Loader2, ArrowUpDown, Users, Trash2, Download } from "lucide-react";
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
  const [isExporting, setIsExporting] = useState(false);
  
  // Pagination, Search, Sort
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [exactMatch, setExactMatch] = useState(false);
  
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
        
        // Helper to strip Hebrew Nikud (vocalization marks)
        const stripNikud = (text: string) => text.replace(/[\u0591-\u05C7]/g, '');
        const cleanTerm = stripNikud(term);
        
        // 1. EXACT ID MATCH: If pattern is AdXXXX or Ad1-XXXX, search ONLY story_id
        const idPattern = /^Ad\d+-?\d*$/i;
        if (idPattern.test(term)) {
          // Normalize to uppercase to match database format (Ad0001)
          const normalizedId = term.charAt(0).toUpperCase() + term.charAt(1).toLowerCase() + term.slice(2);
          // Exact match in story_id column only
          query = query.eq('story_id', normalizedId);
        } 
        // 2. MULTI-WORD SEARCH: Use AND logic (all words must be present) unless exactMatch is checked
        else if (term.includes(' ') && !exactMatch) {
          const words = term.split(/\s+/).filter(w => w.length > 0);
          
          // For AND logic with Supabase, we need to chain .or() calls
          // Each word must appear in at least one column
          words.forEach(word => {
            const cleanWord = stripNikud(word);
            query = query.or(`title_en.ilike.%${word}%,title_he.ilike.%${word}%,title_he_clean.ilike.%${cleanWord}%,body_en.ilike.%${word}%,body_he.ilike.%${word}%,body_he_clean.ilike.%${cleanWord}%,tags.cs.{"${word}"},tags.cs.{"${cleanWord}"},story_id.ilike.%${word}%,rabbi_en.ilike.%${word}%,rabbi_he.ilike.%${word}%,date_en.ilike.%${word}%,date_he.ilike.%${word}%`);
          });
        }
        // 3. SINGLE WORD OR EXACT PHRASE: Search across all columns (OR logic)
        else {
          if (exactMatch && !term.includes(' ')) {
            // WORD BOUNDARY MODE: match whole words only
            // Matches: word at start, word in middle (space-padded), word at end, word is entire field
            const wb = (col: string, t: string) =>
              `${col}.ilike.${t} %,${col}.ilike.% ${t} %,${col}.ilike.% ${t},${col}.eq.${t}`;
            const cols = ['title_en', 'body_en', 'rabbi_en', 'rabbi_he', 'date_en'];
            const colsClean = ['title_he_clean', 'body_he_clean', 'title_he', 'body_he'];
            const orParts = [
              ...cols.map(c => wb(c, term)),
              ...colsClean.map(c => wb(c, cleanTerm)),
              `tags.cs.{"${term}"}`,
              `tags.cs.{"${cleanTerm}"}`,
              `story_id.eq.${term}`,
            ].join(',');
            query = query.or(orParts);
          } else {
            // SUBSTRING MODE (default): match anywhere in the text
            query = query.or(`title_en.ilike.%${term}%,title_he.ilike.%${term}%,title_he_clean.ilike.%${cleanTerm}%,body_en.ilike.%${term}%,body_he.ilike.%${term}%,body_he_clean.ilike.%${cleanTerm}%,tags.cs.{"${term}"},tags.cs.{"${cleanTerm}"},story_id.ilike.%${term}%,rabbi_en.ilike.%${term}%,rabbi_he.ilike.%${term}%,date_en.ilike.%${term}%,date_he.ilike.%${term}%`);
          }
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
  }, [page, searchTerm, exactMatch, monthFilter, sortCol, sortAsc]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // HANDLERS
  const handleSearch = () => {
    setPage(1); // Reset to page 1 when searching
    fetchStories();
  };

  // EXPORT TO CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Helper to strip Hebrew Nikud
      const stripNikud = (text: string) => text.replace(/[\u0591-\u05C7]/g, '');

      // Fetch all matching stories in pages of 1,000 to bypass Supabase default limit
      let allStories: any[] = [];
      let from = 0;
      const CHUNK_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        let chunkQuery = supabase
          .from('stories')
          .select('story_id, date_en, date_he, rabbi_en, rabbi_he, title_en, title_he, body_en, body_he');

        if (monthFilter) {
          chunkQuery = chunkQuery.ilike('date_en', `%${monthFilter}%`);
        }

        if (searchTerm.trim()) {
          const term = searchTerm.trim();
          const cleanTerm = stripNikud(term);
          const idPattern = /^Ad\d+-?\d*$/i;
          if (idPattern.test(term)) {
            const normalizedId = term.charAt(0).toUpperCase() + term.charAt(1).toLowerCase() + term.slice(2);
            chunkQuery = chunkQuery.eq('story_id', normalizedId);
          } else if (term.includes(' ') && !exactMatch) {
            const words = term.split(/\s+/).filter(w => w.length > 0);
            words.forEach(word => {
              const cleanWord = stripNikud(word);
              chunkQuery = chunkQuery.or(`title_en.ilike.%${word}%,title_he.ilike.%${word}%,title_he_clean.ilike.%${cleanWord}%,body_en.ilike.%${word}%,body_he.ilike.%${word}%,body_he_clean.ilike.%${cleanWord}%,tags.cs.{"${word}"},tags.cs.{"${cleanWord}"},story_id.ilike.%${word}%,rabbi_en.ilike.%${word}%,rabbi_he.ilike.%${word}%`);
            });
          } else {
            if (exactMatch && !term.includes(' ')) {
              const wb = (col: string, t: string) =>
                `${col}.ilike.${t} %,${col}.ilike.% ${t} %,${col}.ilike.% ${t},${col}.eq.${t}`;
              const cols = ['title_en', 'body_en', 'rabbi_en', 'rabbi_he', 'date_en'];
              const colsClean = ['title_he_clean', 'body_he_clean', 'title_he', 'body_he'];
              const orParts = [
                ...cols.map(c => wb(c, term)),
                ...colsClean.map(c => wb(c, cleanTerm)),
                `tags.cs.{"${term}"}`,
                `tags.cs.{"${cleanTerm}"}`,
                `story_id.eq.${term}`,
              ].join(',');
              chunkQuery = chunkQuery.or(orParts);
            } else {
              chunkQuery = chunkQuery.or(`title_en.ilike.%${term}%,title_he.ilike.%${term}%,title_he_clean.ilike.%${cleanTerm}%,body_en.ilike.%${term}%,body_he.ilike.%${term}%,body_he_clean.ilike.%${cleanTerm}%,tags.cs.{"${term}"},tags.cs.{"${cleanTerm}"},story_id.ilike.%${term}%,rabbi_en.ilike.%${term}%,rabbi_he.ilike.%${term}%`);
            }
          }
        }

        chunkQuery = chunkQuery.order(sortCol, { ascending: sortAsc });
        const { data: chunk, error } = await chunkQuery.range(from, from + CHUNK_SIZE - 1);

        if (error) throw error;
        if (!chunk || chunk.length === 0) {
          hasMore = false;
        } else {
          allStories = allStories.concat(chunk);
          if (chunk.length < CHUNK_SIZE) {
            hasMore = false;
          } else {
            from += CHUNK_SIZE;
          }
        }
      }

      if (allStories.length === 0) {
        alert('No results to export.');
        return;
      }

      // Build CSV with UTF-8 BOM for Hebrew support in Excel
      const headers = ['ID', 'Date (EN)', 'Date (HE)', 'Rabbi (EN)', 'Rabbi (HE)', 'Title (EN)', 'Title (HE)', 'Body (EN)', 'Body (HE)'];
      const escapeCell = (val: any) => {
        if (val == null) return '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const rows = allStories.map(s => [
        escapeCell(s.story_id),
        escapeCell(s.date_en),
        escapeCell(s.date_he),
        escapeCell(s.rabbi_en),
        escapeCell(s.rabbi_he),
        escapeCell(s.title_en),
        escapeCell(s.title_he),
        escapeCell(s.body_en),
        escapeCell(s.body_he),
      ].join(','));

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `sipuraya_${searchTerm || monthFilter || 'all'}_${new Date().toISOString().slice(0,10)}.csv`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
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
          <div className="flex items-center gap-2">
            <Input 
              placeholder="Search in Title, Body, or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-white min-w-[250px]"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap bg-white border border-gray-200 px-3 py-2 rounded-md">
              <input 
                type="checkbox" 
                checked={exactMatch} 
                onChange={(e) => setExactMatch(e.target.checked)} 
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Exact Phrase
            </label>
          </div>
          <Button variant="secondary" onClick={handleSearch}>
              <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="border-green-200 text-green-700 hover:bg-green-50 whitespace-nowrap"
          >
            {isExporting
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</>
              : <><Download className="mr-2 h-4 w-4" /> Export CSV</>
            }
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
              <TableHead onClick={() => handleSort('date_en')} className="cursor-pointer hover:bg-gray-100 w-[130px]">
                  <div className="flex items-center gap-1">English Date <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead onClick={() => handleSort('date_he')} className="cursor-pointer hover:bg-gray-100 w-[130px]">
                  <div className="flex items-center gap-1">Hebrew Date <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="w-[150px]">Rabbi (EN)</TableHead>
              <TableHead className="w-[150px] text-right" dir="rtl">Rabbi (HE)</TableHead>
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
                    <TableCell className="font-medium">{story.date_en}</TableCell>
                    <TableCell className="font-serif text-lg" dir="rtl">{story.date_he}</TableCell>
                    <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate">
                            {story.rabbi_en || <span className="text-gray-400 text-sm">—</span>}
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-serif text-lg" dir="rtl">
                        <div className="max-w-[200px] truncate ml-auto">
                            {story.rabbi_he || <span className="text-gray-400 text-sm">—</span>}
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