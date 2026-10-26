import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Portfolio from "./Portfolio";
import Packages from "./Packages";
import { linkWhats, whatsappMessages, type WhatsAppMessage } from "./whatsapp";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PageMotion() {
  useEffect(() => {
    const heroItems = gsap.utils.toArray<HTMLElement>(
      ".hero-copy > .eyebrow, .hero-copy > h1, .hero-copy > .hero-lead, .hero-copy > .button",
    );
    const sections = gsap.utils.toArray<HTMLElement>(".reveal");
    if (reducedMotion) {
      gsap.set([...heroItems, ...sections], { autoAlpha: 1, y: 0 });
      return;
    }
    const context = gsap.context(() => {
      gsap.fromTo(
        heroItems,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out", stagger: 0.1 },
      );
      sections.forEach((section) => {
        gsap.fromTo(
          section,
          { autoAlpha: 0, y: 8 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.3,
            ease: "power2.out",
            scrollTrigger: { trigger: section, start: "top 88%", once: true },
          },
        );
      });
    });
    return () => context.revert();
  }, []);
  return null;
}

function HeroSegments() {
  const segments = [
    ["Pousada", "pousada"],
    ["Loja", "loja"],
    ["Salão", "salao"],
    ["Oficina", "oficina"],
    ["Turismo", "turismo"],
  ] as const;
  return (
    <div className="hero-segments">
      <p>Qual é o seu negócio?</p>
      <div>
        {segments.map(([label, key]) => (
          <a
            key={key}
            href={linkWhats(whatsappMessages[key])}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Conversar pelo WhatsApp sobre uma página para ${label.toLowerCase()}`}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}

function App() {
  const portfolioRoot = document.getElementById("portfolio-root");
  const packagesRoot = document.getElementById("packages-root");
  const heroSegmentsRoot = document.getElementById("hero-segments-root");
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>("[data-whatsapp-message]").forEach((link) => {
      const key = link.dataset.whatsappMessage as WhatsAppMessage;
      link.href = linkWhats(whatsappMessages[key]);
      link.setAttribute("aria-label", `Abrir conversa pelo WhatsApp: ${link.textContent?.trim()}`);
    });
  }, []);
  return (
    <>
      {portfolioRoot && createPortal(<Portfolio />, portfolioRoot)}
      {packagesRoot && createPortal(<Packages />, packagesRoot)}
      {heroSegmentsRoot && createPortal(<HeroSegments />, heroSegmentsRoot)}
      <PageMotion />
    </>
  );
}

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = new Date().getFullYear().toString();
createRoot(document.getElementById("react-effects-root")!).render(<App />);
