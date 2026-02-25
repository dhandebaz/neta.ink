import { getCurrentUser } from "@/lib/auth/session";
import { ProChatbotClient } from "@/components/ProChatbotClient";

export async function ChatbotWrapper() {
  const user = await getCurrentUser();
  const isPro = user ? user.api_limit > 0 : false;

  return <ProChatbotClient isPro={isPro} />;
}

