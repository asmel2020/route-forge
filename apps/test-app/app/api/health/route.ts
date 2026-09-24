import { handleRequest } from "route-forge";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    services: () => ({ status: "ok" }),
  });
}
