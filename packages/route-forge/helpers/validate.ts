import { ZodError } from "zod";
import type { z, ZodType } from "zod";
import { ValidateException } from "./exceptions.js";

export const Validate = <T extends ZodType<unknown, unknown>>(
  Schema: T,
  data: unknown,
): z.infer<T> => {
  try {
    return Schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      throw new ValidateException(issues);
    }

    throw error;
  }
};
