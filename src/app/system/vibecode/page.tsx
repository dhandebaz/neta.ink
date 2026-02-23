import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import VibecodeClient from "./VibecodeClient";

export default async function VibecodePage() {
  const user = await getCurrentUser();

  if (!user || !user.is_system_admin) {
    redirect("/");
  }

  return <VibecodeClient />;
}
