import { NextResponse } from "next/server";
import { API_BASE } from "@/lib/api";

export async function GET() {
  try {
    // Try common health endpoints
    const candidates = [
      "/health",
      "/api/health",
      "/auth/health",
    ];

    let res: Response | undefined;
    let lastError: any;
    for (const path of candidates) {
      try {
        res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
        if (res.ok || res.status < 500) break;
      } catch (e: any) {
        lastError = e;
      }
    }

    if (!res) {
      return NextResponse.json(
        { ok: false, error: "Auth service unreachable", base: API_BASE },
        { status: 502 }
      );
    }

    let payload: any = null;
    const text = await res.text();
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        base: API_BASE,
        targetPath: res.url.replace(API_BASE, ""),
        payload,
      },
      { status: res.status }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Proxy error", base: API_BASE },
      { status: 500 }
    );
  }
}