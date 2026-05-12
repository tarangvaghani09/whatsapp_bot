import { useState } from "react";
import {
  useListCannedResponses,
  useCreateCannedResponse,
  useUpdateCannedResponse,
  useDeleteCannedResponse,
  getListCannedResponsesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Search, MessageSquareText, X, Sparkles, Type, AlignLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusinessId } from "@/context/BusinessContext";
import { format } from "date-fns";

type FormState = { title: string; content: string };
const EMPTY: FormState = { title: "", content: "" };

export default function CannedResponsesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const businessId = useBusinessId();

  const { data, isLoading } = useListCannedResponses({ businessId });
  const items = Array.isArray(data) ? data : [];
  const createItem = useCreateCannedResponse();
  const updateItem = useUpdateCannedResponse();
  const deleteItem = useDeleteCannedResponse();

  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; title?: string }>({ open: false });
  const [dialog, setDialog] = useState<{ open: boolean; id?: number; form: FormState }>({ open: false, form: EMPTY });
  const [formError, setFormError] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: getListCannedResponsesQueryKey({ businessId }) });

  const filtered = items.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setFormError("");
    setDialog({ open: true, form: EMPTY });
  }

  function openEdit(item: { id: number; title: string; content: string }) {
    setFormError("");
    setDialog({ open: true, id: item.id, form: { title: item.title, content: item.content } });
  }

  function closeDialog() {
    if (!saving) setDialog({ open: false, form: EMPTY });
  }

  async function handleSave() {
    const { title, content } = dialog.form;
    if (!title.trim()) { setFormError("Title is required"); return; }
    if (!content.trim()) { setFormError("Reply text is required"); return; }
    setFormError("");
    setSaving(true);
    try {
      if (dialog.id) {
        await updateItem.mutateAsync({ id: dialog.id, data: { title: title.trim(), content: content.trim() }, params: { businessId } });
        toast({ title: "Updated", description: `"${title}" has been updated.` });
      } else {
        await createItem.mutateAsync({ data: { title: title.trim(), content: content.trim() }, params: { businessId } });
        toast({ title: "Created", description: `"${title}" has been saved.` });
      }
      invalidate();
      closeDialog();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.id) return;
    try {
      await deleteItem.mutateAsync({ id: deleteConfirm.id, params: { businessId } });
      toast({ title: "Deleted", description: `"${deleteConfirm.title}" removed.` });
      invalidate();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      setDeleteConfirm({ open: false });
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Canned Responses</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-snug">Saved reply snippets for quick insertion in conversations</p>
        </div>
        <button
          onClick={openCreate}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4 flex-shrink-0" /> New snippet
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
        <Input
          placeholder="Search snippets…"
          className="pl-10 h-11 rounded-xl border-gray-200 bg-white shadow-sm focus-visible:ring-green-400 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MessageSquareText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">
            {search ? "No snippets match your search" : "No canned responses yet"}
          </p>
          <p className="text-sm mt-1">
            {search ? "Try different keywords." : "Create your first snippet to speed up customer replies."}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create first snippet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-start gap-4"
            >
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MessageSquareText className="w-4.5 h-4.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-snug">{item.content}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">Added {format(new Date(item.createdAt), "MMM d, yyyy")}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ open: true, id: item.id, title: item.title })}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md sm:rounded-2xl gap-0 [&>button]:text-white/80 [&>button:hover]:text-white [&>button]:top-3.5 [&>button]:right-4">
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <MessageSquareText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold text-white leading-tight">
                {dialog.id ? "Edit snippet" : "New canned response"}
              </DialogTitle>
              <p className="text-xs text-white/70 mt-0.5">
                {dialog.id ? "Update your saved reply" : "Save a reply to reuse in conversations"}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 pt-5 pb-4 space-y-4 bg-white">
            {/* Title field */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Type className="w-3.5 h-3.5 text-green-500" />
                Snippet title
              </label>
              <Input
                placeholder="e.g. Opening hours, Thank you, Appointment confirmed…"
                value={dialog.form.title}
                onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, title: e.target.value } }))}
                className="h-11 rounded-xl border-gray-200 bg-gray-50 focus-visible:ring-green-400 focus-visible:bg-white transition-colors placeholder:text-gray-400 text-sm"
              />
              <p className="text-[11px] text-gray-400 leading-tight">A short label so you can find it quickly in the picker</p>
            </div>

            {/* Content field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <AlignLeft className="w-3.5 h-3.5 text-green-500" />
                  Reply text
                </label>
                <span className="text-[11px] text-gray-400 tabular-nums">{dialog.form.content.length} chars</span>
              </div>
              <textarea
                rows={5}
                placeholder="The full message that will be inserted when this snippet is selected…"
                value={dialog.form.content}
                onChange={(e) => setDialog((d) => ({ ...d, form: { ...d.form, content: e.target.value } }))}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white transition-all leading-relaxed"
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                <X className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">{formError}</p>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2.5">
            <button
              onClick={closeDialog}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !dialog.form.title.trim() || !dialog.form.content.trim()}
              className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-green-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {saving ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {dialog.id ? "Save changes" : "Create snippet"}</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete snippet?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirm.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
