"use client";

import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

interface SessionWrapperProps {
  children: ReactNode;
}

/**
 * Client component that provides session context.
 * Uses useSession hook instead of server-side auth() to avoid
 * blocking prerendering in Cache Components mode.
 */
export function SessionWrapper({ children }: SessionWrapperProps) {
  // Session is fetched client-side, allowing layout to prerender
  const { data: session, status } = useSession();

  // Children can access session via useSession() hook
  return <>{children}</>;
}
