"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function snapshot() {
  return new URLSearchParams(window.location.hash.slice(1)).get("token");
}

export function useFragmentToken(): string | null | undefined {
  return useSyncExternalStore(subscribe, snapshot, () => undefined);
}
