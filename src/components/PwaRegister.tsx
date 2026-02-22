"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !window.location ||
      window.location.protocol !== "https:"
    ) {
      return;
    }

    navigator.serviceWorker
      .register("/service-worker.js")
      .catch(() => {});
  }, []);

  return null;
}

