// src/App.tsx
import React from 'react';
import AppLayout from './AppLayout';
import ChatWindow from './components/ChatWindow';

function App() {
  return (
    <AppLayout>
      <ChatWindow />
    </AppLayout>
  );
}

export default App;
