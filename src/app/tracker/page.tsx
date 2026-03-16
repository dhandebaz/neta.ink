import type { Metadata } from "next";
import { TrackerClient } from "./TrackerClient";

export const metadata: Metadata = {
  title: "Politician Tracker | Neta.ink",
  description:
    "Live tracker of Indian politicians — search, filter by party, criminal cases, education, and assets. Start with Delhi MLAs and MPs.",
  openGraph: {
    title: "Politician Tracker | Neta.ink",
    description:
      "Live tracker of Indian politicians — search, filter by party, criminal cases, education, and assets.",
    images: ["/og-default.jpg"],
  },
};

export default function TrackerPage() {
  return <TrackerClient />;
}
