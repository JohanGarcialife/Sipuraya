// ...existing code...
"use client";

import { Story } from "../../../lib/types/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Pencil } from "lucide-react"; // Make sure lucide-react is installed

interface StoryTableProps {
  initialStories: Story[];
}

export default function StoryTable({ initialStories }: StoryTableProps) {
  const [stories, setStories] = useState<Story[]>(initialStories);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Hebrew Date</TableHead>
            <TableHead>Title (EN)</TableHead>
            <TableHead className="text-right">Title (HE)</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stories.map((story) => (
            <TableRow key={story.id}>
              <TableCell className="font-medium">{story.external_id}</TableCell>
              <TableCell>
                {story.hebrew_day} {story.hebrew_month}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate"
                title={story.title_en || ""}
              >
                {story.title_en || "Untitled"}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate text-right"
                title={story.title_he || ""}
              >
                {story.title_he || "---"}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
