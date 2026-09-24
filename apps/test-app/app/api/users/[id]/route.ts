import { handleRequest } from "@repo/route-forge";
import type { Middleware } from "@repo/route-forge";
import type { NextRequest } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

type RequestMetadata = {
  source: string;
};

const attachMetadata: Middleware<
  z.infer<typeof paramsSchema>,
  z.infer<typeof bodySchema>,
  unknown,
  RequestMetadata
> = async () => ({ source: "e2e" });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest({
    request,
    payload: context,
    validateParams: paramsSchema,
    validate: bodySchema,
    middleware: [attachMetadata],
    services: ({ context: requestContext }) => ({
      id: requestContext.params.id,
      email: requestContext.body.email,
      name: requestContext.body.name,
      source: requestContext.middlewareData.source,
    }),
    codeResponse: 201,
  });
}
