import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const CATEGORIES = ["salary", "freelance", "investment", "food", "transport", "utilities", "entertainment", "healthcare", "education", "other"];

export default function RecordForm() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<string>("income");
  const [category, setCategory] = useState("other");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("financial_records").insert({
        user_id: user.id,
        amount: parsedAmount,
        type,
        category,
        record_date: recordDate,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record created!");
      queryClient.invalidateQueries({ queryKey: ["financial-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trends"] });
      queryClient.invalidateQueries({ queryKey: ["category-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      setOpen(false);
      setAmount("");
      setNotes("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Record</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Financial Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." maxLength={500} />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Record"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
