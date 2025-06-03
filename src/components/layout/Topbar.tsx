import React from 'react';
import { Link } from 'react-router-dom'; // if you're using routing
import logo from '/Reflectibot-transformed.jpeg'; // assuming this lives in /public

export default function Topbar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-zinc-800 shadow-md">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Reflectibot Logo" className="w-10 h-10 rounded-full" />
        <span className="text-xl font-bold text-white">Reflectibot</span>
      </div>
      <nav className="flex gap-4 text-sm text-zinc-300">
        <Link to="/" className="hover:text-white">Chat</Link>
        <Link to="/memories" className="hover:text-white">Memories</Link>
        <Link to="/profile" className="hover:text-white">Profile</Link>
      </nav>
    </header>
  );
}
