"use client";

import { TripTrackingProvider } from "@/contexts/TripTrackingContext";
import { SidebarProvider } from "@/contexts/SidebarContext";

export function AppShellProviders({ children }: { children: React.ReactNode }) {
  return (
    <TripTrackingProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </TripTrackingProvider>
  );
}
