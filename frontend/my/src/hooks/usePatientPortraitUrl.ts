/*
 File: frontend/my/src/hooks/usePatientPortraitUrl.ts
 Description: لود پرتره پرونده — dataUrl محلی، storageKey، یا GET portrait پس از رفرش
 Parent Dependencies: api/evidence, useStorageObjectUrl
 */

import { useEffect, useState } from "react";
import { fetchPatientPortrait, fetchStorageAsObjectUrl } from "@/lib/api/evidence";

type PatientPortraitSource = {
  photoDataUrl?: string | null;
  portraitStorageKey?: string | null;
  hasPortrait?: boolean;
  serverId?: string;
};

/**
 * بعد از رفرش dataUrl در حافظه نیست؛ از storageKey (snapshot) یا API پرتره می‌خوانیم.
 */
export function usePatientPortraitUrl(patient: PatientPortraitSource | null | undefined): {
  url: string | null;
  loading: boolean;
  failed: boolean;
  storageKey: string | null;
} {
  const dataUrl = patient?.photoDataUrl?.trim() || null;
  const knownKey = patient?.portraitStorageKey?.trim() || null;
  const hasPortrait = Boolean(patient?.hasPortrait);
  const serverId = patient?.serverId?.trim() || null;

  const [resolvedKey, setResolvedKey] = useState<string | null>(knownKey);
  const [url, setUrl] = useState<string | null>(dataUrl);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // همگام با props فوری (بدون انتظار شبکه)
  useEffect(() => {
    if (dataUrl) {
      setUrl(dataUrl);
      setFailed(false);
      return;
    }
    setResolvedKey(knownKey);
  }, [dataUrl, knownKey]);

  // اگر hasPortrait هست ولی کلید در snapshot نبود — از API بگیر
  useEffect(() => {
    if (dataUrl || knownKey || !hasPortrait || !serverId) return;
    let cancelled = false;
    setLoading(true);
    void fetchPatientPortrait(serverId)
      .then((p) => {
        if (cancelled) return;
        const key = p?.storageKey?.trim() || null;
        if (!key) {
          setFailed(true);
          return;
        }
        setResolvedKey(key);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataUrl, knownKey, hasPortrait, serverId]);

  // دانلود فایل با کلید
  useEffect(() => {
    if (dataUrl) return;
    const key = resolvedKey || knownKey;
    if (!key) {
      if (!hasPortrait) setUrl(null);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    setLoading(true);
    setFailed(false);
    void fetchStorageAsObjectUrl(key)
      .then((u) => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        if (!u) {
          setFailed(true);
          setUrl(null);
          return;
        }
        created = u;
        setUrl(u);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [dataUrl, resolvedKey, knownKey, hasPortrait]);

  return {
    url: dataUrl || url,
    loading: Boolean(loading && !dataUrl && !(url || dataUrl)),
    failed,
    storageKey: knownKey || resolvedKey,
  };
}
