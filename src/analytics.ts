// Google Analytics 4 with Consent Mode v2. Only runs in a production build that has VITE_GA_ID.
// Nothing is stored in cookies until the visitor accepts; the choice can be changed at any time
// from the footer button marked with `data-consent`. Imported only by the client entry, never by
// the prerender (it touches window and document at load time).
import "./home/consent.css";

type Choice = "granted" | "denied";

const CONSENT_KEY = "pp-consent";
const gaId = import.meta.env.VITE_GA_ID?.trim();
const enabled = import.meta.env.PROD && Boolean(gaId);

const readChoice = (): Choice | null => {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
};

const saveChoice = (choice: Choice) => {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Private mode or blocked storage: the choice lasts only for this visit.
  }
};

/** Removes the GA cookies when consent is withdrawn (set on the host and on the parent domain). */
const clearGaCookies = () => {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.replace(/^www\./, "")}`];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name || !/^_ga(_|$)/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
};

let banner: HTMLElement | null = null;

const applyChoice = (choice: Choice) => {
  saveChoice(choice);
  window.gtag("consent", "update", { analytics_storage: choice });
  // The page_view sent on load was cookieless; count this visit now instead of on the next load.
  if (choice === "granted") window.gtag("event", "page_view");
  if (choice === "denied") clearGaCookies();
};

const showBanner = (returnFocus?: HTMLElement) => {
  if (banner) {
    banner.querySelector("button")?.focus();
    return;
  }
  banner = document.createElement("section");
  banner.className = "pp-consent";
  banner.setAttribute("aria-label", "Privacidade e cookies");

  const text = document.createElement("p");
  text.textContent =
    "Usamos o Google Analytics para entender, de forma agregada, como o site é usado. Os cookies de medição só são gravados se você aceitar, e você pode mudar a escolha quando quiser em Privacidade e cookies, no rodapé.";

  const actions = document.createElement("div");
  const button = (label: string, choice: Choice) => {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.dataset["choice"] = choice;
    element.addEventListener("click", () => {
      applyChoice(choice);
      banner?.remove();
      banner = null;
      returnFocus?.focus();
    });
    return element;
  };
  actions.append(button("Recusar", "denied"), button("Aceitar", "granted"));

  banner.append(text, actions);
  document.body.append(banner);
  if (returnFocus) banner.querySelector("button")?.focus();
};

if (enabled && gaId) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the `arguments` object itself, not an array.
    window.dataLayer.push(arguments);
  };

  const choice = readChoice();
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: choice === "granted" ? "granted" : "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", gaId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.append(script);

  if (!choice) showBanner();
  document.addEventListener("click", (event) => {
    const trigger = (event.target as Element | null)?.closest?.<HTMLElement>("[data-consent]");
    if (trigger) showBanner(trigger);
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (enabled) window.gtag("event", name, params);
}
