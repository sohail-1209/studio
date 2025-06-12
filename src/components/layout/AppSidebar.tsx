
// src/components/layout/AppSidebar.tsx
'use client';

export function AppSidebar() {
  return (
    <div className="p-4 h-full bg-inherit text-white flex flex-col items-center justify-center">
      <div style={{ border: '2px dashed limegreen', padding: '10px', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
        SIDEBAR CONTENT VISIBLE?
      </div>
    </div>
  );
}
