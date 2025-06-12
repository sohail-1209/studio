
// src/components/layout/AppSidebar.tsx
'use client';

// Removed all imports and complex logic

export function AppSidebar() {
  return (
    <div className="p-4 h-full flex flex-col justify-between">
      <div>
        <div className="text-white text-xl font-bold mb-4">SYNORA LOGO (RED BG)</div>
        <div className="text-white text-lg">Red Sidebar Area</div>
        <ul className="mt-4">
          <li className="text-white p-2 hover:bg-white/20 rounded-md">
            Test Link 1 (White Text)
          </li>
        </ul>
      </div>
      <div className="text-white text-sm mt-auto">
        Sidebar Footer (RED BG)
      </div>
    </div>
  );
}
