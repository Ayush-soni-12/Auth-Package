import { z } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    // Return only the specific error messages to the client
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: z.treeifyError(err).properties.body.properties,
    });
  }
};
