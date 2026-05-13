import { useState, useMemo } from "react";
import {
  useListBookings,
  useUpdateBooking,
  useDeleteBooking,
  getListBookingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CheckCircle, XCircle, Trash2, Calendar, Clock, Phone, User, CalendarCheck, CalendarClock, X, CheckSquare, Square, Loader2, Star, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useBusinessId } from "@/context/BusinessContext";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
];

const statusConfig: Record<string, { bg: string; text: string; dot: string; border: string; selectedBorder: string }> = {
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400",  border: "border-amber-200",  selectedBorder: "border-amber-400" },
  approved:  { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",  border: "border-green-200",  selectedBorder: "border-green-400" },
  rejected:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400",    border: "border-red-200",    selectedBorder: "border-red-400" },
  completed: { bg: "bg-violet-50",  text: "text-violet-700",  dot: "bg-violet-500", border: "border-violet-200", selectedBorder: "border-violet-400" },
};

type ConfirmState =
  | { open: false }
  | { open: true; type: "approve" | "reject" | "delete" | "complete"; bookingId: number; service?: string };

type BulkConfirmState =
  | { open: false }
  | { open: true; action: "approve" | "reject"; ids: number[] };

function StarDisplay({ rating }: { rating: number | null | undefined }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
      <span className="ml-1 text-xs font-semibold text-amber-600">{rating}/5</span>
    </div>
  );
}

