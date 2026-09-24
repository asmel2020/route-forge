import type { z } from "zod";
import { HttpError } from "./helpers/exceptions.js";
import { Validate } from "./helpers/validate.js";
import type {
  handleRequestType,
  Middleware,
  MiddlewareData,
  QueryParams,
  RequestContext,
  RequestSchema,
} from "./interfaces/index.js";

const methodsWithBody = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  if (value === null) {
    return false;
  }

  if (typeof value !== "object" && typeof value !== "function") {
    return false;
  }

  return "then" in value && typeof value.then === "function";
};

export const jsonResponse = ({
  data,
  statusCode = 200,
  headers = { "content-type": "application/json" },
}: {
  data?: unknown;
  statusCode?: number;
  headers?: HeadersInit;
}): Response => {
  const body = data === undefined ? null : JSON.stringify(data);

  return new Response(body ?? null, {
    headers,
    status: statusCode,
  });
};

export const handleGetAllQuery = (url: string): QueryParams => {
  const searchParams = new URL(url).searchParams;
  const queryValues = new Map<string, string | string[]>();

  searchParams.forEach((value, key) => {
    const currentValue = queryValues.get(key);

    if (currentValue === undefined) {
      queryValues.set(key, value);
      return;
    }

    if (Array.isArray(currentValue)) {
      currentValue.push(value);
      return;
    }

    queryValues.set(key, [currentValue, value]);
  });

  return Object.fromEntries(queryValues);
};

export const handleFormatFormData = (formData: FormData) => {
  const formDataValues = new Map<
    string,
    FormDataEntryValue | FormDataEntryValue[]
  >();

  formData.forEach((value, key) => {
    const currentValue = formDataValues.get(key);

    if (currentValue === undefined) {
      formDataValues.set(key, value);
      return;
    }

    if (Array.isArray(currentValue)) {
      currentValue.push(value);
      return;
    }

    formDataValues.set(key, [currentValue, value]);
  });

  return Object.fromEntries(formDataValues);
};

export const handleMiddleware = async <
  P = unknown,
  B = unknown,
  Q = unknown,
  M extends object = MiddlewareData,
>({
  request,
  context,
  middleware = [],
}: {
  request: handleRequestType["request"];
  context: RequestContext<P, B, Partial<M>, Q>;
  middleware?: ReadonlyArray<Middleware<P, B, Q, M>>;
}) => {
  for (const middlewareFunction of middleware) {
    const result = await middlewareFunction(request, context);

    context.middlewareData = {
      ...context.middlewareData,
      ...result,
    } as Partial<M>;
  }

  return { request, context };
};

export const handleRequest = async <
  P extends RequestSchema = RequestSchema,
  B extends RequestSchema = RequestSchema,
  Q extends RequestSchema = RequestSchema,
  M extends object = MiddlewareData,
>({
  request,
  payload,
  validate,
  validateQuery,
  validateParams,
  middleware,
  services,
  bodyDataType = "raw",
  codeResponse = 200,
}: handleRequestType<P, B, Q, M>): Promise<Response> => {
  let body: unknown = {};

  if (methodsWithBody.has(request.method)) {
    try {
      if (bodyDataType === "raw") {
        const text = await request.text();
        body = text.trim() ? JSON.parse(text) : {};
      }

      if (bodyDataType === "form-data") {
        body = handleFormatFormData(await request.formData());
      }
    } catch {
      return jsonResponse({
        data: { message: "Invalid request body", statusCode: 400 },
        statusCode: 400,
      });
    }
  }

  const content = {
    params: {},
    body,
    queryParams: handleGetAllQuery(request.url),
    middlewareData: {},
  } as RequestContext<z.infer<P>, z.infer<B>, M, z.infer<Q>>;

  try {
    if (payload) {
      const rawParams = payload.params;
      content.params = (
        isPromiseLike(rawParams) ? await rawParams : (rawParams ?? {})
      ) as z.infer<P>;
    }

    if (validateParams) {
      content.params = Validate(validateParams, content.params);
    }

    if (validateQuery) {
      content.queryParams = Validate(validateQuery, content.queryParams);
    }

    if (validate) {
      content.body = Validate(validate, content.body);
    }

    if (middleware) {
      const { context: middlewareContext } = await handleMiddleware({
        request,
        context: content,
        middleware,
      });

      content.middlewareData = middlewareContext.middlewareData as M;
    }

    const data = await services({ request, context: content });

    return jsonResponse({ data, statusCode: codeResponse });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({
        data: {
          message: error.message,
          errors: error.cause ?? null,
          statusCode: error.statusCode,
        },
        statusCode: error.statusCode,
      });
    }

    console.error("[handleRequest] Unhandled error:", error);
    return jsonResponse({
      data: { message: "Internal Server Error", statusCode: 500 },
      statusCode: 500,
    });
  }
};
