import React from 'react';
import { AppLayout } from './components/AppLayout';
import ChatWindow from './components/ChatWindow';

export default function App() {
  return (
    <AppLayout>
      <ChatWindow />
    </AppLayout>
  );
}
