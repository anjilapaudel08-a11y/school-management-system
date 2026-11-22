import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((request) => {
  if (!request.auth) {
    return NextResponse.json(
      { error: "You must be signed in." },
      { status: 401 },
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/((?!auth).*)"],
};
