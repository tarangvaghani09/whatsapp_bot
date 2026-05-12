import { useState, useRef, useEffect } from "react";
import { useSimulateMessage } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, FlaskConical, Zap, BookOpen, Wrench, CalendarCheck, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessId } from "@/context/BusinessContext";

type ReplyType = "faq" | "service" | "booking" | "ai" | "none";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
  replyType?: ReplyType;
  matchedFaqQuestion?: string | null;
  matchedServiceName?: string | null;
  aiTokensUsed?: number | null;
  isThinking?: boolean;
};

const REPLY_CONFIG: Record<ReplyType, { label: string; color: string; dot: string; icon: React.ReactNode; desc: string }> = {
  faq: {
    label: "FAQ Match",
    color: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    icon: <BookOpen className="w-3 h-3" />,
    desc: "Answered from FAQ database — no AI cost",
  },
  service: {
    label: "Service Match",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: <Wrench className="w-3 h-3" />,
    desc: "Answered from service/pricing database — no AI cost",
  },
  booking: {
    label: "Booking Intent",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: <CalendarCheck className="w-3 h-3" />,
    desc: "Detected booking intent — no AI cost",
  },
  ai: {
    label: "AI Fallback",
    color: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    icon: <Sparkles className="w-3 h-3" />,
    desc: "No FAQ/service match — OpenAI was called",
  },
  none: {
    label: "No Match",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    icon: <Info className="w-3 h-3" />,
    desc: "No response",
  },
};

const EXAMPLE_MESSAGES = [
  "Hi!",
  "What are your opening hours?",
  "How much does a haircut cost?",
  "I want to book an appointment",
  "Do you accept credit cards?",
  "Where are you located?",
];

let nextId = 1;

export default function TestBotPage() {
  const businessId = useBusinessId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const simulate = useSimulateMessage();

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: nextId++, role: "user", text: trimmed };
    const thinkingMsg: Message = { id: nextId++, role: "bot", text: "", isThinking: true };

    setMessages((prev) => [...prev, userMsg, thinkingMsg]);
    setInput("");

    simulate.mutate(
      { data: { message: trimmed }, params: { businessId } },
      {
        onSuccess: (data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.isThinking
                ? {
                    ...m,
                    text: data.response,
                    replyType: data.replyType as ReplyType,
                    matchedFaqQuestion: data.matchedFaqQuestion,
                    matchedServiceName: data.matchedServiceName,
                    aiTokensUsed: data.aiTokensUsed,
                    isThinking: false,
                  }
                : m,
            ),
          );
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.isThinking
                ? { ...m, text: "Error — could not get a response. Check the server logs.", isThinking: false, replyType: "none" }
                : m,
            ),
          );
        },
      },
    );

    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const canSend = !!input.trim() && !simulate.isPending;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-5rem)] sm:h-[calc(100vh-7rem)]">
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md shadow-green-200 flex-shrink-0">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Test Bot</h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-tight">
              Simulate messages — see which reply path fires
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" style={{ background: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)" }}>
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-6 space-y-4 px-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                <Bot className="w-9 h-9 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-base">Send a message to test the bot</p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Each reply shows whether it came from FAQ, service data, booking detection, or AI</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {EXAMPLE_MESSAGES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => sendMessage(ex)}
                    className="text-xs bg-white border border-gray-200 rounded-full px-3.5 py-1.5 text-gray-600 font-medium hover:border-green-400 hover:text-green-700 hover:bg-green-50 hover:shadow-sm active:scale-[0.97] transition-all duration-150 shadow-sm"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "bot" && (
                <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-green-600" />
                </div>
              )}

              <div className={cn("max-w-[80%] space-y-1.5", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-md shadow-md shadow-green-200"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm",
                  )}
                >
                  {msg.isThinking ? (
                    <div className="flex items-center gap-1.5 py-0.5 px-1">
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                  )}
                </div>

                {msg.role === "bot" && !msg.isThinking && msg.replyType && (
                  <div className="flex flex-col gap-1 px-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-[11px] gap-1 py-0 h-5 font-medium", REPLY_CONFIG[msg.replyType].color)}
                      >
                        {REPLY_CONFIG[msg.replyType].icon}
                        {REPLY_CONFIG[msg.replyType].label}
                      </Badge>
                      {msg.replyType === "ai" && msg.aiTokensUsed != null && (
                        <Badge variant="outline" className="text-[11px] gap-1 py-0 h-5 text-red-600 border-red-200 bg-red-50">
                          <Zap className="w-2.5 h-2.5" />
                          {msg.aiTokensUsed} tokens
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">{REPLY_CONFIG[msg.replyType].desc}</p>
                    {msg.matchedFaqQuestion && (
                      <p className="text-[11px] text-green-600">Matched FAQ: "{msg.matchedFaqQuestion}"</p>
                    )}
                    {msg.matchedServiceName && (
                      <p className="text-[11px] text-blue-600">Matched service: "{msg.matchedServiceName}"</p>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-gray-500" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 bg-white px-4 py-2.5 flex gap-5 flex-wrap">
          {(["faq", "service", "booking", "ai"] as ReplyType[]).map((type) => (
            <div key={type} className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
              <span className={cn("w-2 h-2 rounded-full", REPLY_CONFIG[type].dot)} />
              {REPLY_CONFIG[type].label}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a customer message…"
                disabled={simulate.isPending}
                autoFocus
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!canSend}
              className="h-11 w-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center shadow-lg shadow-green-200 hover:from-green-600 hover:to-green-700 active:scale-[0.95] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {simulate.isPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 text-center">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono border border-gray-200">Enter</kbd> to send
          </p>
        </div>
      </div>
    </div>
  );
}
