import { getAuth } from "@clerk/express";

export function resolveClerkUserId(req) {
  try {
    const auth = typeof req.auth === "function" ? req.auth() : req.auth || {};
    const fromReq = auth?.userId || auth?.user_id || auth?.user?.id || null;
    if (fromReq) return fromReq;
    try {
      const serverAuth = getAuth ? getAuth(req) : null;
      return serverAuth?.userId || null;
    } catch (e) {
      return null;
    }
  } catch (e) {
    return null;
  }
}
