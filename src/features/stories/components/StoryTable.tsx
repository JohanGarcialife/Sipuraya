// ...existing code...
"use client";

import { Story } from "../types";
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
            <TableHead className="w-[120px]">Hebrew Date</TableHead>
            <TableHead className="w-[120px]">English Date</TableHead>
            <TableHead>Rabbi (HE)</TableHead>
            <TableHead>Rabbi (EN)</TableHead>
            <TableHead>Title (EN)</TableHead>
            <TableHead className="text-right">Title (HE)</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stories.map((story) => (
            <TableRow key={story.story_id}>
              <TableCell className="font-medium">{story.story_id}</TableCell>
              <TableCell className="font-hebrew">{story.date_he}</TableCell>
              <TableCell>{story.date_en}</TableCell>
              <TableCell 
                className="max-w-[150px] truncate font-hebrew"
                title={story.rabbi_he || ""}
              >
                {story.rabbi_he || "---"}
              </TableCell>
              <TableCell 
                className="max-w-[150px] truncate"
                title={story.rabbi_en || ""}
              >
                {story.rabbi_en || "---"}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate"
                title={story.title_en || ""}
              >
                {story.title_en || "Untitled"}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate text-right font-hebrew"
                title={story.title_he || ""}
              >
                {story.title_he || "---"}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <Pencil className="h-4 w-4 cursor-pointer" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
