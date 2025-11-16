import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockQueryRaw, mockFetchCharterById, mockIsCaptainDbConfigured } =
  vi.hoisted(() => ({
    mockQueryRaw: vi.fn(),
    mockFetchCharterById: vi.fn(),
    mockIsCaptainDbConfigured: vi.fn(() => true),
  }));

vi.mock("@/lib/database/prisma-captain", () => ({
  prismaCaptain: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@/lib/api/captain-db", () => ({
  isCaptainDbConfigured: mockIsCaptainDbConfigured,
  fetchChartersFromDb: vi.fn(),
  fetchCharterByIdFromDb: vi.fn(),
  searchChartersFromDb: vi.fn(),
}));

vi.mock("@/lib/api/captain-api", () => ({
  fetchCharters: vi.fn(),
  fetchCharterById: mockFetchCharterById,
  searchCharters: vi.fn(),
}));

import { getCharterFlowType } from "../charter-service";

describe("getCharterFlowType", () => {
  const originalEnv = { ...process.env };
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  beforeEach(() => {
    mockQueryRaw.mockReset();
    mockFetchCharterById.mockReset();
    mockIsCaptainDbConfigured.mockReset();
    mockIsCaptainDbConfigured.mockReturnValue(true);
    warnSpy.mockClear();
    errorSpy.mockClear();
    logSpy.mockClear();
    process.env = { ...originalEnv };
    process.env.USE_CAPTAIN_DB = "1";
    process.env.FISHON_CAPTAIN_API_URL = "https://example.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns DB bookingFlowType when the captain view includes a value", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { charter: { bookingFlowType: "AUTO" } },
    ]);

    const result = await getCharterFlowType("charter-db-auto");

    expect(result).toBe("AUTO");
    expect(mockFetchCharterById).not.toHaveBeenCalled();
  });

  it("falls back to API when DB query fails and returns the API flow type", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("db offline"));
    mockFetchCharterById.mockResolvedValueOnce({ bookingFlowType: "AUTO" });

    const result = await getCharterFlowType("charter-api-auto");

    expect(mockFetchCharterById).toHaveBeenCalledWith("charter-api-auto");
    expect(result).toBe("AUTO");
  });

  it("defaults to MANUAL and logs guest-safe warning when flow data is missing", async () => {
    process.env.USE_CAPTAIN_DB = "0";
    mockIsCaptainDbConfigured.mockReturnValue(false);
    mockFetchCharterById.mockResolvedValueOnce(null);

    const result = await getCharterFlowType("charter-manual-fallback");

    expect(result).toBe("MANUAL");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("guest checkout fallback to MANUAL")
    );
  });
});
