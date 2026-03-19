import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

const MONTHS = [
  { label: "Nissan / ניסן",    prefix: "Ni" },
  { label: "Iyar / אייר",      prefix: "Iy" },
  { label: "Sivan / סיון",     prefix: "Si" },
  { label: "Tammuz / תמוז",    prefix: "Ta" },
  { label: "Av / אב",          prefix: "Av" },
  { label: "Elul / אלול",      prefix: "El" },
  { label: "Tishrei / תשרי",   prefix: "Ti" },
  { label: "Cheshvan / חשון",  prefix: "Ch" },
  { label: "Kislev / כסלו",    prefix: "Ki" },
  { label: "Tevet / טבת",      prefix: "Te" },
  { label: "Shevat / שבט",     prefix: "Sh" },
  { label: "Adar / אדר",       prefix: "Ad" },
];

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkDeleteModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkDeleteModalProps) {
  const [selectedPrefix, setSelectedPrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const selectedMonth = MONTHS.find((m) => m.prefix === selectedPrefix);

  const handleDelete = async () => {
    setError("");
    setSuccessMsg("");

    if (!selectedPrefix) {
      setError("Please select a month to delete.");
      return;
    }

    if (
      !confirm(
        `DANGER ZONE:\n\nAre you sure you want to delete ALL ${selectedMonth?.label} stories?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/stories/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: selectedPrefix }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete stories");
      }

      setSuccessMsg(`✅ ${data.message}`);

      setTimeout(() => {
        onSuccess();
        onClose();
        setSelectedPrefix("");
        setSuccessMsg("");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-red-200">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600 gap-2">
            <Trash2 className="h-5 w-5" /> Bulk Delete Stories
          </DialogTitle>
          <DialogDescription>
            Select a Hebrew month to delete <strong>all</strong> stories for
            that month. This is useful before re-uploading a batch.
            <br />
            <span className="font-bold text-red-500 flex items-center gap-1 mt-2">
              <AlertTriangle className="h-4 w-4" /> This action cannot be
              undone!
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="month-select">Select Month</Label>
            <select
              id="month-select"
              value={selectedPrefix}
              onChange={(e) => setSelectedPrefix(e.target.value)}
              className="bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">-- Choose a month --</option>
              {MONTHS.map((m) => (
                <option key={m.prefix} value={m.prefix}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {selectedPrefix && (
            <p className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
              This will delete <strong>every story</strong> whose ID starts with{" "}
              <code className="font-mono font-bold">{selectedPrefix}</code>{" "}
              (e.g. {selectedPrefix}0001, {selectedPrefix}0002 … all of them).
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-md text-center font-medium">
            {successMsg}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !!successMsg || !selectedPrefix}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {loading ? "Deleting..." : `Delete All ${selectedMonth?.label.split(" / ")[0] ?? ""} Stories`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
