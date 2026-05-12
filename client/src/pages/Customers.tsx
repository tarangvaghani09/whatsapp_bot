import { useRef, useEffect, useState, useMemo } from "react";
import {
  useListCustomers,
  useGetCustomer,
  useBroadcastToCustomers,
  usePatchCustomerTags,
  useSendQuickReply,
  useListCannedResponses,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageCircle, ArrowLeft, CheckCheck, Bot, User2, CheckSquare, Square, Send, X, Megaphone, Eye, Tag, Plus, MessageSquareText, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useBusinessId } from "@/context/BusinessContext";
import { useToast } from "@/hooks/use-toast";

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ["bg-violet-500", "text-white"],
  ["bg-blue-500", "text-white"],
  ["bg-emerald-500", "text-white"],
  ["bg-rose-500", "text-white"],
  ["bg-amber-500", "text-white"],
  ["bg-cyan-500", "text-white"],
  ["bg-fuchsia-500", "text-white"],
  ["bg-indigo-500", "text-white"],
];

const ALL_TAGS = ["VIP", "New", "Regular", "Blocked", "Pending"] as const;
type CustomerTag = typeof ALL_TAGS[number];

const TAG_STYLES: Record<CustomerTag, { bg: string; text: string; border: string; dot: string }> = {
  VIP:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-300",  dot: "bg-amber-400" },
  New:     { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-300",  dot: "bg-green-500" },
  Regular: { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-300",   dot: "bg-blue-400" },
  Blocked: { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-300",    dot: "bg-red-500" },
  Pending: { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-300", dot: "bg-orange-400" },
};

const REPLY_BADGE: Record<string, { label: string; cls: string }> = {
  faq:       { label: "FAQ",       cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  service:   { label: "Service",   cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  booking:   { label: "Booking",   cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  ai:        { label: "AI",        cls: "bg-red-100 text-red-600 border border-red-200" },
  broadcast: { label: "Broadcast", cls: "bg-purple-100 text-purple-700 border border-purple-200" },
  rating:    { label: "Rating",    cls: "bg-amber-100 text-amber-600 border border-amber-200" },
  none:      { label: "—",         cls: "bg-gray-100 text-gray-500 border border-gray-200" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length] as [string, string];
}

function initials(name: string | null | undefined, phone: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0]![0] + parts[1]![0]).toUpperCase()
      : parts[0]!.slice(0, 2).toUpperCase();
  }
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-2);
}

function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const style = TAG_STYLES[tag as CustomerTag];
  if (!style) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 w-4 h-4 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-all"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${style.bg} ${style.text} border ${style.border} transition-all`}>
      <span className={`w-2 h-2 rounded-full ${style.dot} shadow-sm flex-shrink-0`} />
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className={`ml-0.5 w-4 h-4 rounded-full ${style.bg} hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-all border ${style.border} hover:border-red-200`}
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: { id: number; content: string; direction: string; replyType: string | null; createdAt: string } }) {
  const out = msg.direction === "outbound";
  const badge = REPLY_BADGE[msg.replyType ?? "none"] ?? REPLY_BADGE.none!;
  return (
    <div className={`flex items-end gap-2 ${out ? "flex-row-reverse" : "flex-row"}`}>
      {!out && (
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mb-1">
          <User2 className="w-3.5 h-3.5 text-gray-500" />
        </div>
      )}
      {out && (
        <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mb-1">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[72%] flex flex-col gap-1 ${out ? "items-end" : "items-start"}`}>
        <div
          className={`
            relative px-3.5 py-2.5 shadow-sm text-sm leading-relaxed
            ${out
              ? "bg-[#dcf8c6] text-gray-900 rounded-[18px] rounded-br-[4px]"
              : "bg-white text-gray-900 rounded-[18px] rounded-bl-[4px] border border-gray-100"
            }
          `}
        >
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          <div className={`flex items-center gap-1.5 mt-1.5 ${out ? "justify-end" : "justify-start"}`}>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="text-[10px] text-gray-400 leading-none">
              {format(new Date(msg.createdAt), "h:mm a")}
            </span>
            {out && <CheckCheck className="w-3 h-3 text-blue-400 flex-shrink-0" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tag Editor ────────────────────────────────────────────────────────────────

function TagEditor({ customerId, currentTags, businessId, onUpdated }: {
  customerId: number;
  currentTags: string[];
  businessId: number | undefined;
  onUpdated: (tags: string[]) => void;
}) {
  const { toast } = useToast();
  const patchTags = usePatchCustomerTags();
  const [open, setOpen] = useState(false);

  async function toggleTag(tag: string) {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    try {
      await patchTags.mutateAsync({ id: customerId, data: { tags: next }, params: { businessId } });
      onUpdated(next);
    } catch {
      toast({ title: "Failed to update tags", variant: "destructive" });
    }
  }

  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {currentTags.map((tag) => (
        <TagBadge key={tag} tag={tag} onRemove={() => toggleTag(tag)} />
      ))}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all shadow-sm ${
            open
              ? "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 text-emerald-700"
              : "bg-white border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${open ? "border-emerald-400 bg-emerald-100" : "border-gray-300"}`}>
            <Plus className="w-2 h-2" />
          </span>
          Add tag
          <ChevronUp className={`w-3 h-3 transition-transform ${open ? "" : "rotate-180"}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-[calc(100%+8px)] z-20 bg-white rounded-2xl shadow-[0_16px_40px_-8px_rgba(16,24,40,0.22)] border border-emerald-100 overflow-hidden min-w-[220px] max-h-64 overflow-y-auto">
              <div className="px-3 py-2.5 border-b border-emerald-50 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Choose tag</span>
                <button onClick={() => setOpen(false)} className="w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="p-2 flex flex-col gap-1.5">
                {ALL_TAGS.map((tag) => {
                  const active = currentTags.includes(tag);
                  const style = TAG_STYLES[tag];
                  return (
                    <button
                      key={tag}
                      onClick={() => { toggleTag(tag); setOpen(false); }}
                      className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-sm font-medium transition-all text-left ${
                        active
                          ? `${style.bg} ${style.text} border ${style.border}`
                          : `hover:${style.bg} hover:${style.text} text-gray-700 border border-transparent hover:${style.border}`
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot} flex-shrink-0 shadow-sm`} />
                      <span className="flex-1">{tag}</span>
                      {active && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border} inline-flex items-center gap-1`}>
                          <CheckCheck className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Customer Detail Dialog ────────────────────────────────────────────────────

function CustomerDetail({ id, phone, name, open, onClose, businessId }: {
  id: number | null; phone: string; name: string | null; open: boolean; onClose: () => void; businessId: number | undefined;
}) {
  const { data, refetch, isFetching } = useGetCustomer(id ?? 0, { businessId }, {
    query: {
      enabled: !!id,
      refetchInterval: open ? 5000 : false,
      refetchIntervalInBackground: false,
    },
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMsgCount = useRef(0);
  const [color, text] = avatarColor(phone);
  const [localTags, setLocalTags] = useState<string[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const { toast } = useToast();
  const sendReply = useSendQuickReply();
  const { data: cannedResponses = [] } = useListCannedResponses({ businessId }, { query: { enabled: open && !!businessId } });

  useEffect(() => {
    if (data) setLocalTags(data.tags ?? []);
  }, [data]);

  // Scroll to bottom on open and whenever new messages arrive (not on manual scrolling up)
  useEffect(() => {
    const count = data?.messages.length ?? 0;
    const isNew = count > prevMsgCount.current;
    prevMsgCount.current = count;

    if (!open || count === 0) return;

    // Always scroll on first open; only scroll on new messages if near bottom
    const el = scrollAreaRef.current;
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (isNew && nearBottom) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    } else if (!isNew && open) {
      // Initial open — jump instantly
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior }), 80);
    }
  }, [open, data?.messages.length]);

  async function handleSendReply() {
    if (!id || !replyText.trim() || sendReply.isPending) return;
    try {
      await sendReply.mutateAsync({ id, data: { message: replyText.trim() }, params: { businessId } });
      setReplyText("");
      await refetch();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      toast({ title: "Message sent", description: "Your reply was delivered to the conversation." });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  }

  const displayName = name ?? phone;
  const init = initials(name, phone);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent hideClose className="p-0 overflow-hidden sm:max-w-md sm:rounded-2xl flex flex-col max-h-[88vh]">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-500 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>

          <div className={`w-9 h-9 rounded-full ${color} ${text} flex items-center justify-center font-bold text-sm flex-shrink-0 ring-2 ring-white/30 shadow-md`}>
            {init}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{displayName}</p>
            {name && <p className="text-white/70 text-xs leading-tight truncate">{phone}</p>}
            {data && (
              <p className="text-white/55 text-[10px] leading-tight">
                {data.messages.length} messages · since {format(new Date(data.createdAt), "MMM d, yyyy")}
              </p>
            )}
          </div>

          {/* Right side: message count pill + live dot + close */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                <MessageCircle className="w-3 h-3 text-white/80" />
                <span className="text-white text-xs font-bold leading-none">{data?.messages.length ?? "…"}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-emerald-300 animate-ping" : "bg-white/30"}`} />
                <span className="text-white/50 text-[9px] leading-none">live</span>
              </div>
            </div>

            {/* Attractive close button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-red-400/80 flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95 group"
              title="Close"
            >
              <X className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* ── Tags row ── */}
        {id && (
          <div className="px-4 py-2.5 bg-white border-b border-gray-100 flex items-center gap-2.5 flex-shrink-0 min-h-[46px]">
            <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Tag className="w-3 h-3 text-gray-400" />
            </div>
            {data ? (
              <TagEditor
                customerId={id}
                currentTags={localTags}
                businessId={businessId}
                onUpdated={(tags) => { setLocalTags(tags); refetch(); }}
              />
            ) : (
              <div className="flex gap-1.5">
                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        )}

        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23e5ddd5'/%3E%3C/svg%3E\")" }}
        >
          {!data ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "" : "justify-end"}`}>
                  <div className="h-12 w-48 rounded-2xl bg-white/60 animate-pulse" />
                </div>
              ))}
            </div>
          ) : data.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="bg-white/80 rounded-2xl px-5 py-4 text-center shadow-sm">
                <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No messages yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Conversation will appear here</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <span className="bg-white/70 text-gray-500 text-[10px] font-medium px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
                  Customer since {format(new Date(data.createdAt), "MMMM d, yyyy")}
                </span>
              </div>
              {data.messages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="bg-[#f0f0f0] border-t border-gray-200 flex-shrink-0">
          {/* Canned responses picker */}
          {showCanned && cannedResponses.length > 0 && (
            <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-200/80 max-h-36 overflow-y-auto space-y-1">
              {cannedResponses.map((cr) => (
                <button
                  key={cr.id}
                  onClick={() => { setReplyText(cr.content); setShowCanned(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-white hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-colors group"
                >
                  <p className="text-xs font-semibold text-gray-700 group-hover:text-green-700 truncate">{cr.title}</p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{cr.content}</p>
                </button>
              ))}
            </div>
          )}
          {showCanned && cannedResponses.length === 0 && (
            <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-200/80 text-center text-xs text-gray-400 py-3">
              No canned responses yet — add some in <span className="font-medium text-green-600">Canned Responses</span>
            </div>
          )}
          <div className="px-3 py-2.5 flex items-end gap-2">
            <button
              onClick={() => setShowCanned((v) => !v)}
              title="Canned responses"
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showCanned ? "bg-green-600 text-white" : "bg-white text-gray-400 hover:text-green-600 hover:bg-green-50 border border-gray-200"}`}
            >
              <MessageSquareText className="w-4 h-4" />
            </button>
            <textarea
              rows={1}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply… (Enter to send)"
              disabled={sendReply.isPending}
              className="flex-1 resize-none rounded-2xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all disabled:opacity-60 max-h-28 overflow-y-auto leading-relaxed"
              style={{ minHeight: "38px" }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || sendReply.isPending}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-sm"
              aria-label="Send reply"
            >
              {sendReply.isPending
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 pb-2">
            Manual reply · Shift+Enter for new line
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Broadcast Modal ───────────────────────────────────────────────────────────

const PLACEHOLDERS = [
  { label: "{name}", title: "Customer name" },
  { label: "{phone}", title: "Customer phone" },
  { label: "{business}", title: "Business name" },
];

const TEMPLATES = [
  { label: "Special offer", text: "Hi {name}! 👋 We have a special offer just for you at {business}. Reply to find out more!" },
  { label: "Reminder", text: "Hi {name}! 🌟 Just a friendly reminder from {business}. We'd love to see you again soon!" },
  { label: "New service", text: "Hi {name}! We've added something new at {business} that we think you'll love. Reply for details! 😊" },
];

function BroadcastModal({
  open,
  onClose,
  selectedCustomers,
  businessId,
}: {
  open: boolean;
  onClose: () => void;
  selectedCustomers: { id: number; name: string | null; phone: string }[];
  businessId: number | undefined;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const broadcast = useBroadcastToCustomers();

  const previewCustomer = selectedCustomers[0];
  const preview = message
    .replace(/\{name\}/gi, previewCustomer?.name ?? previewCustomer?.phone ?? "Sarah")
    .replace(/\{phone\}/gi, previewCustomer?.phone ?? "+1-555-0101")
    .replace(/\{business\}/gi, "Your Business");

  function insertPlaceholder(ph: string) {
    const el = textareaRef.current;
    if (!el) { setMessage((m) => m + ph); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = message.slice(0, start) + ph + message.slice(end);
    setMessage(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + ph.length, start + ph.length);
    }, 0);
  }

  async function handleSend() {
    if (!message.trim() || selectedCustomers.length === 0) return;
    try {
      const result = await broadcast.mutateAsync({
        data: { customerIds: selectedCustomers.map((c) => c.id), message: message.trim() },
        params: { businessId },
      });
      if (result.failed === 0) {
        toast({ title: `Sent to ${result.sent} customer${result.sent !== 1 ? "s" : ""}`, description: "Personalised WhatsApp messages delivered.", variant: "success" });
      } else {
        toast({ title: `${result.sent} sent, ${result.failed} failed`, variant: "destructive" });
      }
      setMessage(""); setShowPreview(false); onClose();
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  }

  function handleClose() {
    if (!broadcast.isPending) { setMessage(""); setShowPreview(false); onClose(); }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg sm:rounded-2xl flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 flex-shrink-0 bg-gradient-to-r from-violet-600 to-purple-600">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white">Send Personalised Message</DialogTitle>
                <p className="text-xs text-white/75 mt-0.5">{selectedCustomers.length} customer{selectedCustomers.length !== 1 ? "s" : ""} selected</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-2 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick templates</p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((t) => (
                  <button key={t.label} onClick={() => setMessage(t.text)} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message</p>
              <textarea
                ref={textareaRef}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi {name}! 👋 We have something special for you..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 transition-all"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Insert placeholder</p>
              <div className="flex gap-2 flex-wrap">
                {PLACEHOLDERS.map((ph) => (
                  <button key={ph.label} onClick={() => insertPlaceholder(ph.label)} title={ph.title} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors">
                    + {ph.label}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <div>
                <button onClick={() => setShowPreview((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                  {showPreview ? "Hide preview" : "Preview message"}
                  {previewCustomer && <span className="text-purple-400 font-normal">for {previewCustomer.name ?? previewCustomer.phone}</span>}
                </button>
                {showPreview && (
                  <div className="mt-2 bg-[#e5ddd5] rounded-xl p-3">
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-[#dcf8c6] rounded-[18px] rounded-br-[4px] px-3.5 py-2.5 shadow-sm">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{preview}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
          <button onClick={handleClose} disabled={broadcast.isPending} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={handleSend} disabled={!message.trim() || broadcast.isPending} className="flex-[2] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {broadcast.isPending
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send to {selectedCustomers.length}</>
            }
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const businessId = useBusinessId();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<{ id: number; phone: string; name: string | null } | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const { data, isLoading } = useListCustomers({ search: search || undefined, tag: tagFilter, businessId });
  const customers = data?.customers ?? [];

  const allSelected = customers.length > 0 && customers.every((c) => checkedIds.has(c.id));

  const selectedCustomers = useMemo(
    () => customers.filter((c) => checkedIds.has(c.id)).map((c) => ({ id: c.id, phone: c.phone, name: c.name ?? null })),
    [customers, checkedIds]
  );

  function toggleCheck(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setCheckedIds((prev) => { const next = new Set(prev); customers.forEach((c) => next.delete(c.id)); return next; });
    } else {
      setCheckedIds((prev) => { const next = new Set(prev); customers.forEach((c) => next.add(c.id)); return next; });
    }
  }

  function clearChecked() { setCheckedIds(new Set()); }
  function invalidateCustomers() { qc.invalidateQueries({ queryKey: getListCustomersQueryKey({ businessId }) }); }

  return (
    <div className="space-y-5 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-sm text-gray-500 mt-1">{data?.total ?? 0} total customers</p>
      </div>

      {/* Search + Select All */}
      <div className="flex items-center gap-2">
        <div className="relative group flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
          <Input
            placeholder="Search by phone or name…"
            className="pl-10 h-11 rounded-xl border-gray-200 bg-white shadow-sm focus-visible:ring-green-400 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
          )}
        </div>
        {customers.length > 0 && (
          <button onClick={toggleAll} className="flex items-center gap-1.5 px-3 py-2 h-11 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap flex-shrink-0">
            {allSelected ? <CheckSquare className="w-4 h-4 text-violet-600" /> : <Square className="w-4 h-4 text-gray-400" />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* Tag filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setTagFilter(undefined); clearChecked(); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${tagFilter === undefined ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
        >
          All customers
        </button>
        {ALL_TAGS.map((tag) => {
          const style = TAG_STYLES[tag];
          const active = tagFilter === tag;
          return (
            <button
              key={tag}
              onClick={() => { setTagFilter(active ? undefined : tag); clearChecked(); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${active ? `${style.bg} ${style.text} ${style.border} shadow-sm` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
              {tag}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">
            {tagFilter ? `No "${tagFilter}" customers` : "No customers yet"}
          </p>
          <p className="text-sm mt-1">{tagFilter ? "Try a different tag filter." : "Customers appear here when they message your bot"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((c) => {
            const [bg, fg] = avatarColor(c.phone);
            const init = initials(c.name ?? null, c.phone);
            const isChecked = checkedIds.has(c.id);
            const msgCount = c.messageCount ?? 0;
            return (
              <div
                key={c.id}
                onClick={() => setDetail({ id: c.id, phone: c.phone, name: c.name ?? null })}
                className={`w-full text-left bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-150 border overflow-hidden cursor-pointer ${isChecked ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-100 hover:border-gray-200"}`}
              >
                <div className="p-4 flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleCheck(c.id, e)}
                    className="flex-shrink-0 text-gray-300 hover:text-violet-600 transition-colors"
                    aria-label={isChecked ? "Deselect" : "Select"}
                  >
                    {isChecked ? <CheckSquare className="w-5 h-5 text-violet-600" /> : <Square className="w-5 h-5" />}
                  </button>

                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full ${bg} ${fg} flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner`}>
                    {init}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.name ?? c.phone}
                      </p>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.tags.map((tag) => <TagBadge key={tag} tag={tag} />)}
                        </div>
                      )}
                    </div>
                    {c.name && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.phone}</p>}
                    {c.lastMessageAt && (
                      <p className="text-xs text-gray-400 mt-0.5">Last chat: {format(new Date(c.lastMessageAt), "MMM d, yyyy")}</p>
                    )}
                  </div>

                  {/* Message count badge — prominent */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[48px]">
                    <div className={`flex items-center justify-center rounded-2xl px-2.5 py-1 font-bold text-sm tabular-nums ${
                      msgCount === 0
                        ? "bg-gray-100 text-gray-400"
                        : msgCount >= 20
                        ? "bg-green-500 text-white shadow-sm shadow-green-200"
                        : "bg-green-50 text-green-700 border border-green-200"
                    }`}>
                      {msgCount}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 font-medium">chats</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating broadcast bar */}
      {checkedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-900 shadow-2xl shadow-black/30 border border-white/10">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-500 text-white text-xs font-bold flex-shrink-0">{checkedIds.size}</div>
              <span className="text-sm font-medium text-white truncate">customer{checkedIds.size !== 1 ? "s" : ""} selected</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setBroadcastOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-500 text-white hover:bg-violet-400 transition-colors">
                <Megaphone className="w-3.5 h-3.5" /> Send message
              </button>
              <button onClick={clearChecked} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Clear selection">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerDetail
        id={detail?.id ?? null}
        phone={detail?.phone ?? ""}
        name={detail?.name ?? null}
        open={!!detail}
        onClose={() => { setDetail(null); invalidateCustomers(); }}
        businessId={businessId}
      />

      <BroadcastModal
        open={broadcastOpen}
        onClose={() => { setBroadcastOpen(false); clearChecked(); }}
        selectedCustomers={selectedCustomers}
        businessId={businessId}
      />
    </div>
  );
}

