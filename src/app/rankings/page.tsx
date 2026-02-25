import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RankingsIndex() {
  const user = await getCurrentUser();
  if (user?.state_code) {
    redirect(`/rankings/${user.state_code.toLowerCase()}`);
  }
  redirect("/");
}
