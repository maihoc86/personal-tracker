import { useEffect } from "react";
import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { createMemoryStore, useStore } from "../../lib/store";

/** Chrome's deferred install prompt (not in TypeScript's DOM lib). */
type InstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const installStore = createMemoryStore<InstallPromptEvent | null>(null);

export function useCanInstall(): boolean {
  return useStore(installStore) !== null;
}

/** Show the browser's install dialog; true when the user accepted. */
export async function installApp(): Promise<boolean> {
  const event = installStore.get();
  if (!event) return false;
  await event.prompt();
  const { outcome } = await event.userChoice;
  installStore.set(null);
  return outcome === "accepted";
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

/**
 * Mounted once: registers the service worker (offline shell), offers to
 * reload when a new version is ready, and keeps the install prompt around
 * for the "Cài ứng dụng" buttons.
 */
export function usePwa() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      installStore.set(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      installStore.set(null);
      toast("Đã cài Personal Tracker như một ứng dụng");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const updateSW = registerSW({
      onNeedRefresh() {
        toast("Đã có phiên bản mới", {
          description: "Tải lại để dùng bản mới — dữ liệu của bạn vẫn giữ nguyên.",
          duration: Infinity,
          action: { label: "Tải lại", onClick: () => void updateSW(true) },
        });
      },
      onOfflineReady() {
        toast("Đã sẵn sàng dùng offline");
      },
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
}
