import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ForbiddenException, NotFoundException } from "../helpers/exceptions";
import {
  handleFormatFormData,
  handleGetAllQuery,
  handleRequest,
  jsonResponse,
} from "../handle-request";
import type { Middleware } from "../interfaces";

const createRequest = (
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) => new NextRequest(url, init);

describe("jsonResponse", () => {
  it.each([
    [false, "false"],
    [0, "0"],
    ["", '""'],
    [null, "null"],
  ] as const)("serializa %j como JSON", async (data, expected) => {
    const response = await jsonResponse({ data });

    expect(await response.text()).toBe(expected);
    expect(response.headers.get("content-type")).toBe("application/json");
  });

  it("deja el body vacío cuando data es undefined", async () => {
    const response = await jsonResponse({ data: undefined });

    expect(await response.text()).toBe("");
  });
});

describe("request helpers", () => {
  it("conserva query params repetidos", () => {
    expect(
      handleGetAllQuery(
        "https://example.test/api?tag=first&tag=second&page=1&empty=",
      ),
    ).toEqual({
      tag: ["first", "second"],
      page: "1",
      empty: "",
    });
  });

  it("convierte campos FormData repetidos en arrays", () => {
    const formData = new FormData();
    formData.append("tag", "first");
    formData.append("tag", "second");

    expect(handleFormatFormData(formData)).toEqual({
      tag: ["first", "second"],
    });
  });
});

describe("handleRequest", () => {
  it("procesa params, body, query, middleware y servicio", async () => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
    });
    const querySchema = z.object({ tag: z.array(z.string()) });
    const id = "00000000-0000-4000-8000-000000000000";

    type MiddlewareContext = {
      actor: string;
    };

    const middleware: Middleware<
      z.infer<typeof paramsSchema>,
      z.infer<typeof bodySchema>,
      z.infer<typeof querySchema>,
      MiddlewareContext
    > = async (_request, context) => {
      expect(context.params.id).toBe(id);
      expect(context.body.name).toBe("Ada");
      expect(context.queryParams.tag).toEqual(["first", "second"]);

      return { actor: "middleware" };
    };

    const response = await handleRequest({
      request: createRequest(
        "https://example.test/api/users?tag=first&tag=second",
        {
          method: "POST",
          body: JSON.stringify({ email: "ada@example.test", name: "Ada" }),
          headers: { "content-type": "application/json" },
        },
      ),
      payload: { params: Promise.resolve({ id }) },
      validateParams: paramsSchema,
      validate: bodySchema,
      validateQuery: querySchema,
      middleware: [middleware],
      services: ({ context }) => ({
        id: context.params.id,
        email: context.body.email,
        tags: context.queryParams.tag,
        actor: context.middlewareData.actor,
      }),
      codeResponse: 201,
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id,
      email: "ada@example.test",
      tags: ["first", "second"],
      actor: "middleware",
    });
  });

  it("devuelve 400 para JSON inválido", async () => {
    const response = await handleRequest({
      request: createRequest("https://example.test/api", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
      services: () => ({ ok: true }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Invalid request body",
      statusCode: 400,
    });
  });

  it("usa un objeto vacío para bodies vacíos", async () => {
    const response = await handleRequest({
      request: createRequest("https://example.test/api", { method: "POST" }),
      services: ({ context }) => context.body,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
  });

  it("procesa FormData y valida campos repetidos", async () => {
    const formData = new FormData();
    formData.append("tag", "first");
    formData.append("tag", "second");

    const schema = z.object({ tag: z.array(z.string()) });
    const response = await handleRequest({
      request: createRequest("https://example.test/api", {
        method: "POST",
        body: formData,
      }),
      bodyDataType: "form-data",
      validate: schema,
      services: ({ context }) => context.body,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tag: ["first", "second"] });
  });

  it("ejecuta middlewares en orden y acumula sus datos", async () => {
    type MiddlewareContext = {
      events: string[];
    };

    const first: Middleware<
      unknown,
      unknown,
      unknown,
      MiddlewareContext
    > = async (_request, context) => ({
      events: [...(context.middlewareData.events ?? []), "first"],
    });

    const second: Middleware<
      unknown,
      unknown,
      unknown,
      MiddlewareContext
    > = async (_request, context) => ({
      events: [...(context.middlewareData.events ?? []), "second"],
    });

    const response = await handleRequest({
      request: createRequest("https://example.test/api"),
      middleware: [first, second],
      services: ({ context }) => context.middlewareData,
    });

    expect(await response.json()).toEqual({ events: ["first", "second"] });
  });

  it.each([
    [new NotFoundException("missing"), 404, "missing"],
    [new ForbiddenException(), 403, "Forbidden"],
  ])(
    "convierte HttpError en una respuesta controlada",
    async (error, status, message) => {
      const response = await handleRequest({
        request: createRequest("https://example.test/api"),
        services: () => {
          throw error;
        },
      });

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({
        message,
        errors: null,
        statusCode: status,
      });
    },
  );

  it("oculta errores desconocidos y registra el fallo", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const service = vi.fn(() => ({ ok: true }));

    const response = await handleRequest({
      request: createRequest("https://example.test/api"),
      services: () => {
        throw new Error("private details");
      },
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      message: "Internal Server Error",
      statusCode: 500,
    });
    expect(consoleError).toHaveBeenCalledOnce();
    expect(service).not.toHaveBeenCalled();
  });

  it("convierte params rechazados en una respuesta 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const service = vi.fn(() => ({ ok: true }));

    const response = await handleRequest({
      request: createRequest("https://example.test/api/users/1"),
      payload: { params: Promise.reject(new Error("params failed")) },
      services: service,
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      message: "Internal Server Error",
      statusCode: 500,
    });
    expect(service).not.toHaveBeenCalled();
  });
});
