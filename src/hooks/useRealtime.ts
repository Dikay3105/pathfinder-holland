import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_BASE_URL;

export type RealtimeHandlers = Record<string, (data: any) => void>;

/**
 * Nhận sự kiện realtime từ BE (Server-Sent Events tại /api/realtime).
 * EventSource tự kết nối lại khi rớt mạng / server khởi động lại.
 * Trả về trạng thái kết nối để hiển thị chấm "Trực tiếp".
 */
/**
 * @param topic kênh riêng, VD "student:<id>" – chỉ nhận sự kiện của học sinh đó (không nhận sự kiện chung của admin)
 */
export function useRealtime(handlers: RealtimeHandlers, enabled = true, topic?: string) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const events = Object.keys(handlers).sort().join(',');

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined' || !API) {
      setConnected(false);
      return;
    }
    const source = new EventSource(`${API}/realtime${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const listeners = events.split(',').filter(Boolean).map(name => {
      const listener = (e: MessageEvent) => {
        try {
          handlersRef.current[name]?.(JSON.parse(e.data));
        } catch (err) {
          console.error('Realtime: lỗi xử lý sự kiện', name, err);
        }
      };
      source.addEventListener(name, listener as EventListener);
      return [name, listener] as const;
    });

    return () => {
      listeners.forEach(([name, l]) => source.removeEventListener(name, l as EventListener));
      source.close();
    };
  }, [events, enabled, topic]);

  return connected;
}
