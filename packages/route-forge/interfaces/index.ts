import type { z, ZodType, ZodTypeDef } from "zod";

export type RequestSchema = ZodType<unknown, ZodTypeDef, unknown>;
export type QueryParams = Record<string, string | string[]>;
export type MiddlewareData = Record<string, unknown>;

export interface ExtendsRequest extends Request {
  data?: Record<string, unknown>;
}

export interface RequestContext<
  P = unknown,
  B = unknown,
  M = unknown,
  Q = unknown,
> {
  [key: string]: unknown;
  params: P;
  body: B;
  middlewareData: M;
  queryParams: Q;
}

export interface RoutePayload<Params = unknown> {
  params?: Params | PromiseLike<Params>;
}

export type Middleware<
  P = unknown,
  B = unknown,
  Q = unknown,
  M extends object = MiddlewareData,
> = (
  request: ExtendsRequest,
  context: RequestContext<P, B, Partial<M>, Q>,
) => Partial<M> | PromiseLike<Partial<M>>;

export interface ServiceContext<
  P = unknown,
  B = unknown,
  M = unknown,
  Q = unknown,
> {
  request: ExtendsRequest;
  context: RequestContext<P, B, M, Q>;
}

export interface handleRequestType<
  P extends RequestSchema = RequestSchema,
  B extends RequestSchema = RequestSchema,
  Q extends RequestSchema = RequestSchema,
  M extends object = MiddlewareData,
> {
  request: ExtendsRequest;
  payload?: RoutePayload<z.input<P>>;
  validate?: B;
  validateQuery?: Q;
  validateParams?: P;
  middleware?: ReadonlyArray<Middleware<z.infer<P>, z.infer<B>, z.infer<Q>, M>>;
  bodyDataType?: "form-data" | "raw";
  services: (
    args: ServiceContext<z.infer<P>, z.infer<B>, M, z.infer<Q>>,
  ) => unknown;
  codeResponse?: number;
}
