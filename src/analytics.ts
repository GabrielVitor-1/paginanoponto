import { content } from "./content";

type AnalyticsElement = HTMLElement & { dataset: DOMStringMap };

const trackingAllowed = () => navigator.doNotTrack !== "1" && window.doNotTrack !== "1";

export function setupAnalytics() {
  if (!content.analytics.provider || !trackingAllowed()) return () => undefined;

  const onClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<AnalyticsElement>("[data-evento]");
    if (!target) return;

    const eventName = target.dataset.evento;
    const location = target.dataset.eventoLocal;
    if (!eventName) return;

    if (content.analytics.provider === "plausible") {
      window.plausible?.(eventName, { props: location ? { local: location } : undefined });
    }
    if (content.analytics.provider === "umami") {
      window.umami?.track(eventName, location ? { local: location } : undefined);
    }
  };

  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

declare global {
  interface Window {
    doNotTrack?: string;
    plausible?: (eventName: string, options?: { props?: Record<string, string> }) => void;
    umami?: { track: (eventName: string, data?: Record<string, string>) => void };
  }
}
