import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ValidateException } from "../helpers/exceptions";
import { Validate } from "../helpers/validate";

describe("Validate", () => {
  it("devuelve datos transformados por Zod", () => {
    const schema = z.object({
      age: z.coerce.number().int().positive(),
    });

    expect(Validate(schema, { age: "42" })).toEqual({ age: 42 });
  });

  it("convierte errores de Zod en ValidateException", () => {
    const schema = z.object({
      email: z.string().email(),
    });

    try {
      Validate(schema, { email: "invalid" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ValidateException);
      expect(error).toMatchObject({
        statusCode: 400,
        cause: [
          {
            path: "email",
            message: expect.any(String),
          },
        ],
      });
    }
  });

  it("propaga errores que no pertenecen a Zod", () => {
    const originalError = new Error("parse failed");
    const schema = {
      parse: () => {
        throw originalError;
      },
    } as unknown as z.ZodType<string>;

    expect(() => Validate(schema, null)).toThrowError(originalError);
  });
});
