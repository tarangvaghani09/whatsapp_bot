import { useState } from "react";
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useGetSettings,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, Trash2, Tag, Clock, Coins, Layers, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusinessId } from "@/context/BusinessContext";

type ServiceForm = {
  name: string;
  description: string;
  price: string;
  duration: string;
  category: string;
  keywords: string;
  active: boolean;
};
const EMPTY: ServiceForm = { name: "", description: "", price: "", duration: "", category: "", keywords: "", active: true };

export default function ServicesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const businessId = useBusinessId();
  const { data, isLoading } = useListServices({ businessId });
  const { data: settings } = useGetSettings({ businessId });
  const services = Array.isArray(data) ? data : [];
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [dialog, setDialog] = useState<{ open: boolean; id?: number; form: ServiceForm }>({ open: false, form: EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; name?: string }>({ open: false });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListServicesQueryKey({ businessId }) });

  function openCreate() { setDialog({ open: true, form: EMPTY }); }
  function openEdit(s: (typeof services)[0]) {
    setDialog({
      open: true,
      id: s.id,
      form: {
        name: s.name,
        description: s.description ?? "",
        price: s.price != null ? String(s.price) : "",
        duration: s.duration != null ? String(s.duration) : "",
        category: s.category ?? "",
        keywords: (s.keywords ?? []).join(", "),
        active: s.active,
      },
    });
  }

  function closeDialog() { setDialog({ open: false, form: EMPTY }); setFormError(""); }

  function setField<K extends keyof ServiceForm>(key: K, val: ServiceForm[K]) {
    if (formError) setFormError("");
    setDialog((d) => ({ ...d, form: { ...d.form, [key]: val } }));
  }

  async function handleSave() {
    const { name, description, price, duration, category, keywords, active } = dialog.form;
    if (!name.trim()) { setFormError("Service name is required."); return; }
    const kwArray = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const data = {
      name, active, keywords: kwArray,
      ...(description && { description }),
      ...(price && { price: parseFloat(price) }),
      ...(duration && { duration: parseInt(duration) }),
      ...(category && { category }),
    };

    setSaving(true);
    try {
      if (dialog.id) {
        await updateService.mutateAsync({ id: dialog.id, data, params: { businessId } });
        toast({ title: "Service updated successfully", variant: "success" });
      } else {
        await createService.mutateAsync({ data, params: { businessId } });
        toast({ title: "Service created successfully", variant: "success" });
      }
      invalidate();
      closeDialog();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.id) return;
    await deleteService.mutateAsync({ id: deleteConfirm.id, params: { businessId } });
    toast({ title: "Service deleted" });
    invalidate();
    setDeleteConfirm({ open: false });
  }

  const grouped = services.reduce<Record<string, typeof services>>((acc, s) => {
    const cat = s.category ?? "Other";
    acc[cat] = [...(acc[cat] ?? []), s];
    return acc;
  }, {});

  const isEditing = !!dialog.id;
  const currencyCode = settings?.currency ?? "USD";
  const currencySymbol = (() => {
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0).find((p) => p.type === "currency")?.value ?? "$";
    } catch {
      return "$";
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Services</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-snug">Price/service questions answered from DB — no AI cost</p>
        </div>
        <button
          onClick={openCreate}
          className="group relative inline-flex items-center gap-2 flex-shrink-0 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 overflow-hidden whitespace-nowrap"
        >
          <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-2xl" />
          <span className="relative flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </span>
            Add Service
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No services yet</p>
          <p className="text-sm mt-1">Add services so customers can ask about pricing</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {list.map((s) => (
                  <Card key={s.id} className="border border-gray-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                            {!s.active && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          {s.description && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{s.description}</p>}
                          <div className="flex items-center gap-3 text-xs">
                            {s.price != null && (
                              <span className="flex items-center gap-1 font-bold text-green-700">
                                <span className="text-[0.8em] leading-none">{currencySymbol}</span>{s.price}
                              </span>
                            )}
                            {s.duration != null && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock className="w-3 h-3" />{s.duration} min
                              </span>
                            )}
                          </div>
                          {(s.keywords ?? []).length > 0 && (
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              <Tag className="w-3 h-3 text-gray-400 shrink-0" />
                              {(s.keywords ?? []).map((kw) => (
                                <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            className="p-2 rounded-lg hover:bg-green-50 hover:text-green-600 text-gray-400 transition-colors"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                            onClick={() => setDeleteConfirm({ open: true, id: s.id, name: s.name })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false })}>
        <AlertDialogContent className="max-w-sm mx-4 sm:mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete this service?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {deleteConfirm.name && (
                <span className="block font-medium text-gray-700 mb-1">"{deleteConfirm.name}"</span>
              )}
              This will permanently remove the service. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              onClick={handleDelete}
            >
              Delete Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-lg sm:rounded-2xl flex flex-col max-h-[92dvh]">
          <div className={`px-5 py-4 flex-shrink-0 ${isEditing ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-green-500 to-emerald-600"}`}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  {isEditing ? <Pencil className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">
                    {isEditing ? "Edit Service" : "New Service"}
                  </DialogTitle>
                  <p className="text-xs text-white/75 mt-0.5">
                    {isEditing ? "Update service details below" : "Fill in the details to add a new service"}
                  </p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {formError && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm font-medium leading-snug">{formError}</p>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
                <Layers className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Basic Info</p>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Service Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                    placeholder="e.g. Women's Haircut"
                    value={dialog.form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Category</Label>
                    <Input
                      className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                      placeholder="e.g. Hair"
                      value={dialog.form.category}
                      onChange={(e) => setField("category", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Status</Label>
                    <div className="mt-1.5 h-10 flex items-center gap-2.5 px-3 border border-gray-200 rounded-lg bg-white">
                      <Switch
                        checked={dialog.form.active}
                        onCheckedChange={(v) => setField("active", v)}
                      />
                      <span className={`text-sm font-medium ${dialog.form.active ? "text-green-700" : "text-gray-400"}`}>
                        {dialog.form.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Description</Label>
                  <Textarea
                    className="mt-1.5 resize-none focus-visible:ring-blue-500 focus-visible:border-blue-500"
                    rows={2}
                    placeholder="Brief description of what this service includes"
                    value={dialog.form.description}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
                <Coins className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing & Duration</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Price ({currencySymbol})</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-gray-400 leading-none">{currencySymbol}</span>
                    <Input className="pl-8 focus-visible:ring-blue-500 focus-visible:border-blue-500" type="number" placeholder="0.00"
                      value={dialog.form.price} onChange={(e) => setField("price", e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Duration (min)</Label>
                  <div className="relative mt-1.5">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input className="pl-8 focus-visible:ring-blue-500 focus-visible:border-blue-500" type="number" placeholder="30"
                      value={dialog.form.duration} onChange={(e) => setField("duration", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-white">
                <Tag className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bot Matching</p>
              </div>
              <div className="p-4">
                <Label className="text-sm font-medium text-gray-700">Keywords</Label>
                <div className="relative mt-1.5">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-8 focus-visible:ring-blue-500 focus-visible:border-blue-500" placeholder="e.g. haircut, cut, trim"
                    value={dialog.form.keywords} onChange={(e) => setField("keywords", e.target.value)} />
                </div>
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  Comma-separated — when a customer mentions these, this service is shown
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={closeDialog}
              className="flex-1 inline-flex min-h-[46px] items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all duration-150 shadow-sm"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 inline-flex min-h-[46px] items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${
                isEditing
                  ? "bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 shadow-blue-200 hover:shadow-blue-300"
                  : "bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 shadow-green-200 hover:shadow-green-300"
              }`}
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : isEditing ? (
                <><Pencil className="w-4 h-4" /> Update Service</>
              ) : (
                <><Plus className="w-4 h-4" /> Create Service</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
