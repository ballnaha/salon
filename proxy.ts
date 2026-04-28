import nextAuthMiddleware from "next-auth/middleware";

export const proxy = nextAuthMiddleware;

export const config = {
  // Protect all routes except auth routes, api/auth, and static assets
  matcher: ["/((?!api/auth|api/fal/proxy|login|register|_next/static|_next/image|favicon.ico|images).*)"],
};
