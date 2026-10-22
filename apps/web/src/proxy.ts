import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  // A fetch() caller should get a clean 401 JSON, not a redirect into an HTML sign-in page.
  if (isApiRoute(req)) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  // Pages: let Clerk redirect to sign-in itself so it keeps the `redirect_url`
  // and the user lands back on the workflow they were trying to open.
  await auth.protect();
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip _next/static, _next/image, and all files with extensions (images, fonts, etc.)
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
