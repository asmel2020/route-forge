import { expect, test } from "@playwright/test";

const validUserId = "00000000-0000-4000-8000-000000000000";
const validUser = {
  email: "ada@example.test",
  name: "Ada",
};

test.describe("Route Forge API", () => {
  test("responde el health check", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("conserva query params repetidos", async ({ request }) => {
    const response = await request.get(
      "/api/query?tag=first&tag=second&page=1",
    );

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      tag: ["first", "second"],
      page: "1",
    });
  });

  test("procesa body, params y middleware en una ruta válida", async ({
    request,
  }) => {
    const response = await request.post(`/api/users/${validUserId}`, {
      data: validUser,
    });

    expect(response.status()).toBe(201);
    expect(await response.json()).toEqual({
      id: validUserId,
      ...validUser,
      source: "e2e",
    });
  });

  test("devuelve errores de validación del body", async ({ request }) => {
    const response = await request.post(`/api/users/${validUserId}`, {
      data: { email: "invalid", name: "A" },
    });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body.message).toBe("Input validation error");
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "email" }),
        expect.objectContaining({ path: "name" }),
      ]),
    );
  });

  test("devuelve errores de validación de params", async ({ request }) => {
    const response = await request.post("/api/users/not-a-uuid", {
      data: validUser,
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      message: "Input validation error",
      statusCode: 400,
    });
  });

  test("convierte NotFoundException en 404", async ({ request }) => {
    const response = await request.get("/api/errors/not-found");

    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({
      message: "Resource not found",
      errors: null,
      statusCode: 404,
    });
  });

  test("convierte ForbiddenException en 403", async ({ request }) => {
    const response = await request.get("/api/errors/forbidden");

    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      message: "Forbidden",
      errors: null,
      statusCode: 403,
    });
  });
});
