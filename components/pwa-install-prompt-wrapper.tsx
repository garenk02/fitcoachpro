"use client";

import dynamic from "next/dynamic";

// Dynamically import the PWA install prompt component to avoid SSR issues
const PWAInstallPrompt = dynamic(
  () => import("@/components/pwa-install-prompt").then((mod) => mod.PWAInstallPrompt),
  { ssr: false }
);

export function PWAInstallPromptWrapper() {
  return <PWAInstallPrompt />;
}
