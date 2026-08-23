import { NextRequest, NextResponse } from "next/server";
import { db, ensureDbInitialized } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createToken, ensureDefaultUserAndOrg } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await ensureDbInitialized();
    await ensureDefaultUserAndOrg();

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = (await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1))[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });

    response.cookies.set({
      name: "rf_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("[Login Error]", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
