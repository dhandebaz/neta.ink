import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/db/client";
import { rti_requests, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import PrintButton from "./PrintButtonClient";
import { notFound, redirect } from "next/navigation";

export default async function RtiDocumentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const rtiId = Number(params.id);
  if (isNaN(rtiId)) {
    notFound();
  }

  const [rti] = await db
    .select()
    .from(rti_requests)
    .innerJoin(users, eq(rti_requests.user_id, users.id))
    .where(and(eq(rti_requests.id, rtiId), eq(users.id, currentUser.id)))
    .limit(1);

  if (!rti) {
    notFound();
  }

  if (rti.rti_requests.status !== "paid") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">Payment Required</h1>
        <p className="text-slate-600 dark:text-slate-400">
          This RTI application draft is locked. Please complete payment to access the formal document.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[297mm] max-w-2xl bg-white p-8 font-serif text-black print:p-0">
      <PrintButton />
      
      <div className="mb-8 flex justify-between">
        <div>
          <p className="font-bold">To,</p>
          <p>The Public Information Officer,</p>
          <p>{rti.rti_requests.pio_name || "[PIO Name]"}</p>
          <p className="whitespace-pre-wrap">{rti.rti_requests.pio_address || "[PIO Address]"}</p>
        </div>
        <div className="text-right">
          <p>Date: {new Date(rti.rti_requests.created_at).toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      <h2 className="mb-6 text-center text-xl font-bold underline decoration-1 underline-offset-4">
        Subject: Application under Right to Information Act, 2005
      </h2>

      <div className="mb-8 whitespace-pre-wrap text-justify leading-relaxed">
        {rti.rti_requests.rti_text}
      </div>

      <div className="mb-12">
        <p className="mb-2 font-bold">Details of Payment:</p>
        <p>
          I am enclosing the application fee of Rs. 10/- by way of Indian Postal Order / Court Fee Stamp / Demand Draft.
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <p className="font-bold">Yours faithfully,</p>
        <div className="h-16"></div> {/* Space for signature */}
        <p className="font-bold">{rti.users.name || "Citizen"}</p>
        <p>{rti.users.phone_number}</p>
        <p>{rti.users.email || ""}</p>
      </div>
    </div>
  );
}
