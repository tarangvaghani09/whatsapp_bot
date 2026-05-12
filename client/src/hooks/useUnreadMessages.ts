import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_PREFIX = "whatsapp_bot_last_seen_";
const POLL_INTERVAL_MS = 30_000;

function storageKey(businessId: number | undefined) {
  return `${STORAGE_PREFIX}${businessId ?? "default"}`;
}

function getLastSeen(businessId: number | undefined): string | null {
  return localStorage.getItem(storageKey(businessId));
}

function setLastSeen(businessId: number | undefined, iso: string) {
  localStorage.setItem(storageKey(businessId), iso);
}

export function useUnreadMessages(businessId: number | undefined) {
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const businessIdRef = useRef(businessId);
  businessIdRef.current = businessId;

  const fetchCount = useCallback(async () => {
    const bid = businessIdRef.current;
    if (bid === undefined) return;

    const since = getLastSeen(bid);
    const params = new URLSearchParams({ businessId: String(bid) });
    if (since) params.append("since", since);

    try {
      const res = await fetch(`/api/messages/unread-count?${params}`);
      if (!res.ok) return;
      const data: { count: number } = await res.json();
      setCount(data.count);
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchCount();
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchCount, businessId]);

  const markRead = useCallback(() => {
    setLastSeen(businessIdRef.current, new Date().toISOString());
    setCount(0);
  }, []);

  return { count, markRead, refetch: fetchCount };
}
