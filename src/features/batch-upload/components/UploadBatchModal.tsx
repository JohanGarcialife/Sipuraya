"use client";

import { useState } from "react";
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
      setStatus("⚠️ Please select a spreadsheet (.xlsx) file.");
      return;
    }
    if (mode === "docx" && !fileHe) {
      setStatus("⚠️ Please select at least the Hebrew file.");
      return;
    }

    setLoading(true);
    setStatus("Processing... This may take a minute.");

    try {
      const formData = new FormData();
      if (mode === "xlsx" && fileXlsx) {
        formData.append("fileXlsx", fileXlsx);
      } else {
        if (fileEn) formData.append("fileEn", fileEn);
        formData.append("fileHe", fileHe!);
      }

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
          setFileXlsx(null);
          setFileEn(null);
          setFileHe(null);
        }, 2500);
      } else {
        setStatus(`❌ Error: ${data.error}`);
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
            Choose your upload method. Spreadsheet is recommended for reliability.
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
            Spreadsheet (.xlsx)
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
              <Label htmlFor="file-xlsx">Merged Spreadsheet (.xlsx)</Label>
              <Input
                id="file-xlsx"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFileXlsx(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500">
                Required columns: Story ID, Rabbi (English), Rabbi (Hebrew), Date (English), Date (Hebrew), Title (English), Title (Hebrew), Content (English), Content (Hebrew)
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
