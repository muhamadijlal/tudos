import { logErrorDetail } from "#config/logger.js";

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    logErrorDetail(req, `Validation error: ${JSON.stringify(errors)}`);
    return res.status(400).json({ success: false, errors });
  }

  // data yang sudah bersih & ter-coerce
  req.body = result.data.body;
  req.params = result.data.params;
  next();
};

export default validate;
