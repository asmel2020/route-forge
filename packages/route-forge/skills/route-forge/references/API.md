# Route Forge API

## `handleRequest`

```ts
handleRequest(options): Promise<Response>
```

### Options

| Option           | Type                                         | Required | Behavior                                                       |
| ---------------- | -------------------------------------------- | -------- | -------------------------------------------------------------- |
| `request`        | `Request`                                    | Yes      | Request passed to the pipeline and service.                    |
| `services`       | `(args) => unknown`                          | Yes      | Business function receiving `request` and validated `context`. |
| `payload`        | `{ params?: Params \| PromiseLike<Params> }` | No       | Framework route payload, usually `{ params }`.                 |
| `validate`       | Zod schema                                   | No       | Validates and transforms the body.                             |
| `validateQuery`  | Zod schema                                   | No       | Validates and transforms query params.                         |
| `validateParams` | Zod schema                                   | No       | Validates and transforms route params.                         |
| `middleware`     | `Middleware[]`                               | No       | Runs sequentially and merges returned objects.                 |
| `bodyDataType`   | `"raw" \| "form-data"`                       | No       | JSON by default; use `form-data` for uploads.                  |
| `codeResponse`   | `number`                                     | No       | Successful status, default `200`.                              |

## Request context

```ts
interface RequestContext<P, B, M, Q> {
  params: P;
  body: B;
  middlewareData: M;
  queryParams: Q;
}
```

`P`, `B`, and `Q` are inferred from Zod schemas. `M` is inferred from typed middleware or can be supplied explicitly.

## Service context

```ts
interface ServiceContext<P, B, M, Q> {
  request: ExtendsRequest;
  context: RequestContext<P, B, M, Q>;
}
```

The service must return JSON-serializable data. Route Forge creates the `Response`.

## Middleware

```ts
type Middleware<P, B, Q, M> = (
  request: ExtendsRequest,
  context: RequestContext<P, B, Partial<M>, Q>,
) => Partial<M> | PromiseLike<Partial<M>>;
```

Middleware can inspect validated request data and return partial accumulated data. Later middleware receives the updated `middlewareData`.

## Query normalization

| Input          | Context value         |
| -------------- | --------------------- |
| `?page=1`      | `{ page: "1" }`       |
| `?tag=a&tag=b` | `{ tag: ["a", "b"] }` |
| `?empty=`      | `{ empty: "" }`       |

Use Zod coercion for numbers, dates, booleans, and other transformations.

## FormData normalization

- One field becomes its `FormDataEntryValue`.
- Repeated fields become an array.
- Zod validates the normalized object.
- Use `z.instanceof(File)` for uploaded files.

## Public exports

| Export                         | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `handleRequest`                | Main request pipeline.                                      |
| `handleMiddleware`             | Sequential middleware runner.                               |
| `handleGetAllQuery`            | Normalizes query params, preserving repeated values.        |
| `handleFormatFormData`         | Converts FormData into a plain object.                      |
| `jsonResponse`                 | Creates the package's JSON response shape.                  |
| `Validate`                     | Parses with Zod and converts issues to `ValidateException`. |
| `HttpError`                    | Base controlled HTTP error.                                 |
| `BadRequestException`          | HTTP 400.                                                   |
| `ValidateException`            | HTTP 400 with field issues.                                 |
| `UnauthorizedException`        | HTTP 401.                                                   |
| `ForbiddenException`           | HTTP 403.                                                   |
| `NotFoundException`            | HTTP 404.                                                   |
| `InternalServerErrorException` | HTTP 500.                                                   |

## Error response

Controlled errors use this shape:

```json
{
  "message": "Resource not found",
  "errors": null,
  "statusCode": 404
}
```

Validation errors include normalized field issues:

```json
{
  "message": "Input validation error",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email"
    }
  ],
  "statusCode": 400
}
```

Unknown errors are logged with `console.error` and converted to:

```json
{
  "message": "Internal Server Error",
  "statusCode": 500
}
```

## Compatibility

- Next.js 14 or newer.
- Zod 4.
- ESM-only JavaScript package.
- Type declarations included.
- Runtime API based on the standard `Request`, `Response`, `FormData`, and `URL` types.
