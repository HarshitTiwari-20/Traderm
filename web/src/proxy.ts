import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("traderm_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    // Invalid/expired token — clear it and redirect
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set("traderm_token", "", { maxAge: 0, path: "/" });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/terminal/:path*"],
};
