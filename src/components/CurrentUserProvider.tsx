import { getCurrentUser } from "@/lib/auth/session";
import { UserMenuClient } from "./UserMenuClient";

export async function CurrentUserProvider() {
  const user = await getCurrentUser();

  const summary = user
    ? {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        state_code: user.state_code,
        is_system_admin: user.is_system_admin
      }
    : null;

  return <UserMenuClient user={summary} />;
}

