import { fetchCharters } from "@/lib/api/captain-api";
import { isCaptainDbConfigured, viewExists } from "@/lib/api/captain-db";
import { prisma } from "@/lib/database/prisma";
import { Suspense } from "react";

async function checkMarketDb() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function checkCaptainDb() {
  if (!isCaptainDbConfigured())
    return { ok: false, error: "CAPTAIN_DATABASE_URL not set" };
  try {
    const exists = await viewExists();
    if (!exists) return { ok: false, error: "v_public_charters view missing" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function checkCaptainApi() {
  try {
    const charters = await fetchCharters();
    // Defensive: if fetchCharters returns undefined/null, treat as error
    if (!Array.isArray(charters)) {
      return { ok: false, error: "fetchCharters did not return an array." };
    }
    // If the API returns 0 charters, but the endpoint is reachable, that's OK
    return { ok: true, count: charters.length };
  } catch (e: any) {
    let errorMsg = e?.message || String(e);
    if (e?.stack) errorMsg += `\n${e.stack}`;
    return { ok: false, error: errorMsg };
  }
}

async function checkCaptainApiV1() {
  // Try to fetch a known charter (hardcoded or from env)
  const API_BASE_URL = process.env.FISHON_CAPTAIN_API_URL || "";
  const API_KEY = process.env.FISHON_CAPTAIN_API_KEY || "";
  const charterId = process.env.TEST_CHARTER_ID || "cmgbtc2cz0009uyrk10sbsuko";
  if (!API_BASE_URL || !API_KEY)
    return { ok: false, error: "API URL or KEY not set" };
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/public/v1/charters/${charterId}`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
      }
    );
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    return { ok: true, charter: data.charter?.id || null };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function DbHealthContent() {
  const [marketDb, captainDb, captainApi, captainApiV1] = await Promise.all([
    checkMarketDb(),
    checkCaptainDb(),
    checkCaptainApi(),
    checkCaptainApiV1(),
  ]);

  return (
    <>
      <div className="mt-4 space-y-4">
        <div>
          <h2 className="font-medium">Market DB</h2>
          <Status ok={marketDb.ok} error={marketDb.error} />
        </div>
        <div>
          <h2 className="font-medium">Captain DB (v_public_charters)</h2>
          <Status ok={captainDb.ok} error={captainDb.error} />
        </div>
        <div>
          <h2 className="font-medium">Captain API (legacy /api/charters)</h2>
          <Status
            ok={captainApi.ok}
            error={captainApi.error}
            extra={
              captainApi.count !== undefined
                ? `Count: ${captainApi.count}`
                : undefined
            }
          />
        </div>
        <div>
          <h2 className="font-medium">
            Captain API v1 (/api/public/v1/charters/:id)
          </h2>
          <Status
            ok={captainApiV1.ok}
            error={captainApiV1.error}
            extra={
              captainApiV1.charter
                ? `Charter ID: ${captainApiV1.charter}`
                : undefined
            }
          />
        </div>
      </div>
    </>
  );
}

function DbHealthSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="w-48 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-16 h-4 mt-2 bg-gray-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function DbHealthPage() {
  return (
    <main className="p-6 mx-auto max-w-7xl">
      <h1 className="text-xl font-semibold">Dev DB Health</h1>
      <Suspense fallback={<DbHealthSkeleton />}>
        <DbHealthContent />
      </Suspense>
    </main>
  );
}

function Status({
  ok,
  error,
  extra,
}: {
  ok: boolean;
  error?: string;
  extra?: string;
}) {
  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-2">
        {ok ? (
          <span className="font-semibold text-green-600">OK</span>
        ) : (
          <span className="font-semibold text-red-600">ERROR</span>
        )}
        {/* Only show extra if no error */}
        {extra && ok && <span className="text-xs text-black/60">{extra}</span>}
      </div>
      {error && (
        <pre className="max-w-xl p-2 overflow-x-auto text-xs text-red-700 break-all whitespace-pre-wrap rounded bg-red-50">
          {error}
        </pre>
      )}
    </div>
  );
}
