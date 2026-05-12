import { useState, useEffect, useCallback, useRef } from "react";

const POLL_MS = 60_000;

export function useDeliveryFailureCount(businessId: number | undefined) {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const bidRef = useRef(businessId);
  bidRef.current = businessId;

  const fetch_ = useCallback(async () => {
    const bid = bidRef.current;
    if (bid === undefined) return;
    try {
      const res = await fetch(`/api/delivery-failures?businessId=${bid}`);
      if (!res.ok) return;
      const data: unknown[] = await res.json();
      setCount(data.length);
    } catch {}
  }, []);

  useEffect(() => {
    fetch_();
    timer.current = setInterval(fetch_, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetch_, businessId]);

  const clear = useCallback(() => setCount(0), []);

  return { count, refetch: fetch_, clear };
}
