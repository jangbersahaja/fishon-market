import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database/prisma", () => {
  return {
    prisma: {
      booking: {
        updateMany: vi.fn(),
      },
    },
  };
});
vi.mock("@/lib/auth/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { POST as pay } from "../pay/route";
import { POST as webhook } from "../status-webhook/route";

function jsonReq(body: any, headers?: Record<string, string>) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.resetAllMocks());

describe("status webhook", () => {
  beforeEach(() => {
    process.env.CAPTAIN_API_SECRET = "cap-secret";
  });

  it("rejects invalid secret", async () => {
    const r = await webhook(jsonReq({ id: "b1", status: "APPROVED" }));
    expect(r.status).toBe(401);
  });

  it("approves pending booking", async () => {
    (prisma.booking.updateMany as any).mockResolvedValue({ count: 1 });
    const r = await webhook(
      jsonReq(
        { id: "b1", status: "APPROVED" },
        { "x-captain-secret": "cap-secret" }
      )
    );
    expect(r.status).toBe(200);
  });
});

describe("pay endpoint", () => {
  it("requires auth", async () => {
    (auth as any).mockResolvedValue(null);
    const r = await pay(jsonReq({ id: "b1" }));
    expect(r.status).toBe(401);
  });

  it("marks approved booking as paid for owner", async () => {
    (auth as any).mockResolvedValue({ user: { id: "u1" } });
    (prisma.booking.updateMany as any).mockResolvedValue({ count: 1 });
    const r = await pay(jsonReq({ id: "b1" }));
    expect(r.status).toBe(200);
  });
});
