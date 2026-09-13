import prisma from "#prisma/client.js";
import { userResource } from "#resources/user.resource.js";
import ApiError from "#utils/ApiError.js";
import { verifyToken } from "#utils/jwt.js";

export default async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header) throw new ApiError(401, "Unauthorized");

    const [schema, token] = header.split(" ");

    if (schema !== "Bearer" || !token) throw new ApiError(401, "Unauthorized");

    const payload = verifyToken(token);
    const user = await prisma.user.findFirst({
      where: { id: payload.id, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!user) throw new ApiError(401, "Unauthorized");

    req.user = userResource(user);
    next();
  } catch (err) {
    // jwt melempar TokenExpiredError / JsonWebTokenError → jadikan 401
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Token tidak valid atau kadaluarsa"));
    }

    next(err);
  }
}
