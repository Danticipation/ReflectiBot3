import React from 'react';
import Sidebar from './layout/Sidebar';
import Topbar from './layout/Topbar';
import ChatWindow from './ChatWindow';

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-zinc-900 to-zinc-800 text-zinc-100">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
