import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useListBusinesses } from "@workspace/api-client-react";
import { AlertCircle, CirclePower, Key, Mail, Pencil, Shield, ShieldOff, Trash2, UserCog, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OwnerItem = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  businesses: Array<{ id: number; name: string }>;
};

type OwnerForm = {
  email: string;
  password: string;
  name: string;
  businessIds: number[];
};

type EditOwnerForm = {
  id: number;
  email: string;
  name: string;
  password: string;
  businessIds: number[];
  isActive: boolean;
};

const EMPTY_OWNER: OwnerForm = { email: "", password: "", name: "", businessIds: [] };
const EMPTY_EDIT_OWNER: EditOwnerForm = { id: 0, email: "", name: "", password: "", businessIds: [], isActive: true };

function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { data } = useListBusinesses();
  const businesses = Array.isArray(data) ? data : [];

  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState("");
  const [ownerDialog, setOwnerDialog] = useState<{ open: boolean; form: OwnerForm }>({ open: false, form: EMPTY_OWNER });
  const [editOwnerDialog, setEditOwnerDialog] = useState<{ open: boolean; form: EditOwnerForm }>({ open: false, form: EMPTY_EDIT_OWNER });
  const [ownerError, setOwnerError] = useState("");
  const [editOwnerError, setEditOwnerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerDeleteConfirm, setOwnerDeleteConfirm] = useState<{ open: boolean; id?: number; name?: string }>({ open: false });
  const [deleteToken, setDeleteToken] = useState("");
  const [statusConfirm, setStatusConfirm] = useState<{ open: boolean; owner?: OwnerItem }>({ open: false });

  async function loadOwners() {
    setOwnersLoading(true);
    setOwnersError("");
    try {
      const res = await fetch(apiUrl("/api/business-owners"), { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setOwnersError(body?.error || "Failed to load admin users.");
        return;
      }
      const data = await res.json();
      setOwners(Array.isArray(data) ? data : []);
    } finally {
      setOwnersLoading(false);
    }
  }

  useEffect(() => { void loadOwners(); }, []);

  function toggleCreateBusiness(id: number) {
    setOwnerDialog((d) => ({
      ...d,
      form: { ...d.form, businessIds: d.form.businessIds.includes(id) ? d.form.businessIds.filter((x) => x !== id) : [...d.form.businessIds, id] },
    }));
  }
  function toggleEditBusiness(id: number) {
    setEditOwnerDialog((d) => ({
      ...d,
      form: { ...d.form, businessIds: d.form.businessIds.includes(id) ? d.form.businessIds.filter((x) => x !== id) : [...d.form.businessIds, id] },
    }));
  }

  async function createOwner() {
    const f = ownerDialog.form;
    if (!f.email.trim() || !f.name.trim()) { setOwnerError("Name and email are required."); return; }
    if (f.password.trim().length < 6) { setOwnerError("Password must be at least 6 characters."); return; }
    if (f.businessIds.length === 0) { setOwnerError("Select at least one business."); return; }
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/business-owners"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: f.email.trim().toLowerCase(), password: f.password.trim(), name: f.name.trim(), businessIds: f.businessIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setOwnerError(body?.error || "Failed to create admin.");
        return;
      }
      toast({ title: "Admin user created", variant: "success" });
      setOwnerDialog({ open: false, form: EMPTY_OWNER });
      await loadOwners();
    } finally {
      setSaving(false);
    }
  }

  function openEdit(owner: OwnerItem) {
    setEditOwnerDialog({
      open: true,
      form: { id: owner.id, email: owner.email, name: owner.name ?? "", password: "", businessIds: owner.businesses.map((b) => b.id), isActive: owner.isActive },
    });
    setEditOwnerError("");
  }

  async function saveEdit() {
    const f = editOwnerDialog.form;
    if (!f.email.trim() || !f.name.trim()) { setEditOwnerError("Name and email are required."); return; }
    if (f.password.trim() && f.password.trim().length < 6) { setEditOwnerError("Password must be at least 6 characters."); return; }
    if (f.businessIds.length === 0) { setEditOwnerError("Select at least one business."); return; }
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/business-owners/${f.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: f.email.trim().toLowerCase(),
          name: f.name.trim(),
          ...(f.password.trim() ? { password: f.password.trim() } : {}),
          businessIds: f.businessIds,
          isActive: f.isActive,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEditOwnerError(body?.error || "Failed to update admin.");
        return;
      }
      toast({ title: "Admin user updated", variant: "success" });
      setEditOwnerDialog({ open: false, form: EMPTY_EDIT_OWNER });
      await loadOwners();
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(owner: OwnerItem) {
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/business-owners/${owner.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: owner.email,
          name: owner.name ?? owner.email,
          businessIds: owner.businesses.map((b) => b.id),
          isActive: !owner.isActive,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ title: body?.error || "Failed to update status", variant: "destructive" });
        return;
      }
      toast({ title: owner.isActive ? "Admin disabled" : "Admin enabled", variant: "success" });
      await loadOwners();
    } finally {
      setSaving(false);
    }
  }

  async function deleteOwner() {
    if (!ownerDeleteConfirm.id) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl(`/api/business-owners/${ownerDeleteConfirm.id}`), { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ title: body?.error || "Failed to delete admin", variant: "destructive" });
        return;
      }
      toast({ title: "Admin user deleted", variant: "success" });
      setOwnerDeleteConfirm({ open: false });
      setDeleteToken("");
      await loadOwners();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Admin Users</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-[30ch] sm:max-w-none">Create and manage business owner accounts and permissions</p>
        </div>
        <button
          onClick={() => setOwnerDialog({ open: true, form: EMPTY_OWNER })}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white font-semibold text-sm shadow-lg shadow-sky-200 hover:from-sky-600 hover:to-cyan-700"
        >
          <Key className="w-4 h-4" /> Add Admin User
        </button>
      </div>

      {ownersError && (
        <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
          <p className="text-sm font-medium leading-snug">{ownersError}</p>
        </div>
      )}

      {ownersLoading ? (
        <div className="space-y-3 min-h-[60vh]">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : owners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-500 text-sm">No admin users yet.</div>
      ) : (
        <div className="space-y-3">
          {owners.map((owner) => (
            <Card key={owner.id} className={`border shadow-sm ${owner.isActive ? "border-sky-200 bg-sky-50/20" : "border-gray-200 bg-gray-50/70"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserCog className={`w-4 h-4 ${owner.isActive ? "text-sky-600" : "text-gray-500"}`} />
                      <p className="font-semibold text-gray-900">{owner.name || owner.email}</p>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${owner.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>
                        {owner.isActive ? <Shield className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                        {owner.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {owner.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Business: <span className="font-medium text-gray-700">{owner.businesses.map((b) => b.name).join(", ") || "No business assigned"}</span></p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors" onClick={() => openEdit(owner)}><Pencil className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-amber-50 hover:text-amber-600 text-gray-400 transition-colors" onClick={() => setStatusConfirm({ open: true, owner })}><CirclePower className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors" onClick={() => setOwnerDeleteConfirm({ open: true, id: owner.id, name: owner.name ?? owner.email })}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={ownerDialog.open} onOpenChange={(o) => !o && setOwnerDialog({ open: false, form: EMPTY_OWNER })}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md sm:rounded-2xl flex flex-col max-h-[92dvh] [&>button]:text-white [&>button]:opacity-100">
          <div className="px-5 py-4 flex-shrink-0 bg-gradient-to-r from-sky-500 to-cyan-600">
            <DialogHeader><DialogTitle className="text-base font-bold text-white">New Admin User</DialogTitle></DialogHeader>
          </div>
          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {ownerError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{ownerError}</div>}
            <div><Label>Owner Name</Label><Input className="mt-1.5 focus-visible:ring-sky-500 focus-visible:border-sky-500" value={ownerDialog.form.name} onChange={(e) => setOwnerDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} /></div>
            <div><Label>Owner Email</Label><Input className="mt-1.5 focus-visible:ring-sky-500 focus-visible:border-sky-500" value={ownerDialog.form.email} onChange={(e) => setOwnerDialog((d) => ({ ...d, form: { ...d.form, email: e.target.value } }))} /></div>
            <div><Label>Password</Label><Input type="password" className="mt-1.5 focus-visible:ring-sky-500 focus-visible:border-sky-500" value={ownerDialog.form.password} onChange={(e) => setOwnerDialog((d) => ({ ...d, form: { ...d.form, password: e.target.value } }))} /></div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <Label>Select Businesses</Label>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {businesses.map((b) => (
                  <label key={b.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={ownerDialog.form.businessIds.includes(b.id)} onChange={() => toggleCreateBusiness(b.id)} />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
            <button onClick={() => setOwnerDialog({ open: false, form: EMPTY_OWNER })} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50"><X className="w-4 h-4" /> Cancel</button>
            <button onClick={() => void createOwner()} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg bg-gradient-to-br from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 disabled:opacity-60"><Key className="w-4 h-4" /> Create Admin</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOwnerDialog.open} onOpenChange={(o) => !o && setEditOwnerDialog({ open: false, form: EMPTY_EDIT_OWNER })}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md sm:rounded-2xl flex flex-col max-h-[92dvh]">
          <div className="px-5 py-4 flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600">
            <DialogHeader><DialogTitle className="text-base font-bold text-white">Edit Admin User</DialogTitle></DialogHeader>
          </div>
          <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {editOwnerError && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{editOwnerError}</div>}
            <div><Label>Owner Name</Label><Input className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500" value={editOwnerDialog.form.name} onChange={(e) => setEditOwnerDialog((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} /></div>
            <div><Label>Owner Email</Label><Input className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500" value={editOwnerDialog.form.email} onChange={(e) => setEditOwnerDialog((d) => ({ ...d, form: { ...d.form, email: e.target.value } }))} /></div>
            <div><Label>New Password (optional)</Label><Input type="password" className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500" value={editOwnerDialog.form.password} onChange={(e) => setEditOwnerDialog((d) => ({ ...d, form: { ...d.form, password: e.target.value } }))} /></div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
              <Label>Select Businesses</Label>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {businesses.map((b) => (
                  <label key={b.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 cursor-pointer" checked={editOwnerDialog.form.businessIds.includes(b.id)} onChange={() => toggleEditBusiness(b.id)} />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
            <button onClick={() => setEditOwnerDialog({ open: false, form: EMPTY_EDIT_OWNER })} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50"><X className="w-4 h-4" /> Cancel</button>
            <button onClick={() => void saveEdit()} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60"><Pencil className="w-4 h-4" /> Save Changes</button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={ownerDeleteConfirm.open} onOpenChange={(o) => { if (!o) { setOwnerDeleteConfirm({ open: false }); setDeleteToken(""); } }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Delete this admin user?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">Type DELETE to confirm permanent remove.</AlertDialogDescription>
            <Input className="mt-1.5" value={deleteToken} onChange={(e) => setDeleteToken(e.target.value)} placeholder="DELETE" />
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold" onClick={() => void deleteOwner()} disabled={deleteToken.trim() !== "DELETE" || saving}>Delete Admin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={statusConfirm.open} onOpenChange={(o) => !o && setStatusConfirm({ open: false })}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">{statusConfirm.owner?.isActive ? "Disable this admin user?" : "Enable this admin user?"}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">{statusConfirm.owner?.isActive ? "This user will not be able to login until enabled again." : "This user can login again."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 text-sm font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
              onClick={() => { if (!statusConfirm.owner) return; void toggleStatus(statusConfirm.owner); setStatusConfirm({ open: false }); }}
              disabled={saving}
            >
              {statusConfirm.owner?.isActive ? "Disable User" : "Enable User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
