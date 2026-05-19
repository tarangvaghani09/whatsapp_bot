import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { MessageCircle, Users, CalendarCheck, Brain, Banknote, TrendingUp, Zap, Star, PartyPopper } from "lucide-react";
import { useBusinessId } from "@/context/BusinessContext";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

function StarRatingDisplay({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-2xl font-bold text-gray-300">—</span>;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xl font-bold text-gray-900">{value.toFixed(1)}</span>
      <div className="flex items-center gap-0.5 mb-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3 h-3 ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const businessId = useBusinessId();
  const { data: stats, isLoading } = useGetDashboardStats({ businessId });

  if (isLoading) {
    return (
      <div className="space-y-6 min-h-[72vh]">
        <div className="space-y-2">
          <div className="h-9 w-52 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-5 w-96 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-72 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">No data yet for dashboard.</p>
          <div className="mt-5 max-w-5xl mx-auto rounded-xl border border-dashed border-gray-300 bg-white p-6">
            <p className="text-sm font-medium text-gray-700">No business selected or no records found.</p>
            <p className="text-sm text-gray-500 mt-1">
            Click <span className="font-semibold text-green-700">Add your first business</span> and then add FAQs/services/bookings to see analytics.
            </p>
          </div>
      </div>
    );
  }
  const safe = {
    totalMessages: stats.totalMessages ?? 0,
    totalCustomers: stats.totalCustomers ?? 0,
    pendingBookings: stats.pendingBookings ?? 0,
    completedBookings: stats.completedBookings ?? 0,
    messagesFromFaq: stats.messagesFromFaq ?? 0,
    messagesFromService: stats.messagesFromService ?? 0,
    messagesFromBooking: stats.messagesFromBooking ?? 0,
    messagesFromAi: stats.messagesFromAi ?? 0,
    faqSavingsPercent: stats.faqSavingsPercent ?? 0,
    todayMessages: stats.todayMessages ?? 0,
    totalAiTokens: stats.totalAiTokens ?? 0,
    totalAiCost: stats.totalAiCost ?? 0,
    avgRating: stats.avgRating,
  };

  const pieData = [
    { name: "FAQ", value: safe.messagesFromFaq },
    { name: "Service", value: safe.messagesFromService },
    { name: "Booking", value: safe.messagesFromBooking },
    { name: "AI", value: safe.messagesFromAi },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "FAQ", count: safe.messagesFromFaq, fill: "#22c55e" },
    { name: "Service", count: safe.messagesFromService, fill: "#3b82f6" },
    { name: "Booking", count: safe.messagesFromBooking, fill: "#f59e0b" },
    { name: "AI Fallback", count: safe.messagesFromAi, fill: "#ef4444" },
  ];

  const statCards = [
    {
      label: "Total Replies",
      value: safe.totalMessages,
      icon: MessageCircle,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Customers",
      value: safe.totalCustomers,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Pending Bookings",
      value: safe.pendingBookings,
      icon: CalendarCheck,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Completed",
      value: safe.completedBookings,
      icon: PartyPopper,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "AI Calls",
      value: safe.messagesFromAi,
      icon: Brain,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Cost Saved",
      value: `${safe.faqSavingsPercent}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Today Messages",
      value: safe.todayMessages,
      icon: Zap,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "AI Tokens Used",
      value: safe.totalAiTokens.toLocaleString(),
      icon: Brain,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "AI Cost",
      value: `$${safe.totalAiCost.toFixed(4)}`,
      icon: Banknote,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {safe.faqSavingsPercent}% of replies answered without OpenAI — saving you money.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Avg Rating card — special rendering */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Avg Rating</p>
                <div className="mt-1">
                  <StarRatingDisplay value={safe.avgRating} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Reply Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No messages yet
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} replies`, name]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full px-2">
                  {pieData.map((entry, i) => {
                    const total = pieData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                    return (
                      <div key={entry.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-gray-600 font-medium truncate">{entry.name}</span>
                        <span className="text-xs font-bold ml-auto" style={{ color: COLORS[i % COLORS.length] }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Replies by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

