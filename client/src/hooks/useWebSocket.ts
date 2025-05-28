import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage } from '@shared/schema';

interface UseWebSocketReturn {
  sendMessage: (message: ChatMessage) => void;
  isConnected: boolean;
  lastMessage: ChatMessage | null;
}

export function useWebSocket(onMessage?: (message: ChatMessage) => void): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    };

    ws.current.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        setLastMessage(message);
        onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.current?.close();
    };
  }, [onMessage]);

  const sendMessage = useCallback((message: ChatMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return {
    sendMessage,
    isConnected,
    lastMessage
  };
}
