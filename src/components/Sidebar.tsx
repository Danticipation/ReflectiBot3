import React from 'react';

export function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-800 h-screen p-4 border-r border-zinc-700">
      <nav className="space-y-4 text-white">
        <a href="#" className="block hover:text-teal-300">Memory</a>
        <a href="#" className="block hover:text-teal-300">Reflection</a>
        <a href="#" className="block hover:text-teal-300">Voice</a>
        <a href="#" className="block hover:text-teal-300">Switch User</a>
      </nav>
    </aside>
  );
}
