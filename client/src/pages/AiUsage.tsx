import { useListAiUsage } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, DollarSign, Hash, Phone } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBusinessId } from "@/context/BusinessContext";

export default function AiUsagePage() {
  const businessId = useBusinessId();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAiUsage({ page, limit: 20, businessId });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalCost = data?.totalCost ?? 0;
  const totalTokens = data?.totalTokens ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Usage</h1>
        <p className="text-sm text-gray-500 mt-1">Only called when FAQ/service/booking didn't match</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-400 to-red-500" />
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">AI Calls</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">Total Tokens</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{totalTokens.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">Total Cost</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">${totalCost.toFixed(4)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No AI calls yet</p>
          <p className="text-sm mt-1">AI is only used as a last resort when no FAQ or service matches</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {log.customerPhone && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {log.customerPhone}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="text-xs">{log.totalTokens} tokens</Badge>
                    <Badge variant="outline" className="text-xs text-green-700 border-green-200">${log.estimatedCost.toFixed(5)}</Badge>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Customer asked:</p>
                    <p className="text-sm text-gray-700">{log.prompt}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-green-600 mb-0.5">AI responded:</p>
                    <p className="text-sm text-gray-700">{log.response}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
