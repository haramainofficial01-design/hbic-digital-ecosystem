import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultContent, normalizeContent, type HbicContent } from "@hbic/shared";

type ContentSource = "api" | "bundled-fallback";

interface PublishedContentContextValue {
  content: HbicContent;
  loading: boolean;
  source: ContentSource;
  refresh: () => Promise<void>;
}

const PublishedContentContext = createContext<PublishedContentContextValue | undefined>(undefined);
const apiBase = (process.env.EXPO_PUBLIC_API_URL || "https://hbic-calgary-app.vercel.app").replace(/\/$/, "");

export function PublishedContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HbicContent>(defaultContent);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<ContentSource>("bundled-fallback");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/content/published`);
      const data = await response.json();
      if (response.ok && data?.content) {
        setContent(normalizeContent(data.content));
        setSource("api");
      } else {
        setContent(defaultContent);
        setSource("bundled-fallback");
      }
    } catch {
      setContent(defaultContent);
      setSource("bundled-fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ content, loading, refresh, source }), [content, loading, refresh, source]);

  return <PublishedContentContext.Provider value={value}>{children}</PublishedContentContext.Provider>;
}

export function usePublishedContent() {
  const value = useContext(PublishedContentContext);
  if (!value) throw new Error("usePublishedContent must be used inside PublishedContentProvider");
  return value;
}
