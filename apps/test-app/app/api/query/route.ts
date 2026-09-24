import { handleRequest } from "@repo/route-forge";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    services: ({ context }) => context.queryParams,
  });
}
