import React from 'react';
import { Button } from '@/components/ui/button';

const ChatWindow = () => {
  return (
    <div className="flex flex-col h-full w-full p-4 bg-background text-foreground">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl shadow-inner bg-muted">
        {/* Messages would be rendered here */}
        <div className="text-center text-muted-foreground">No messages yet</div>
      </div>

      {/* Input Area */}
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Say something..."
            className="flex-1 p-3 rounded-2xl border border-border bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button>🎤</Button>
        </div>

        {/* Functional Button Row */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
          <Button className="py-2 bg-secondary text-white">🔁 Reflect</Button>
          <Button className="py-2 bg-secondary text-white">📊 Stats</Button>
          <Button className="py-2 bg-secondary text-white">🌱 Growth Stage</Button>
          <Button className="py-2 bg-secondary text-white">🔤 Words</Button>
          <Button className="py-2 bg-secondary text-white">📘 Facts</Button>
          <Button className="py-2 bg-secondary text-white">👥 Switch</Button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
