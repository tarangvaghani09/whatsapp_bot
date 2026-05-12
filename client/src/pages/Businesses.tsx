import { useState } from "react";
import { useListBusinesses, useCreateBusiness, useUpdateBusiness, useDeleteBusiness } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Building2, Phone, Key, X, AlertCircle, Check, Sparkles, Dumbbell, Utensils, HeartPulse, GraduationCap, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusinessContext } from "@/context/BusinessContext";

const BUSINESS_TYPES = [
  { value: "salon",      label: "Hair Salon",  description: "Haircuts, coloring, bridal, nails", icon: Scissors,     color: "from-pink-500 to-rose-500",    bg: "bg-pink-50",    border: "border-pink-200",    text: "text-pink-700",    iconBg: "bg-pink-100" },
  { value: "gym",        label: "Gym / Fitness", description: "Memberships, classes, personal training", icon: Dumbbell,     color: "from-blue-500 to-indigo-500",  bg: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-700",    iconBg: "bg-blue-100" },
  { value: "clinic",     label: "Medical Clinic", description: "Consultations, lab tests, teleconsult", icon: HeartPulse,   color: "from-green-500 to-emerald-500", bg: "bg-green-50",   border: "border-green-200",   text: "text-green-700",   iconBg: "bg-green-100" },
  { value: "restaurant", label: "Restaurant",  description: "Reservations, delivery, catering", icon: Utensils,     color: "from-orange-500 to-amber-500",  bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  iconBg: "bg-orange-100" },
  { value: "coaching",   label: "Coaching / Tuition", description: "Classes, tutoring, exam prep", icon: GraduationCap, color: "from-purple-500 to-violet-500", bg: "bg-purple-50",  border: "border-purple-200",  text: "text-purple-700",  iconBg: "bg-purple-100" },
];

type Form = {
  name: string;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
  verifyToken: string;
};

const EMPTY: Form = {
  name: "",
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
  verifyToken: "",
};

export default function BusinessesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { businessId, setBusinessId, refetch: refetchContext } = useBusinessContext();
  const { data, isLoading } = useListBusinesses();
  const businesses = Array.isArray(data) ? data : [];
  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const deleteBusiness = useDeleteBusiness();

  const [dialog, setDialog] = useState<{ open: boolean; id?: number; form: Form }>({ open: false, form: EMPTY });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: number; name?: string }>({ open: false });
  const [seedDialog, setSeedDialog] = useState(false);
  const [seedType, setSeedType] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["/api/businesses"] });
    await refetchContext();
  };

  async function handleSeed() {
    if (!seedType || !businessId) return;
    setSeeding(true);
    try {
      const res = await fetch(`/api/seed?businessId=${businessId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: seedType }),
      });
      if (!res.ok) throw new Error("Seed failed");
      const data = await res.json();
      toast({
        title: "Quick setup complete!",
        description: `Added ${data.faqsAdded} FAQs and ${data.servicesAdded} services to your business.`,
        variant: "success",
      });
      setSeedDialog(false);
      setSeedType(null);
    } catch {
      toast({ title: "Setup failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }

  function openCreate() { setDialog({ open: true, form: EMPTY }); }
  function openEdit(b: (typeof businesses)[0]) {
    setDialog({
      open: true,
      id: b.id,
      form: {
        name: b.name,
        whatsappPhoneNumberId: b.whatsappPhoneNumberId ?? "",
        whatsappAccessToken: b.whatsappAccessToken ?? "",
        verifyToken: b.verifyToken ?? "",
      },
    });
  }
  function closeDialog() { setDialog({ open: false, form: EMPTY }); setFormError(""); }
  function setField<K extends keyof Form>(key: K, val: Form[K]) {
    if (formError) setFormError("");
    setDialog((d) => ({ ...d, form: { ...d.form, [key]: val } }));
  }

  async function handleSave() {
    const { name, whatsappPhoneNumberId, whatsappAccessToken, verifyToken } = dialog.form;
    if (!name.trim()) { setFormError("Business name is required."); return; }

    setSaving(true);
    try {
      const payload = {
        name,
        ...(whatsappPhoneNumberId && { whatsappPhoneNumberId }),
        ...(whatsappAccessToken && { whatsappAccessToken }),
        ...(verifyToken && { verifyToken }),
      };

      if (dialog.id) {
        await updateBusiness.mutateAsync({ id: dialog.id, data: payload });
        toast({ title: "Business updated successfully", variant: "success" });
      } else {
        const created = await createBusiness.mutateAsync({ data: payload });
        setBusinessId(created.id);
        toast({ title: "Business created successfully", variant: "success" });
      }
      await invalidate();
      closeDialog();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm.id) return;
    await deleteBusiness.mutateAsync({ id: deleteConfirm.id });
    toast({ title: "Business deleted" });
    await invalidate();
    setDeleteConfirm({ open: false });
  }

  const isEditing = !!dialog.id;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your WhatsApp bot businesses</p>
        </div>
        <div className="flex items-center gap-2">
          {businessId && (
            <button
              onClick={() => { setSeedType(null); setSeedDialog(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-purple-200 hover:from-violet-600 hover:to-purple-700 hover:shadow-purple-300 active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" /> Quick Setup
            </button>
          )}
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold text-sm shadow-lg shadow-green-200 hover:from-green-600 hover:to-green-700 hover:shadow-green-300 active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Business
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No businesses yet</p>
          <p className="text-sm mt-1">Add your first business to start using the bot</p>
        </div>
      ) : (
        <div className="space-y-3">
          {businesses.map((b) => (
            <Card
              key={b.id}
              className={`border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                b.id === businessId ? "border-green-400 bg-green-50/30" : "border-gray-200"
              }`}
              onClick={() => setBusinessId(b.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b.id === businessId ? "bg-green-100" : "bg-gray-100"}`}>
                      <Building2 className={`w-5 h-5 ${b.id === businessId ? "text-green-600" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{b.name}</p>
                        {b.id === businessId && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {b.whatsappPhoneNumberId ? (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {b.whatsappPhoneNumberId}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            No phone ID set
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                      onClick={() => setDeleteConfirm({ open: true, id: b.id, name: b.name })}
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
        <AlertDialogContent className="max-w-sm mx-4 sm:mx-auto rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete this business?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {deleteConfirm.name && (
                <span className="block font-medium text-gray-700 mb-1">"{deleteConfirm.name}"</span>
              )}
              This will permanently delete the business and all its FAQs, services, bookings, customers, and messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              onClick={handleDelete}
            >
              Delete Business
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Quick Setup / Seed Dialog ── */}
      <Dialog open={seedDialog} onOpenChange={(o) => { if (!o && !seeding) { setSeedDialog(false); setSeedType(null); } }}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-lg sm:rounded-2xl flex flex-col max-h-[92dvh]">
          <div className="px-5 py-4 flex-shrink-0 bg-gradient-to-r from-violet-500 to-purple-600">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">Quick Setup</DialogTitle>
                  <p className="text-xs text-white/75 mt-0.5">Instantly populate your business with sample FAQs & services</p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-4 py-4 space-y-3 overflow-y-auto flex-1 min-h-0">
            <p className="text-sm text-gray-500">Select your business type and we'll add 8 FAQs and 8–10 services tailored for you. You can edit or delete them after.</p>
            <div className="grid grid-cols-1 gap-2">
              {BUSINESS_TYPES.map((bt) => {
                const Icon = bt.icon;
                const selected = seedType === bt.value;
                return (
                  <button
                    key={bt.value}
                    onClick={() => setSeedType(bt.value)}
                    className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 ${
                      selected
                        ? `${bt.border} ${bt.bg} ring-2 ring-offset-1 ring-purple-400`
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${selected ? bt.iconBg : "bg-gray-100"}`}>
                      <Icon className={`w-5 h-5 ${selected ? bt.text : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${selected ? bt.text : "text-gray-800"}`}>{bt.label}</p>
                      <p className="text-xs text-gray-400 truncate">{bt.description}</p>
                    </div>
                    {selected && <Check className={`w-4 h-4 shrink-0 ${bt.text}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => { setSeedDialog(false); setSeedType(null); }}
              disabled={seeding}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all duration-150 shadow-sm disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSeed}
              disabled={!seedType || seeding}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-200 hover:from-violet-600 hover:to-purple-700 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seeding ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Setting up…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Apply Setup</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog.open} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md sm:rounded-2xl flex flex-col max-h-[92dvh]">
          <div className={`px-5 py-4 flex-shrink-0 ${isEditing ? "bg-gradient-to-r from-blue-500 to-blue-600" : "bg-gradient-to-r from-green-500 to-emerald-600"}`}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">
                    {isEditing ? "Edit Business" : "New Business"}
                  </DialogTitle>
                  <p className="text-xs text-white/75 mt-0.5">
                    {isEditing ? "Update business details" : "Add a new WhatsApp business"}
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

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Business Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    className={`pl-9 ${isEditing ? "focus-visible:ring-blue-500 focus-visible:border-blue-500" : "focus-visible:ring-green-500 focus-visible:border-green-500"}`}
                    placeholder="e.g. Glamour Studio"
                    value={dialog.form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp Credentials
                </p>
                <p className="text-xs text-gray-400">From your Meta Developer Portal → WhatsApp → API Setup</p>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Phone Number ID</Label>
                  <Input
                    className={`mt-1.5 ${isEditing ? "focus-visible:ring-blue-500 focus-visible:border-blue-500" : "focus-visible:ring-green-500 focus-visible:border-green-500"}`}
                    placeholder="e.g. 123456789012345"
                    value={dialog.form.whatsappPhoneNumberId}
                    onChange={(e) => setField("whatsappPhoneNumberId", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Key className="w-3 h-3" /> Access Token
                  </Label>
                  <Input
                    className={`mt-1.5 ${isEditing ? "focus-visible:ring-blue-500 focus-visible:border-blue-500" : "focus-visible:ring-green-500 focus-visible:border-green-500"}`}
                    type="password"
                    placeholder="EAAxxxxxxx..."
                    value={dialog.form.whatsappAccessToken}
                    onChange={(e) => setField("whatsappAccessToken", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Verify Token</Label>
                  <Input
                    className={`mt-1.5 ${isEditing ? "focus-visible:ring-blue-500 focus-visible:border-blue-500" : "focus-visible:ring-green-500 focus-visible:border-green-500"}`}
                    placeholder="Your custom webhook verify token"
                    value={dialog.form.verifyToken}
                    onChange={(e) => setField("verifyToken", e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Used to verify the Meta webhook subscription</p>
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
                  Saving…
                </>
              ) : isEditing ? (
                <><Pencil className="w-4 h-4" /> Update Business</>
              ) : (
                <><Plus className="w-4 h-4" /> Create Business</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
