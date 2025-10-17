// This file verifies that src/lib/api.ts exists
import { API_BASE } from "@/lib/api";

export async function GET() {
  return Response.json({
    status: "ok",
    message: "api.ts file is found and working",
    apiBase: API_BASE
  });
}
