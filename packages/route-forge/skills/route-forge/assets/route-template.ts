import {
  handleRequest,
  type Middleware,
  NotFoundException,
} from "@dannyjgg/route-forge";
import type { NextRequest } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });
const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});
const querySchema = z.object({
  include: z.union([z.string(), z.array(z.string())]).optional(),
});

type RequestMetadata = {
  requestId: string;
};

const attachMetadata: Middleware<
  z.infer<typeof paramsSchema>,
  z.infer<typeof bodySchema>,
  z.infer<typeof querySchema>,
  RequestMetadata
> = async () => ({ requestId: crypto.randomUUID() });

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest({
    request,
    payload: context,
    validateParams: paramsSchema,
    validate: bodySchema,
    validateQuery: querySchema,
    middleware: [attachMetadata],
    services: async ({ context: requestContext }) => {
      const user = await findUser(requestContext.params.id);

      if (!user) {
        throw new NotFoundException("User not found");
      }

      return {
        id: user.id,
        email: requestContext.body.email,
        name: requestContext.body.name,
        include: requestContext.queryParams.include,
        requestId: requestContext.middlewareData.requestId,
      };
    },
    codeResponse: 201,
  });
}

async function findUser(id: string) {
  return { id, email: "user@example.com", name: "User" };
}
