import { describe, expect, it } from "vitest";
import {
  BadRequestException,
  ForbiddenException,
  HttpError,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  ValidateException,
} from "../helpers/exceptions";

describe("HTTP exceptions", () => {
  it.each([
    [new BadRequestException(), 400, "Bad Request"],
    [new UnauthorizedException(), 401, "Unauthorized"],
    [new ForbiddenException(), 403, "Forbidden"],
    [new NotFoundException(), 404, "Resource not found"],
    [new InternalServerErrorException(), 500, "Internal Server Error"],
  ])("expone el estado y mensaje correctos", (error, status, message) => {
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(status);
    expect(error.message).toBe(message);
  });

  it("conserva una causa personalizada", () => {
    const cause = { reason: "conflict" };
    const error = new HttpError("Conflict", 409, cause);

    expect(error.statusCode).toBe(409);
    expect(error.cause).toBe(cause);
    expect(error.name).toBe("HttpError");
  });

  it("expone los issues de validación como causa", () => {
    const issues = [{ path: "email", message: "Invalid email" }];
    const error = new ValidateException(issues);

    expect(error.statusCode).toBe(400);
    expect(error.cause).toEqual(issues);
    expect(error.name).toBe("ValidateException");
  });
});
