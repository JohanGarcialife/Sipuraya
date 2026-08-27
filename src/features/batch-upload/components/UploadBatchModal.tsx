"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileSpreadsheet, FileText } from "lucide-react";

interface UploadBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadMode = "xlsx" | "docx";

function cleanId(id: any): string | null {
  if (!id) return null;
  const match = String(id).match(/([A-Za-z]+)(\d+)/);
  if (!match) return String(id).trim().toUpperCase();

  let prefix = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  if (prefix === 'Ly') prefix = 'Iy';

  const num = parseInt(match[2], 10);
  return `${prefix}${num.toString().padStart(4, '0')}`;
}

export default function UploadBatchModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadBatchModalProps) {
  const [mode, setMode] = useState<UploadMode>("xlsx");
  const [fileXlsx, setFileXlsx] = useState<File | null>(null);
  const [fileEn, setFileEn] = useState<File | null>(null);
  const [fileHe, setFileHe] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (mode === "xlsx" && !fileXlsx) {
      setStatus("⚠️ Please select a spreadsheet (.xlsx or .csv) file.");
      return;
    }
    if (mode === "docx" && !fileHe) {
      setStatus("⚠️ Please select at least the Hebrew file.");
      return;
    }

    setLoading(true);
    setStatus("Reading file...");

    try {
      if (mode === "xlsx" && fileXlsx) {
        // === CLIENT-SIDE PARSE & CHUNKED BATCH UPLOAD ===
        // Prevents Vercel 4.5MB payload limit (FUNCTION_PAYLOAD_TOO_LARGE) and timeouts
        const arrayBuffer = await fileXlsx.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const records: any[] = XLSX.utils.sheet_to_json(ws);

        if (!records || records.length === 0) {
          throw new Error("No data found in the spreadsheet. Please verify the file content.");
        }

        const storiesMap = new Map<string, any>();

        records.forEach((row) => {
          const rawId = row["ID"] || row["Story ID"] || row["story_id"] || row["Id"] || row["id"];
          if (!rawId) return;
          const id = cleanId(rawId);
          if (!id) return;

          const dateEn = String(row["Date (EN)"] || row["Date (English)"] || row["date_en"] || row["English Date"] || "").trim() || null;
          const dateHe = String(row["Date (HE)"] || row["Hebrew Date"] || row["Date (Hebrew)"] || row["date_he"] || "").trim() || null;
          const rabbiEn = String(row["Rabbi (EN)"] || row["Rabbi (English)"] || row["rabbi_en"] || "").trim() || null;
          const rabbiHe = String(row["Rabbi (HE)"] || row["Rabbi (Hebrew)"] || row["rabbi_he"] || "").trim() || null;
          const titleEn = String(row["Title (EN)"] || row["Title (English)"] || row["title_en"] || "").trim() || null;
          const titleHe = String(row["Title (HE)"] || row["Title (Hebrew)"] || row["title_he"] || "").trim() || null;
          const bodyEn = String(row["Body (EN)"] || row["Story Text (English)"] || row["Content (English)"] || row["content_en"] || row["body_en"] || "").trim() || null;
          const bodyHe = String(row["Body (HE)"] || row["Story Text (Hebrew)"] || row["Content (Hebrew)"] || row["content_he"] || row["body_he"] || "").trim() || null;

          storiesMap.set(id, {
            story_id: id,
            date_en: dateEn,
            date_he: dateHe,
            rabbi_en: rabbiEn,
            rabbi_he: rabbiHe,
            title_en: titleEn,
            title_he: titleHe,
            body_en: bodyEn,
            body_he: bodyHe,
            is_published: true,
          });
        });

        const storiesList = Array.from(storiesMap.values());
        if (storiesList.length === 0) {
          throw new Error("Could not extract valid stories. Please check that the file has a Story ID / ID column.");
        }

        const BATCH_SIZE = 50;
        let uploaded = 0;

        for (let i = 0; i < storiesList.length; i += BATCH_SIZE) {
          const batch = storiesList.slice(i, i + BATCH_SIZE);
          const percent = Math.round((i / storiesList.length) * 100);
          setStatus(`Uploading: ${uploaded} / ${storiesList.length} stories (${percent}%)...`);

          const res = await fetch("/api/ingest/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stories: batch }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: "Server error" }));
            throw new Error(`Batch upload failed at index ${i}: ${errData.error || res.statusText}`);
          }

          uploaded += batch.length;
        }

        setStatus(`✅ Success! Imported and updated ${uploaded} stories.`);
        setTimeout(() => {
          onSuccess();
          onClose();
          setStatus("");
          setFileXlsx(null);
        }, 2000);

      } else {
        // === DOCX / PDF UPLOAD PATH ===
        const formData = new FormData();
        if (fileEn) formData.append("fileEn", fileEn);
        formData.append("fileHe", fileHe!);

        const res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });

        const text = await res.text();
        let data;

        if (text && text.includes("<!DOCTYPE html>")) {
          throw new Error("Server Timeout (504): The files are too large or processing took too long.");
        }

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Invalid Server Response: ${text.substring(0, 50)}...`);
        }

        if (res.ok) {
          setStatus(`✅ Success! ${data.message}`);
          setTimeout(() => {
            onSuccess();
            onClose();
            setStatus("");
            setFileEn(null);
            setFileHe(null);
          }, 2500);
        } else {
          setStatus(`❌ Error: ${data.error}`);
        }
      }
    } catch (e: any) {
      setStatus(`❌ Error: ${e.message || "Unknown error occurred"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Stories</DialogTitle>
          <DialogDescription>
            Choose your upload method. Spreadsheet (.xlsx or .csv) is recommended for reliability.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selector */}
        <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mode === "xlsx" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setMode("xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Spreadsheet (.xlsx / .csv)
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              mode === "docx" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setMode("docx")}
          >
            <FileText className="h-4 w-4" />
            Word Docs (.docx)
          </button>
        </div>

        <div className="grid gap-4 py-2">
          {mode === "xlsx" ? (
            <div className="grid gap-2">
              <Label htmlFor="file-xlsx">Spreadsheet (.xlsx or .csv)</Label>
              <Input
                id="file-xlsx"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFileXlsx(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Supports .xlsx and .csv files of any size with automatic chunked upload.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="file-en">English File (Optional)</Label>
                <Input
                  id="file-en"
                  type="file"
                  accept=".docx,.pdf"
                  onChange={(e) => setFileEn(e.target.files?.[0] || null)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="file-he">Hebrew File (Required)</Label>
                <Input
                  id="file-he"
                  type="file"
                  accept=".docx,.pdf"
                  onChange={(e) => setFileHe(e.target.files?.[0] || null)}
                />
              </div>
            </>
          )}
        </div>

        {status && (
          <div
            className={`rounded p-2 text-center text-sm ${
              status.includes("Error") || status.includes("⚠️")
                ? "bg-red-50 text-red-600"
                : status.includes("✅")
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            {status}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Importing..." : "Import Stories"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
