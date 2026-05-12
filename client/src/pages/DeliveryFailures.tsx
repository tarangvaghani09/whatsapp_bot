import { useState } from "react";
import { useBusinessId } from "@/context/BusinessContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Phone, Trash2, XCircle, Wifi, RefreshCw,
} from "lucide-react";

type DeliveryFailure = {
  id: number;
  businessId: number;
  recipientPhone: string;
  messagePreview: string;
  errorStatus: number | null;
  errorBody: string | null;
  context: string;
  resolvedAt: string | null;
  createdAt: string;
};

const CONTEXT_BADGE: Record<string, { label: string; cls: string }> = {
  bot:       { label: "Bot reply",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  manual:    { label: "Manual",      cls: "bg-violet-100 text-violet-700 border-violet-200" },
  broadcast: { label: "Broadcast",   cls: "bg-purple-100 text-purple-700 border-purple-200" },
};

function statusLabel(status: number | null): { text: string; cls: string } {
  if (!status || status === 0) return { text: "No credentials", cls: "text-amber-600 bg-amber-50 border-amber-200" };
  if (status === 401) return { text: "401 Unauthorized", cls: "text-red-600 bg-red-50 border-red-200" };
  if (status === 400) return { text: "400 Bad request", cls: "text-orange-600 bg-orange-50 border-orange-200" };
  if (status === 429) return { text: "429 Rate limited", cls: "text-yellow-700 bg-yellow-50 border-yellow-200" };
  if (status >= 500) return { text: `${status} Server error`, cls: "text-red-700 bg-red-50 border-red-200" };
  return { text: `Error ${status}`, cls: "text-gray-600 bg-gray-50 border-gray-200" };
}

function FailureCard({
  item,
  onDismiss,
}: {
  item: DeliveryFailure;
  onDismiss: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const ctxBadge = CONTEXT_BADGE[item.context] ?? CONTEXT_BADGE["bot"]!;
  const st = statusLabel(item.errorStatus);

  return (
    <div className="bg-white rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <XCircle className="w-4.5 h-4.5 text-red-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}>
              <Wifi className="w-3 h-3" />
              {st.text}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ctxBadge.cls}`}>
              {ctxBadge.label}
            </span>
            <span className="text-[11px] text-gray-400 ml-auto">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-700">
            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="font-mono font-medium">{item.recipientPhone}</span>
          </div>

          <p className="mt-1.5 text-sm text-gray-500 line-clamp-2 leading-snug">
            <span className="font-medium text-gray-600">Message: </span>
            {item.messagePreview}
            {item.messagePreview.length >= 120 ? "…" : ""}
          </p>

          {item.errorBody && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors font-medium"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Hide" : "Show"} error details
            </button>
          )}

          {expanded && item.errorBody && (
            <pre className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {item.errorBody}
            </pre>
          )}

          <p className="mt-1.5 text-[10px] text-gray-400">
            {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>

        <button
          onClick={() => onDismiss(item.id)}
          className="flex-shrink-0 p-2 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Dismiss"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function DeliveryFailuresPage() {
  const businessId = useBusinessId();
  const { toast } = useToast();
  const [items, setItems] = useState<DeliveryFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingAll, setDismissingAll] = useState(false);

  const fetchFailures = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/delivery-failures?businessId=${businessId}`);
      if (!res.ok) return;
      const data: DeliveryFailure[] = await res.json();
      setItems(data);
    } catch {
      toast({ title: "Failed to load failures", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useState(() => { fetchFailures(); });

  async function handleDismiss(id: number) {
    try {
      await fetch(`/api/delivery-failures/${id}?businessId=${businessId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Dismissed", description: "Failure removed from the log." });
    } catch {
      toast({ title: "Failed to dismiss", variant: "destructive" });
    }
  }

  async function handleDismissAll() {
    setDismissingAll(true);
    try {
      await fetch(`/api/delivery-failures/dismiss-all?businessId=${businessId}`, { method: "POST" });
      setItems([]);
      toast({ title: "All dismissed", description: "Delivery failure log cleared." });
    } catch {
      toast({ title: "Failed to dismiss all", variant: "destructive" });
    } finally {
      setDismissingAll(false);
    }
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Delivery Failures</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-snug">
            WhatsApp messages the bot failed to send — check credentials if failures keep appearing
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <button
            onClick={fetchFailures}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 flex-1 sm:flex-none"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {items.length > 0 && (
            <button
              onClick={handleDismissAll}
              disabled={dismissingAll}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-sm disabled:opacity-50 flex-1 sm:flex-none"
            >
              <Trash2 className="w-4 h-4" />
              Dismiss all
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {!loading && items.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {items.length} unresolved delivery failure{items.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              These messages were not delivered to customers. Check your WhatsApp credentials in{" "}
              <span className="font-semibold">Businesses → Edit</span> and ensure your access token is valid.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-lg font-semibold text-gray-700">All good — no delivery failures</p>
          <p className="text-sm text-gray-400 mt-1">
            Every outgoing WhatsApp message is being delivered successfully.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <FailureCard key={item.id} item={item} onDismiss={handleDismiss} />
          ))}
        </div>
      )}
    </div>
  );
}
