import { ZodError } from 'zod';

export function validate(schemas) {
  return (req, res, next) => {
    try {
      req.validated = req.validated || {};

      if (schemas.params) {
        req.validated.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.validated.query = schemas.query.parse(req.query);
      }

      if (schemas.body) {
        const parsedBody = schemas.body.parse(req.body ?? {});
        req.body = parsedBody;
        req.validated.body = parsedBody;
      }

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(err);
      }
      return next(err);
    }
  };
}
