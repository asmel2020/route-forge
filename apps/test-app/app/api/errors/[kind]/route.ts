import {
  ForbiddenException,
  handleRequest,
  NotFoundException,
} from "@repo/route-forge";
import type { NextRequest } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({
  kind: z.string().pipe(z.enum(["not-found", "forbidden"])),
});

type RouteContext = {
  params: Promise<{ kind: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest({
    request,
    payload: context,
    validateParams: paramsSchema,
    services: ({ context: requestContext }) => {
      if (requestContext.params.kind === "not-found") {
        throw new NotFoundException("Resource not found");
      }

      throw new ForbiddenException();
    },
  });
}
