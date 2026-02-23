import MapsClient from "./MapsClient";

export default function MapsPage() {
  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white p-4 shadow-sm z-10">
        <h1 className="text-xl font-bold">Constituency Heatmaps</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <MapsClient />
      </main>
    </div>
  );
}
