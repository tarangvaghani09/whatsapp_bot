import { useState } from "react";
import { useListFaqs, useCreateFaq, useUpdateFaq, useDeleteFaq, getListFaqsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, Tag, HelpCircle, X, AlertCircle, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusinessId } from "@/context/BusinessContext";

type FaqForm = { question: string; answer: string; keywords: string; active: boolean };
const EMPTY: FaqForm = { question: "", answer: "", keywords: "", active: true };

export default function FaqsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const businessId = useBusinessId();
  const { data, isLoading } = useListFaqs({ businessId });
  const faqs = Array.isArray(data) ? data : [];
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; question?: string }>({ open: false });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [selectedFaqIds, setSelectedFaqIds] = useState<number[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; id?: number; form: FaqForm }>({
    open: false,
    form: EMPTY,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListFaqsQueryKey({ businessId }) });

  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleFaqSelected(id: number, checked: boolean) {
    setSelectedFaqIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }

  function toggleSelectAllFiltered(checked: boolean) {
    const filteredIds = filtered.map((f) => f.id);
    setSelectedFaqIds((prev) => {
      if (checked) return [...new Set([...prev, ...filteredIds])];
      return prev.filter((id) => !filteredIds.includes(id));
    });
  }

  function openCreate() { setDialog({ open: true, form: EMPTY }); }
  function openEdit(faq: (typeof faqs)[0]) {
    setDialog({
      open: true,
      id: faq.id,
      form: {
        question: faq.question,
        answer: faq.answer,
        keywords: faq.keywords.join(", "),
        active: faq.active,
      },
    });
  }
  function closeDialog() { setDialog({ open: false, form: EMPTY }); setFormError(""); }
  function setField<K extends keyof FaqForm>(key: K, val: FaqForm[K]) {
    if (formError) setFormError("");
    setDialog((d) => ({ ...d, form: { ...d.form, [key]: val } }));
  }

  async function handleSave() {
    const { question, answer, keywords, active } = dialog.form;
    if (!question.trim() && !answer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }
    if (!question.trim()) { setFormError("Question is required."); return; }
    if (!answer.trim()) { setFormError("Answer is required."); return; }
    const kwArray = keywords.split(",").map((k) => k.trim()).filter(Boolean);

    setSaving(true);
    try {
      if (dialog.id) {
        await updateFaq.mutateAsync({ id: dialog.id, data: { question, answer, keywords: kwArray, active }, params: { businessId } });
        toast({ title: "FAQ updated successfully", variant: "success" });
      } else {
        await createFaq.mutateAsync({ data: { question, answer, keywords: kwArray, active }, params: { businessId } });
        toast({ title: "FAQ created successfully", variant: "success" });
      }
      invalidate();
      closeDialog();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.id) return;
    await deleteFaq.mutateAsync({ id: deleteConfirm.id, params: { businessId } });
    toast({ title: "FAQ deleted" });
    invalidate();
    setDeleteConfirm({ open: false });
  }

  async function handleBulkDelete() {
    if (selectedFaqIds.length === 0) return;
    for (const id of selectedFaqIds) {
      await deleteFaq.mutateAsync({ id, params: { businessId } });
    }
    toast({ title: `${selectedFaqIds.length} FAQs deleted` });
    setSelectedFaqIds([]);
    setBulkDeleteConfirm(false);
    invalidate();
  }

  const isEditing = !!dialog.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Answers matched first - no AI cost</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => toggleSelectAllFiltered(!filtered.every((f) => selectedFaqIds.includes(f.id)))}
              className="inline-flex min-h-[44px] items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              {filtered.every((f) => selectedFaqIds.includes(f.id)) ? (
                <>
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  Deselect all
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-gray-500" />
                  Select all shown ({filtered.length})
                </>
              )}
            </button>
          )}
          <button
            onClick={openCreate}
            className="group relative inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 whitespace-nowrap overflow-hidden"
          >
            <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-2xl" />
            <span className="relative flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                <Plus className="w-3.5 h-3.5" />
              </span>
              Add FAQ
            </span>
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-600 transition-colors" />
        <Input
          placeholder="Search FAQs..."
          className="pl-10 h-11 rounded-xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No FAQs yet</p>
          <p className="text-sm mt-1">Add your first FAQ to start saving AI costs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((faq) => (
            <Card
              key={faq.id}
              className={`border shadow-sm hover:shadow-md transition-all duration-150${
                selectedFaqIds.includes(faq.id)
                  ? "border-violet-300 bg-violet-50/50 ring-1 ring-violet-200"
                  : "border-gray-200 hover:border-green-300"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleFaqSelected(faq.id, !selectedFaqIds.includes(faq.id))}
                      className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
                      aria-label={selectedFaqIds.includes(faq.id) ? "Deselect FAQ" : "Select FAQ"}
                    >
                      {selectedFaqIds.includes(faq.id) ? (
                        <CheckSquare className="w-5 h-5 text-violet-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{faq.question}</p>
                      {!faq.active && <Badge variant="secondary">Inactive</Badge>}
                      <Badge variant="outline" className="text-xs">{faq.hitCount} hits</Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{faq.answer}</p>
                    {faq.keywords.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                        {faq.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="p-2 rounded-lg hover:bg-green-50 hover:text-green-600 text-gray-400 transition-colors"
                      onClick={() => openEdit(faq)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                      onClick={() => setDeleteConfirm({ open: true, id: faq.id, question: faq.question })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false })}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete this FAQ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {deleteConfirm.question && (
                <span className="block font-medium text-gray-700 mb-1">"{deleteConfirm.question}"</span>
              )}
              This will permanently remove the FAQ. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              onClick={handleDelete}
            >
              Delete FAQ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete selected FAQs?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              You are deleting {selectedFaqIds.length} selected FAQ items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedFaqIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
          <div className="w-[min(92vw,640px)] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700">
            <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
              {selectedFaqIds.length}
            </div>
              <span className="text-sm font-semibold whitespace-nowrap"> FAQs selected</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedFaqIds([])}
              className="px-3 py-1.5 rounded-xl border border-slate-500 text-slate-100 hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Deselect
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              Delete all
            </button>
              <button
                type="button"
                onClick={() => setSelectedFaqIds([])}
                aria-label="Close selection"
                className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-lg sm:rounded-2xl flex flex-col max-h-[92dvh]">
          <div className={`px-5 py-4 flex-shrink-0 ${isEditing ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-green-500 to-emerald-600"}`}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  {isEditing ? <Pencil className="w-5 h-5 text-white" /> : <HelpCircle className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">
                    {isEditing ? "Edit FAQ" : "New FAQ"}
                  </DialogTitle>
                  <p className="text-xs text-white/75 mt-0.5">
                    {isEditing ? "Update this FAQ entry" : "Add a question your customers often ask"}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="sidebar-scroll px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {formError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm font-medium leading-snug">{formError}</p>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
                <HelpCircle className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Question & Answer</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Question <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                    placeholder="e.g. What are your opening hours?"
                    value={dialog.form.question}
                    onChange={(e) => setField("question", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Answer <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    className="mt-1.5 resize-none focus-visible:ring-blue-500 focus-visible:border-blue-500"
                    rows={3}
                    placeholder="e.g. We are open Mon-Sat, 9am-8pm and Sunday 10am-6pm."
                    value={dialog.form.answer}
                    onChange={(e) => setField("answer", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
                <Tag className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bot Settings</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Keywords</Label>
                  <div className="relative mt-1.5">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-8 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                      placeholder="e.g. hours, timing, open, close"
                      value={dialog.form.keywords}
                      onChange={(e) => setField("keywords", e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    When these words appear in a message, this answer is sent automatically
                  </p>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-white rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Active</p>
                    <p className="text-xs text-gray-400">Bot will use this FAQ when active</p>
                  </div>
                  <Switch
                    checked={dialog.form.active}
                    onCheckedChange={(v) => setField("active", v)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={closeDialog}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all duration-150 shadow-sm"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${
                isEditing
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200 hover:from-blue-600 hover:to-blue-700"
                  : "bg-gradient-to-br from-green-500 to-green-600 shadow-green-200 hover:from-green-600 hover:to-green-700"
              }`}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                <><Pencil className="w-4 h-4" /> Update FAQ</>
              ) : (
                <><Plus className="w-4 h-4" /> Create FAQ</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
