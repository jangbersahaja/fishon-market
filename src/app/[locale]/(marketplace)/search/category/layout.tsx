import MapScriptLoader from "@/components/maps/MapScriptLoader";
import type { ReactNode } from "react";

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MapScriptLoader />
      {children}
    </>
  );
}
