"use client";

import { TripTrackingProvider } from "@/contexts/TripTrackingContext";

export function AppShellProviders({ children }: { children: React.ReactNode }) {
  return <TripTrackingProvider>{children}</TripTrackingProvider>;
}
