import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

export default async function DataPage() {
  const user = await getCurrentUser();

  if (!user || user.api_limit === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Pro Data Access</h1>
        <p className="mb-6 text-gray-600">
          Upgrade to Dev Pro (₹10,000/mo) in Dashboard to access bulk data downloads.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Data Portal</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Politicians Data</h2>
          <p className="text-gray-600 mb-4">Download comprehensive dataset of all politicians.</p>
          <a
            href="/api/v1/export/csv?type=politicians"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Download Politicians CSV
          </a>
        </div>
        <div className="border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Complaints Data</h2>
          <p className="text-gray-600 mb-4">Download full complaints dataset in JSON format.</p>
          <a
            href="/api/v1/export/csv?type=complaints"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Download Complaints Dataset JSON
          </a>
        </div>
      </div>
    </div>
  );
}
