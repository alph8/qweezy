import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

// A typed auth failure that carries the HTTP status it should produce.
// Route handlers must *return* a Response — throwing a raw Response/
// NextResponse is not caught by Next.js and turns into an unhandled 500
// instead of the intended 401/403. withAuthError() below converts this
// into a real response.
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requirePlayer() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) throw new AuthError("Unauthorized", 401);
  const player = await prisma.user.findUnique({ where: { id: userId } });
  if (!player) throw new AuthError("Unauthorized", 401);
  return player;
}

export async function requireAdmin() {
  const player = await requirePlayer();
  if (!player.isAdmin) throw new AuthError("Admins only", 403);
  return player;
}

// Wrap a route handler so an AuthError thrown by requirePlayer/requireAdmin
// becomes the proper 401/403 JSON response instead of a generic 500.
export function withAuthError<Args extends any[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  };
}
