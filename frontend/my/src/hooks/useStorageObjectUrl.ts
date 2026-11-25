/*
 File: frontend/src/hooks/useStorageObjectUrl.ts
 Description: لود تنبل object URL از storageKey با revoke در unmount
 Parent Dependencies: api/evidence fetchStorageAsObjectUrl
 */

import { useEffect, useState } from "react";
import { fetchStorageAsObjectUrl } from "@/lib/api/evidence";

/** بدون کلید درخواست نزن؛ برای تامنیل‌های قابل‌مشاهده در viewport */
export function useStorageObjectUrl(storageKey: string | null | undefined): {
  url: string | null;
  failed: boolean;
} {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setUrl(null);
    setFailed(false);
    if (!storageKey) return;
    void fetchStorageAsObjectUrl(storageKey)
      .then((u) => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        if (!u) {
          setFailed(true);
          return;
        }
        created = u;
        setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [storageKey]);

  return { url, failed };
}
