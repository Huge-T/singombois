import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  const isStudentArea = pathname.startsWith("/siswa");
  const isTeacherArea = pathname.startsWith("/guru");
  const isCoordinatorArea = pathname.startsWith("/koordinator");
  const isBkArea = pathname.startsWith("/bk");

  if (!req.auth && (isStudentArea || isTeacherArea || isCoordinatorArea || isBkArea)) {
    const url = new URL("/masuk", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isStudentArea && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/masuk", req.nextUrl.origin));
  }
  if (isTeacherArea && role !== "TEACHER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/masuk", req.nextUrl.origin));
  }
  if (
    isCoordinatorArea &&
    role !== "COORDINATOR" &&
    role !== "ADMIN" &&
    role !== "SUPER_ADMIN"
  ) {
    return NextResponse.redirect(new URL("/masuk", req.nextUrl.origin));
  }
  if (isBkArea && role !== "GURU_BK" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/masuk", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/siswa/:path*", "/guru/:path*", "/koordinator/:path*", "/bk/:path*"],
};
