import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextThursday7pmCentral, toCentralDatetimeLocalValue } from "@/lib/scheduling";
import NewMatchForm from "./NewMatchForm";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.isAdmin;
  if (!isAdmin) redirect("/matches");

  const players = await prisma.user.findMany({ orderBy: { name: "asc" } });
  const defaultScheduledAt = toCentralDatetimeLocalValue(nextThursday7pmCentral());

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Log a match</h1>
      <NewMatchForm
        players={players.map((p) => ({ id: p.id, name: p.name, individualRating: p.individualRating }))}
        defaultScheduledAt={defaultScheduledAt}
      />
    </div>
  );
}
