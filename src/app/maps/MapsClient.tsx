"use client";

import React, { useState } from "react";

export default function MapsClient() {
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Placeholder data
  const states = [
    { code: "DL", name: "Delhi", crimeRate: "High" },
    { code: "MH", name: "Maharashtra", crimeRate: "Medium" },
    { code: "UP", name: "Uttar Pradesh", crimeRate: "High" },
    { code: "KA", name: "Karnataka", crimeRate: "Low" },
  ];

  const getColor = (rate: string) => {
    switch (rate) {
      case "High": return "bg-red-500";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-green-500";
      default: return "bg-gray-300";
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-4 text-sm text-gray-600">
        Tap on a state to see details. Colors indicate average criminal cases.
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {states.map((state) => (
          <div
            key={state.code}
            onClick={() => setSelectedState(state.name)}
            className={`
              aspect-square rounded-lg flex items-center justify-center 
              text-white font-bold shadow-md cursor-pointer transition-transform transform hover:scale-105
              ${getColor(state.crimeRate)}
            `}
          >
            {state.code}
          </div>
        ))}
      </div>

      {selectedState && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-bold">{selectedState}</h2>
          <p>Heatmap details for {selectedState} would appear here.</p>
        </div>
      )}
      
      <div className="mt-8 flex justify-center">
        <svg width="200" height="200" viewBox="0 0 100 100" className="opacity-50">
           <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="3" fill="none" />
           <text x="50" y="55" textAnchor="middle" fontSize="10">Map Placeholder</text>
        </svg>
      </div>
    </div>
  );
}
