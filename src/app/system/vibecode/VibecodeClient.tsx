"use client";

import { useState } from "react";

export default function VibecodeClient() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/system/vibecode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setOutput(data.result || data.error || "No output");
    } catch (err) {
      setOutput("Error executing vibecode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black text-green-400 min-h-screen p-4 font-mono">
      <h1 className="text-xl mb-4">Vibecode Terminal</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-32 bg-gray-900 border border-green-700 p-2 mb-4 focus:outline-none focus:border-green-500"
        placeholder="Enter instruction..."
      />
      <button
        onClick={handleExecute}
        disabled={loading}
        className="bg-green-700 text-black px-4 py-2 hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? "Executing..." : "Execute"}
      </button>
      <pre className="mt-4 whitespace-pre-wrap border-t border-green-800 pt-4">
        {output}
      </pre>
    </div>
  );
}
