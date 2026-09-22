import { useState, useEffect, useCallback } from 'react';

/**
 * useFullscreen — abstração reutilizável para a Fullscreen API.
 *
 * - Detecta suporte via `document.fullscreenEnabled`.
 * - Sincroniza estado quando o usuário sai pelo sistema (ESC, gesto, etc.).
 * - Falha silenciosamente em dispositivos sem suporte (Safari iOS).
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported] = useState(() =>
    typeof document !== 'undefined' && !!document.fullscreenEnabled
  );

  // Sync state with browser events (ESC, etc.)
  useEffect(() => {
    if (!isSupported) return;

    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [isSupported]);

  const enterFullscreen = useCallback(async () => {
    if (!isSupported) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, [isSupported]);

  const exitFullscreen = useCallback(async () => {
    if (!isSupported || !document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, [isSupported]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    isSupported,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
