'use client';

import { useEffect, useState, useRef } from 'react';

export default function Toast() {
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail || '';
      if (!text) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(text);
      setShow(true);

      timerRef.current = setTimeout(() => {
        setShow(false);
      }, 3200);
    };

    window.addEventListener('show-toast', handleToast);
    return () => {
      window.removeEventListener('show-toast', handleToast);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      className={`fixed bottom-[90px] left-1/2 -translate-x-1/2 z-[120] max-w-[90vw] text-center bg-[#061B36] text-white text-[0.88rem] px-5 py-3 rounded-full font-sans shadow-lg pointer-events-none transition-all duration-300 ease-out ${
        show ? 'translate-y-0 opacity-100 visible' : 'translate-y-[100px] opacity-0 invisible'
      }`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
