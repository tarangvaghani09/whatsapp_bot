import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type BusinessInfo = {
  id: number;
  name: string;
  whatsappPhoneNumberId: string | null;
  createdAt: string;
  updatedAt: string;
};

type BusinessContextValue = {
  businesses: BusinessInfo[];
  businessId: number | null;
  setBusinessId: (id: number) => void;
  loading: boolean;
  refetch: () => Promise<void>;
};

const BusinessContext = createContext<BusinessContextValue>({
  businesses: [],
  businessId: null,
  setBusinessId: () => {},
  loading: true,
  refetch: async () => {},
});

const STORAGE_KEY = "whatsapp_bot_selected_business_id";
function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([]);
  const [businessId, setBusinessIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = async () => {
    try {
      const res = await fetch(apiUrl("/api/businesses"), { credentials: "include" });
      if (!res.ok) return;
      const data: BusinessInfo[] = await res.json();
      setBusinesses(data);

      if (data.length > 0) {
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedId = stored ? Number(stored) : null;
        const valid = storedId && data.some((b) => b.id === storedId);
        if (!valid) {
          setBusinessIdState(data[0].id);
          localStorage.setItem(STORAGE_KEY, String(data[0].id));
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const setBusinessId = (id: number) => {
    setBusinessIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  };

  return (
    <BusinessContext.Provider value={{ businesses, businessId, setBusinessId, loading, refetch: fetchBusinesses }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}

export function useBusinessId(): number | undefined {
  const { businessId } = useContext(BusinessContext);
  return businessId ?? undefined;
}
