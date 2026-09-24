---
name: route-forge
description: Build, review, and debug Next.js App Router route handlers with route-forge, handleRequest, Zod validation, FormData, dynamic params, middleware, and HttpError. Use when creating or refactoring typed API routes in Next.js.
license: MIT
compatibility: Requires Next.js 14 or newer and Zod 4.
metadata:
  author: asmel2020
  version: "0.1.0"
  package: route-forge
---

# Route Forge

Use Route Forge to standardize a Next.js App Router route handler without creating a router. The application still owns `app/api/**/route.ts`; `handleRequest` owns request parsing, validation, middleware execution, service execution, and JSON responses.

## Install

```bash
pnpm add route-forge zod
```

Next.js must be installed by the consuming application.

Install this skill for a compatible coding agent:

```bash
npx skills add asmel2020/route-forge --skill route-forge
```

## Required mental model

```text
Request -> body -> params -> query -> Zod validation -> middleware -> service -> JSON
```

Keep these rules:

1. Import the public API only from `route-forge`.
2. Keep the framework handler in `route.ts`.
3. Return data from the service, never a `Response`.
4. Pass dynamic route props as `payload` when using `params` validation.
5. Use `bodyDataType: "form-data"` only for `FormData`; `"raw"` means JSON.
6. Let middleware return an object that is merged into `context.middlewareData`.
7. Throw `HttpError` subclasses for controlled HTTP failures.
8. Do not duplicate Route Forge behavior in the route handler.

## Start from the template

Use [`assets/route-template.ts`](assets/route-template.ts) when creating a new endpoint. Adapt its schemas, middleware, and service to the route contract.

## Basic route

```ts
import { handleRequest } from "route-forge";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    services: () => ({ status: "ok" }),
  });
}
```

## Validated JSON body

```ts
import { handleRequest } from "route-forge";
import type { NextRequest } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export async function POST(request: NextRequest) {
  return handleRequest({
    request,
    validate: bodySchema,
    services: ({ context }) => ({
      email: context.body.email,
      name: context.body.name,
    }),
    codeResponse: 201,
  });
}
```

The body, query, and params types are inferred from their Zod schemas.

## Dynamic params

```ts
import { handleRequest } from "route-forge";
import type { NextRequest } from "next/server";
import { z } from "zod";

const paramsSchema = z.object({ id: z.string().uuid() });

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  return handleRequest({
    request,
    payload: context,
    validateParams: paramsSchema,
    services: ({ context: requestContext }) => ({
      id: requestContext.params.id,
    }),
  });
}
```

Always pass `payload: context`; Route Forge resolves both plain params and promises.

## Query params

Repeated keys become `string[]`:

```text
/api/users?tag=first&tag=second
→ { tag: ["first", "second"] }
```

Use a schema that accepts the actual shape:

```ts
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
});
```

## FormData

```ts
const uploadSchema = z.object({
  avatar: z.instanceof(File),
});

return handleRequest({
  request,
  bodyDataType: "form-data",
  validate: uploadSchema,
  services: ({ context }) => ({
    filename: context.body.avatar.name,
    size: context.body.avatar.size,
  }),
});
```

Repeated FormData fields are converted to arrays before validation.

## Middleware

Middleware executes sequentially. Each function receives `(request, context)` and returns a plain object. Returned values are merged in order.

```ts
import { UnauthorizedException, type Middleware } from "route-forge";

type AuthData = { user: { id: string } };

const auth: Middleware<unknown, unknown, unknown, AuthData> = async (
  request,
) => {
  const token = request.headers.get("authorization");

  if (!token) {
    throw new UnauthorizedException("Unauthorized");
  }

  return { user: { id: "user-123" } };
};
```

Use the `Middleware` type when the accumulated middleware data should be explicit.

## Controlled errors

```ts
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "route-forge";

throw new NotFoundException("User not found");
throw new UnauthorizedException();
throw new ForbiddenException();
throw new BadRequestException();
```

| Error                          | Status |
| ------------------------------ | -----: |
| `BadRequestException`          |    400 |
| `ValidateException`            |    400 |
| `UnauthorizedException`        |    401 |
| `ForbiddenException`           |    403 |
| `NotFoundException`            |    404 |
| `InternalServerErrorException` |    500 |
| `HttpError`                    | Custom |

Any unknown error is logged server-side and returned as a generic `500`.

## Response behavior

- JSON body parsing happens for `POST`, `PUT`, `PATCH`, and `DELETE`.
- Invalid JSON or unreadable FormData returns `400`.
- Empty JSON bodies become `{}`.
- `false`, `0`, `""`, and `null` serialize correctly.
- `undefined` produces an empty response body.
- `codeResponse` controls successful HTTP status codes.

## Avoid these mistakes

- Do not return `new Response(...)` from `services`.
- Do not read the request body before `handleRequest` when Route Forge must parse it.
- Do not use a synchronous params wrapper when Next passes a promise.
- Do not expect repeated query params to be collapsed into one string.
- Do not throw plain objects for controlled HTTP errors.
- Do not import private file paths; only the package root is public.
- Do not duplicate parsing, validation, or error response code in each route.

## API reference

Read [`references/API.md`](references/API.md) for the complete options, context shape, helper exports, and error behavior.

## Verification

For an application consuming the package:

```bash
pnpm check-types
pnpm test
```

When working inside the Route Forge repository:

```bash
pnpm --filter route-forge test
pnpm check-types
pnpm test:e2e
pnpm --filter route-forge package:check
```

## Completion checklist

- The route remains a normal Next.js App Router handler.
- All external input has an explicit Zod schema when validation is required.
- Dynamic params are passed through `payload`.
- The service returns serializable data.
- Middleware returns typed accumulated data.
- Controlled failures use `HttpError` subclasses.
- Type checking and relevant tests pass.