export default function BookingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const businessId = useBusinessId();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmState>({ open: false });
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reschedule, setReschedule] = useState<{ open: boolean; bookingId: number | null; service: string; date: string; time: string }>({
    open: false, bookingId: null, service: "", date: "", time: "",
  });
  const [rescheduling, setRescheduling] = useState(false);

  const { data, isLoading } = useListBookings({
    ...(statusFilter !== "all" ? { status: statusFilter as "pending" | "approved" | "rejected" | "completed" } : {}),
    businessId,
  });
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const bookings = data?.bookings ?? [];
  const total = data?.total ?? 0;

  const pendingBookings = useMemo(() => bookings.filter((b) => b.status === "pending"), [bookings]);
  const selectedPendingIds = useMemo(() => [...selected].filter((id) => pendingBookings.some((b) => b.id === id)), [selected, pendingBookings]);
  const allPendingSelected = pendingBookings.length > 0 && pendingBookings.every((b) => selected.has(b.id));

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBookingsQueryKey({ businessId }) });

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pendingBookings.forEach((b) => next.delete(b.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pendingBookings.forEach((b) => next.add(b.id));
        return next;
      });
    }
  }

  function clearSelection() { setSelected(new Set()); }

  function openReschedule(b: { id: number; service: string | null; requestedDate: string | null; requestedTime: string | null }) {
    setReschedule({ open: true, bookingId: b.id, service: b.service ?? "", date: b.requestedDate ?? "", time: b.requestedTime ?? "" });
  }

  async function handleReschedule() {
    if (!reschedule.bookingId || !reschedule.date || !reschedule.time) return;
    setRescheduling(true);
    try {
      const res = await fetch(`/api/bookings/${reschedule.bookingId}/reschedule?businessId=${businessId ?? ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedDate: reschedule.date, requestedTime: reschedule.time }),
      });
      if (!res.ok) throw new Error("Reschedule failed");
      toast({ title: "Booking rescheduled", description: "Customer notified via WhatsApp.", variant: "success" });
      invalidate();
      setReschedule({ open: false, bookingId: null, service: "", date: "", time: "" });
    } catch {
      toast({ title: "Reschedule failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setRescheduling(false);
    }
  }

  async function performAction() {
    if (!confirm.open) return;
    if (confirm.type === "approve") {
      await updateBooking.mutateAsync({ id: confirm.bookingId, data: { status: "approved" }, params: { businessId } });
      toast({ title: "Booking approved", description: "Customer notified via WhatsApp." });
    } else if (confirm.type === "reject") {
      await updateBooking.mutateAsync({ id: confirm.bookingId, data: { status: "rejected" }, params: { businessId } });
      toast({ title: "Booking rejected", description: "Customer notified via WhatsApp." });
    } else if (confirm.type === "complete") {
      await updateBooking.mutateAsync({ id: confirm.bookingId, data: { status: "completed" }, params: { businessId } });
      toast({ title: "Booking completed!", description: "Rating request sent to customer via WhatsApp.", variant: "success" });
    } else {
      await deleteBooking.mutateAsync({ id: confirm.bookingId, params: { businessId } });
      toast({ title: "Booking deleted" });
    }
    invalidate();
    setConfirm({ open: false });
  }

  async function performBulkAction() {
    if (!bulkConfirm.open) return;
    const { action, ids } = bulkConfirm;
    setBulkLoading(true);
    setBulkConfirm({ open: false });

    let succeeded = 0;
    let failed = 0;
    await Promise.all(
      ids.map(async (id) => {
        try {
          await updateBooking.mutateAsync({ id, data: { status: action === "approve" ? "approved" : "rejected" }, params: { businessId } });
          succeeded++;
        } catch {
          failed++;
        }
      })
    );

    await invalidate();
    clearSelection();
    setBulkLoading(false);

    if (failed === 0) {
      toast({
        title: `${succeeded} booking${succeeded !== 1 ? "s" : ""} ${action === "approve" ? "approved" : "rejected"}`,
        description: `WhatsApp notification${succeeded !== 1 ? "s" : ""} sent to customer${succeeded !== 1 ? "s" : ""}.`,
        variant: "success",
      });
    } else {
      toast({
        title: `${succeeded} succeeded, ${failed} failed`,
        description: "Some bookings could not be updated. Please try again.",
        variant: "destructive",
      });
    }
  }

  const confirmConfig = {
    approve: {
      title: "Approve this booking?",
      description: "The booking will be marked as approved and a WhatsApp confirmation message with a booking reference number will be sent to the customer automatically.",
      actionLabel: "Approve & Notify",
      actionClass: "bg-green-600 hover:bg-green-700 text-white",
    },
    reject: {
      title: "Reject this booking?",
      description: "The booking will be marked as rejected and a polite WhatsApp message will be sent to the customer letting them know and inviting them to rebook.",
      actionLabel: "Reject & Notify",
      actionClass: "bg-red-600 hover:bg-red-700 text-white",
    },
    complete: {
      title: "Mark this booking as complete?",
      description: "The booking will be marked as completed and a WhatsApp message will be sent to the customer asking them to rate their experience (1-5 stars).",
      actionLabel: "Complete & Request Rating",
      actionClass: "bg-violet-600 hover:bg-violet-700 text-white",
    },
    delete: {
      title: "Delete this booking?",
      description: "This will permanently remove the booking record. This action cannot be undone.",
      actionLabel: "Delete",
      actionClass: "bg-red-600 hover:bg-red-700 text-white",
    },
  };

  const cfg = confirm.open ? confirmConfig[confirm.type] : null;

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total booking requests</p>
        </div>
      </div>

      {/* -- Status Tabs + Select All -- */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setStatusFilter(tab.value); clearSelection(); }}
                className={`
                  flex-1 sm:flex-none px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap
                  ${active
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                  }
                `}
              >
                {tab.value === "pending" && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-amber-400" />}
                {tab.value === "approved" && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500" />}
                {tab.value === "rejected" && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-400" />}
                {tab.value === "completed" && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-violet-500" />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {pendingBookings.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            {allPendingSelected
              ? <CheckSquare className="w-4 h-4 text-indigo-600" />
              : <Square className="w-4 h-4 text-gray-400" />
            }
            {allPendingSelected ? "Deselect all" : `Select all pending (${pendingBookings.length})`}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No bookings found</p>
          <p className="text-sm mt-1">
            {statusFilter !== "all" ? `No ${statusFilter} bookings` : "Booking requests will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const st = statusConfig[b.status] ?? statusConfig.pending;
            const isPending = b.status === "pending";
            const isApproved = b.status === "approved";
            const isCompleted = b.status === "completed";
            const isSelected = selected.has(b.id);
            return (
              <Card
                key={b.id}
                className={`border shadow-sm hover:shadow-md transition-all ${
                  isSelected ? `${st.selectedBorder} ring-2 ring-indigo-200 shadow-indigo-50` : st.border
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPending && (
                        <button
                          onClick={() => toggleSelect(b.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
                          aria-label={isSelected ? "Deselect booking" : "Select booking"}
                        >
                          {isSelected
                            ? <CheckSquare className="w-5 h-5 text-indigo-600" />
                            : <Square className="w-5 h-5" />
                          }
                        </button>
                      )}
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                      {b.service && (
                        <span className="text-sm font-bold text-gray-900">{b.service}</span>
                      )}
                      {isCompleted && b.rating && (
                        <StarDisplay rating={b.rating} />
                      )}
                      {isCompleted && !b.rating && (
                        <span className="text-xs text-gray-400 italic flex items-center gap-1">
                          <Star className="w-3 h-3" /> Awaiting rating
                        </span>
                      )}
                    </div>
                    <button
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      onClick={() => setConfirm({ open: true, type: "delete", bookingId: b.id, service: b.service ?? "" })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-500 mb-3">
                    {b.customerPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 shrink-0 text-gray-400" />
                        <span className="truncate">{b.customerPhone}</span>
                      </span>
                    )}
                    {b.customerName && (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3 h-3 shrink-0 text-gray-400" />
                        <span className="truncate">{b.customerName}</span>
                      </span>
                    )}
                    {b.requestedDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0 text-gray-400" />
                        {b.requestedDate}
                      </span>
                    )}
                    {b.requestedTime && (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0 text-gray-400" />
                        {b.requestedTime}
                      </span>
                    )}
                  </div>

                  {b.notes && (
                    <p className="text-xs text-gray-500 italic mb-2 bg-gray-50 rounded-lg px-3 py-1.5">"{b.notes}"</p>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {format(new Date(b.createdAt), "MMM d, yyyy ? h:mm a")}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isCompleted && (
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          onClick={() => openReschedule(b)}
                        >
                          <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                        </button>
                      )}
                      {isPending && (
                        <>
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                            onClick={() => setConfirm({ open: true, type: "approve", bookingId: b.id, service: b.service ?? "" })}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                            onClick={() => setConfirm({ open: true, type: "reject", bookingId: b.id, service: b.service ?? "" })}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {isApproved && (
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                          onClick={() => setConfirm({ open: true, type: "complete", bookingId: b.id, service: b.service ?? "" })}
                        >
                          <PartyPopper className="w-3.5 h-3.5" /> Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* -- Bulk Action Bar -- */}
      {selectedPendingIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-900 shadow-2xl shadow-black/30 border border-white/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 text-white text-xs font-bold flex-shrink-0">
                {selectedPendingIds.length}
              </div>
              <span className="text-sm font-medium text-white truncate">
                booking{selectedPendingIds.length !== 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setBulkConfirm({ open: true, action: "reject", ids: selectedPendingIds })}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Reject all
              </button>
              <button
                onClick={() => setBulkConfirm({ open: true, action: "approve", ids: selectedPendingIds })}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-400 transition-colors disabled:opacity-50"
              >
                {bulkLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCircle className="w-3.5 h-3.5" />
                }
                Approve all
              </button>
              <button
                onClick={clearSelection}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Reschedule Dialog -- */}
      <Dialog open={reschedule.open} onOpenChange={(o) => { if (!o && !rescheduling) setReschedule((r) => ({ ...r, open: false })); }}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-sm sm:rounded-2xl flex flex-col">
          <div className="px-5 py-4 flex-shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CalendarClock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">Reschedule Booking</DialogTitle>
                  {reschedule.service && (
                    <p className="text-xs text-white/75 mt-0.5">{reschedule.service}</p>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-4 py-4 space-y-4">
            <p className="text-sm text-gray-500">Set a new date and time. The customer will receive a WhatsApp notification automatically.</p>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> New Date
                </Label>
                <Input
                  type="date"
                  className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  value={reschedule.date}
                  onChange={(e) => setReschedule((r) => ({ ...r, date: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> New Time
                </Label>
                <Input
                  type="time"
                  className="mt-1.5 focus-visible:ring-blue-500 focus-visible:border-blue-500"
                  value={reschedule.time}
                  onChange={(e) => setReschedule((r) => ({ ...r, time: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              onClick={() => setReschedule((r) => ({ ...r, open: false }))}
              disabled={rescheduling}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 active:scale-[0.97] transition-all duration-150 shadow-sm disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={!reschedule.date || !reschedule.time || rescheduling}
              className="group relative flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 shadow-indigo-200 hover:shadow-indigo-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
            >
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-2xl" />
              <span className="relative flex items-center gap-2">
                {rescheduling ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><CalendarClock className="w-4 h-4" /> Reschedule & Notify</>
                )}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* -- Single Booking Confirm -- */}
      <AlertDialog open={confirm.open} onOpenChange={(o) => !o && setConfirm({ open: false })}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              {cfg?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {confirm.open && confirm.service && (
                <span className="block font-medium text-gray-700 mb-1">
                  Service: {confirm.service}
                </span>
              )}
              {cfg?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performAction}
              className={`rounded-xl ${cfg?.actionClass}`}
            >
              {cfg?.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* -- Bulk Confirm -- */}
      <AlertDialog open={bulkConfirm.open} onOpenChange={(o) => !o && setBulkConfirm({ open: false })}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              {bulkConfirm.open
                ? bulkConfirm.action === "approve"
                  ? `Approve ${bulkConfirm.ids.length} bookings?`
                  : `Reject ${bulkConfirm.ids.length} bookings?`
                : ""
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {bulkConfirm.open && (
                bulkConfirm.action === "approve"
                  ? `All ${bulkConfirm.ids.length} selected bookings will be approved and customers will each receive a WhatsApp confirmation message.`
                  : `All ${bulkConfirm.ids.length} selected bookings will be rejected and customers will each receive a WhatsApp notification.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performBulkAction}
              className={`rounded-xl ${
                bulkConfirm.open && bulkConfirm.action === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              {bulkConfirm.open
                ? bulkConfirm.action === "approve"
                  ? `Approve all ${bulkConfirm.ids.length}`
                  : `Reject all ${bulkConfirm.ids.length}`
                : ""
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
