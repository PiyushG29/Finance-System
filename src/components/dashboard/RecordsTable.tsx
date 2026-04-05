import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Search, CalendarIcon, X, Pencil, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type FinancialRecord = Tables<"financial_records">;

const CATEGORIES = ["salary", "freelance", "investment", "food", "transport", "utilities", "entertainment", "healthcare", "education", "other"];

export default function RecordsTable() {
  const { isAdmin, isAnalyst } = useAuth();
  const canManageRecords = isAdmin || isAnalyst;
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<string>("income");
  const [editCategory, setEditCategory] = useState("other");
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [exporting, setExporting] = useState(false);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["financial-records", typeFilter, categoryFilter, search, dateFilter?.toISOString(), page],
    queryFn: async () => {
      let query = supabase
        .from("financial_records")
        .select("*", { count: "exact" })
        .is("deleted_at", null)
        .order("record_date", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (search.trim()) query = query.ilike("notes", `%${search.trim()}%`);
      if (dateFilter) query = query.eq("record_date", format(dateFilter, "yyyy-MM-dd"));

      const { data, error, count } = await query;
      if (error) throw error;
      return { records: data ?? [], totalCount: count ?? 0 };
    },
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_records")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record deleted");
      queryClient.invalidateQueries({ queryKey: ["financial-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trends"] });
      queryClient.invalidateQueries({ queryKey: ["category-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateRecord = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const parsedAmount = parseFloat(editAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");

      const { error } = await supabase
        .from("financial_records")
        .update({
          amount: parsedAmount,
          type: editType,
          category: editCategory,
          record_date: editDate,
          notes: editNotes.trim() || null,
        })
        .eq("id", id)
        .is("deleted_at", null);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Record updated");
      closeEditDialog();
      queryClient.invalidateQueries({ queryKey: ["financial-records"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-trends"] });
      queryClient.invalidateQueries({ queryKey: ["category-summary"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openEditDialog = (record: FinancialRecord) => {
    setEditingRecord(record);
    setEditAmount(String(record.amount));
    setEditType(record.type);
    setEditCategory(record.category);
    setEditDate(record.record_date);
    setEditNotes(record.notes ?? "");
  };

  const closeEditDialog = () => {
    setEditingRecord(null);
    setEditAmount("");
    setEditType("income");
    setEditCategory("other");
    setEditDate("");
    setEditNotes("");
  };

  const fetchFilteredRecordsForExport = async () => {
    const allRecords: FinancialRecord[] = [];
    const batchSize = 1000;
    let from = 0;

    while (true) {
      let query = supabase
        .from("financial_records")
        .select("*")
        .is("deleted_at", null)
        .order("record_date", { ascending: false })
        .range(from, from + batchSize - 1);

      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);
      if (search.trim()) query = query.ilike("notes", `%${search.trim()}%`);
      if (dateFilter) query = query.eq("record_date", format(dateFilter, "yyyy-MM-dd"));

      const { data: batch, error } = await query;
      if (error) throw error;

      const records = batch ?? [];
      allRecords.push(...records);
      if (records.length < batchSize) break;

      from += batchSize;
    }

    return allRecords;
  };

  const downloadTextFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const records = await fetchFilteredRecordsForExport();
      if (!records.length) {
        toast.info("No records found to export");
        return;
      }

      const headers = ["Date", "Type", "Category", "Amount", "Notes"];
      const rows = records.map((r) => [
        r.record_date,
        r.type,
        r.category,
        Number(r.amount).toFixed(2),
        r.notes ?? "",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => escapeCsv(String(cell))).join(","))
        .join("\n");

      downloadTextFile(csv, `financial-records-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`, "text/csv;charset=utf-8;");
      toast.success("CSV exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const records = await fetchFilteredRecordsForExport();
      if (!records.length) {
        toast.info("No records found to export");
        return;
      }

      const headers = ["Date", "Type", "Category", "Amount", "Notes"];
      const rows = records.map((r) => [
        r.record_date,
        r.type,
        r.category,
        Number(r.amount).toFixed(2),
        (r.notes ?? "").replace(/[\t\n\r]+/g, " "),
      ]);

      const tsv = [headers, ...rows].map((row) => row.join("\t")).join("\n");
      downloadTextFile(tsv, `financial-records-${format(new Date(), "yyyyMMdd-HHmmss")}.xls`, "application/vnd.ms-excel;charset=utf-8;");
      toast.success("Excel file exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export Excel file");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil((data?.totalCount ?? 0) / pageSize);

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Financial Records</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-8 w-40"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {["salary","freelance","investment","food","transport","utilities","entertainment","healthcare","education","other"].map(c => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("w-36 justify-start text-left font-normal", !dateFilter && "text-muted-foreground")}>
                  <CalendarIcon className="mr-1 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "MMM d, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFilter} onSelect={(d) => { setDateFilter(d); setPage(0); }} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {dateFilter && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDateFilter(undefined); setPage(0); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {canManageRecords && (
              <>
                <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : !data?.records.length ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            No records found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    {canManageRecords && <TableHead className="w-28 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{format(new Date(r.record_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={r.type === "income" ? "default" : "destructive"} className="text-xs">
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{r.category}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${r.type === "income" ? "text-accent" : "text-destructive"}`}>
                        {r.type === "income" ? "+" : "-"}₹{Number(r.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-48 truncate">{r.notes || "—"}</TableCell>
                      {canManageRecords && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(r)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => softDelete.mutate(r.id)}
                                disabled={softDelete.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages} ({data.totalCount} records)
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={!!editingRecord} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Financial Record</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingRecord) return;
              updateRecord.mutate({ id: editingRecord.id });
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" step="0.01" min="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editType} onValueChange={setEditType}>
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
                <Select value={editCategory} onValueChange={setEditCategory}>
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
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Optional notes..." maxLength={500} />
            </div>

            <Button type="submit" className="w-full" disabled={updateRecord.isPending}>
              {updateRecord.isPending ? "Updating..." : "Update Record"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
