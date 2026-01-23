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
import { UploadCloud, Loader2 } from "lucide-react";

interface UploadBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadBatchModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadBatchModalProps) {
  const [fileEn, setFileEn] = useState<File | null>(null);
  const [fileHe, setFileHe] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (!fileEn || !fileHe) {
      setStatus("⚠️ Please select both files.");
      return;
    }

    setLoading(true);
    setStatus("Processing... This may take a minute.");

    const formData = new FormData();
    formData.append("fileEn", fileEn);
    formData.append("fileHe", fileHe);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Success! ${data.message}`);
        setTimeout(() => {
          onSuccess(); // Refresh parent
          onClose();
          setStatus("");
          setFileEn(null);
          setFileHe(null);
        }, 2000);
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      setStatus("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Upload (The Zipper)</DialogTitle>
          <DialogDescription>
            Upload the English and Hebrew files (.docx or .pdf). The system will
            merge them automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file-en">English File</Label>
            <Input
              id="file-en"
              type="file"
              accept=".docx,.pdf"
              onChange={(e) => setFileEn(e.target.files?.[0] || null)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="file-he">Hebrew File</Label>
            <Input
              id="file-he"
              type="file"
              accept=".docx,.pdf"
              onChange={(e) => setFileHe(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        {status && (
          <div
            className={`rounded p-2 text-center text-sm ${status.includes("Error") ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}
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
            {loading ? "Ingesting..." : "Start Ingestion"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
