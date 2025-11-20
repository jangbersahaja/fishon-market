// src/app/charters/view/page.tsx
import { getCharters } from "@/lib/services/charter-service";
import Link from "next/link";

export default async function ViewIndex() {
  const charters = await getCharters();
  const first = charters[0];

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Charters</h1>
      {!first ? (
        <p className="mt-2 text-gray-600">No charters available yet.</p>
      ) : (
        <div className="mt-2">
          <p className="text-gray-700">Try a sample charter:</p>
          <Link
            href={`/charters/view/${
              (first as any).backendId || String(first.id)
            }`}
            className="text-red-600 underline"
          >
            View {first.name}
          </Link>
        </div>
      )}
    </main>
  );
}
