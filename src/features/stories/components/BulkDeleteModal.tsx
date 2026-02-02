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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

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
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleDelete = async () => {
    setError("");
    setSuccessMsg("");

    if (!startId || !endId) {
      setError("Please enter both Start ID and End ID.");
      return;
    }

    if (!confirm(`DANGER ZONE:\n\nAre you sure you want to delete ALL stories from ${startId} to ${endId}?\n\nThis action cannot be undone.`)) {
        return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/stories/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startId, endId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete stories");
      }

      setSuccessMsg(`✅ ${data.message}`);
      
      setTimeout(() => {
        onSuccess(); // Refresh parent
        onClose();
        setStartId("");
        setEndId("");
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
            Permanently delete a range of stories by ID (e.g., Ni0001 to Ni0100).
            <br />
            <span className="font-bold text-red-500 flex items-center gap-1 mt-2">
                <AlertTriangle className="h-4 w-4" /> This action cannot be undone!
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label htmlFor="start-id">Start ID</Label>
                <Input
                  id="start-id"
                  placeholder="Ni0001"
                  value={startId}
                  onChange={(e) => setStartId(e.target.value)}
                  className="font-mono text-sm uppercase"
                />
             </div>
             <div className="grid gap-2">
                <Label htmlFor="end-id">End ID</Label>
                <Input
                  id="end-id"
                  placeholder="Ni0050"
                  value={endId}
                  onChange={(e) => setEndId(e.target.value)}
                  className="font-mono text-sm uppercase"
                />
             </div>
          </div>
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
            disabled={loading || !!successMsg}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            {loading ? "Deleting..." : "Delete Range"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
