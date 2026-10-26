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

function PageAtmosphere() {
  useEffect(() => {
    if (reducedMotion) return;

    const root = document.documentElement;
    let frame = 0;
    const updateScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      root.style.setProperty("--atmosphere-scroll", progress.toFixed(4));
      frame = 0;
    };
    const scheduleScrollUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (active)
          root.dataset.atmosphere = active.target.getAttribute("data-atmosphere") ?? "base";
      },
      { threshold: [0.35, 0.6] },
    );

    document
      .querySelectorAll<HTMLElement>("[data-atmosphere]")
      .forEach((section) => observer.observe(section));
    updateScroll();
    window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollUpdate, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleScrollUpdate);
      window.removeEventListener("resize", scheduleScrollUpdate);
      root.style.removeProperty("--atmosphere-scroll");
      delete root.dataset.atmosphere;
    };
  }, []);

  return (
    <div className="page-atmosphere" aria-hidden="true">
      <span className="page-atmosphere-glow page-atmosphere-glow-one" />
      <span className="page-atmosphere-glow page-atmosphere-glow-two" />
    </div>
  );
}

function PageMotion() {
  useEffect(() => {
    const heroTitle = document.querySelector<HTMLHeadingElement>(".hero-copy > h1");
    const titleWords: HTMLSpanElement[] = [];
    if (heroTitle && !heroTitle.dataset.split) {
      const words = heroTitle.textContent?.trim().split(/\s+/) ?? [];
      heroTitle.textContent = "";
      words.forEach((word, index) => {
        const span = document.createElement("span");
        span.className = "hero-word";
        span.textContent = word;
        heroTitle.append(span);
        titleWords.push(span);
        if (index < words.length - 1) heroTitle.append(" ");
      });
      heroTitle.dataset.split = "true";
    }
    heroTitle
      ?.querySelectorAll<HTMLSpanElement>(".hero-word")
      .forEach((word) => titleWords.push(word));

    const heroItems = gsap.utils.toArray<HTMLElement>(
      ".hero-copy > .eyebrow, .hero-copy > .hero-lead, .hero-copy > .button",
    );
    const sections = gsap.utils.toArray<HTMLElement>(".reveal");
    if (reducedMotion) {
      gsap.set([...heroItems, ...titleWords, ...sections], { autoAlpha: 1, y: 0 });
      return;
    }
    const context = gsap.context(() => {
      const heroTimeline = gsap.timeline();
      heroTimeline
        .fromTo(
          ".hero-copy > .eyebrow",
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.32, ease: "power2.out" },
        )
        .fromTo(
          titleWords,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.045 },
          "-=0.08",
        )
        .fromTo(
          ".hero-copy > .hero-lead, .hero-copy > .button",
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.08 },
          "-=0.12",
        )
        .fromTo(
          ".discovery",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" },
          "-=0.32",
        )
        .fromTo(
          ".discovery li",
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out", stagger: 0.06 },
          "-=0.12",
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

function HeaderState() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;

    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 12);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return null;
}

function ScrollStates() {
  useEffect(() => {
    if (reducedMotion) return;

    const targets = document.querySelectorAll<HTMLElement>(
      ".process-list li, .sample-page, .package-card, .package-included",
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-active");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8%" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
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
      <PageAtmosphere />
      <HeaderState />
      <PageMotion />
      <ScrollStates />
    </>
  );
}

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = new Date().getFullYear().toString();
createRoot(document.getElementById("react-effects-root")!).render(<App />);
