import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Portfolio from "./Portfolio";
import Packages from "./Packages";
import { AREA, BRAND_NAME, OWNER_NAME } from "./content";
import { linkWhats, whatsappMessages, type WhatsAppMessage } from "./whatsapp";
import "./styles.css";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function PageAtmosphere() {
  useEffect(() => {
    if (reducedMotion || window.matchMedia("(width < 42rem)").matches) return;

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
    const compactViewport = window.matchMedia("(width < 42rem)").matches;
    if (heroTitle && !compactViewport && !heroTitle.dataset.split) {
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
      ".hero-copy > .eyebrow, .hero-copy > .hero-lead, .hero-copy > .button, .hero-copy > .hero-note",
    );
    const sections = gsap.utils.toArray<HTMLElement>(".reveal");
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        {
          desktop: "(width >= 42rem)",
          motionAllowed: "(prefers-reduced-motion: no-preference)",
        },
        (mediaContext) => {
          if (!mediaContext.conditions?.desktop || !mediaContext.conditions.motionAllowed) {
            gsap.set([...heroItems, ...titleWords, ...sections], { autoAlpha: 1, y: 0 });
            return;
          }

          const heroTimeline = gsap.timeline();
          heroTimeline
            .fromTo(
              ".hero-copy > .eyebrow",
              { autoAlpha: 0, y: 20 },
              { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" },
            )
            .fromTo(
              titleWords,
              { autoAlpha: 0, y: 42 },
              { autoAlpha: 1, y: 0, duration: 0.72, ease: "power3.out", stagger: 0.07 },
              "-=0.2",
            )
            .fromTo(
              ".hero-copy > .hero-lead, .hero-copy > .button, .hero-copy > .hero-note",
              { autoAlpha: 0, y: 24 },
              { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.12 },
              "-=0.55",
            )
            .fromTo(
              ".discovery",
              { autoAlpha: 0, y: 36 },
              { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" },
              "-=0.6",
            )
            .fromTo(
              ".discovery li",
              { autoAlpha: 0, y: 18 },
              { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", stagger: 0.1 },
              "-=0.35",
            );
          sections.forEach((section) => {
            gsap.fromTo(
              section,
              { autoAlpha: 0, y: 28 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.65,
                ease: "power3.out",
                scrollTrigger: { trigger: section, start: "top 88%", once: true },
              },
            );
          });
        },
      );
    });
    return () => {
      media.revert();
      context.revert();
    };
  }, []);
  return null;
}

function PillParallax() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".problem");
    const pills = gsap.utils.toArray<HTMLElement>(".problem .pill");
    const textBlocks = gsap.utils.toArray<HTMLElement>(".problem h2, .problem .body-copy p");
    if (!section || !pills.length) return;

    const cubeLayouts = [
      [18, "5%", "14%"],
      [30, "14%", "72%"],
      [16, "21%", "7%"],
      [36, "26%", "88%"],
      [24, "7%", "48%"],
      [14, "93%", "10%"],
      [40, "84%", "36%"],
      [22, "95%", "63%"],
      [34, "78%", "84%"],
      [20, "70%", "8%"],
      [28, "34%", "5%"],
      [15, "41%", "91%"],
      [32, "59%", "90%"],
      [26, "67%", "12%"],
    ] as const;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      const configurePills = (animate: boolean) => {
        const sectionHeight = section.offsetHeight;

        pills.forEach((pill, index) => {
          const [size, left, top] = cubeLayouts[index];
          const speed = Number(pill.dataset.speed);
          const isNear = speed >= 1;
          const nearCopy = [4, 6, 9].includes(index);
          const baseOpacity = isNear
            ? 0.58 + Math.min((speed - 1) * 0.28, 0.2)
            : 0.34 + speed * 0.22;
          const opacity = nearCopy ? baseOpacity * 0.48 : baseOpacity;
          const z = isNear ? (speed - 1) * 180 : -(1 - speed) * 180;
          const scale = isNear ? 1 + (speed - 1) * 0.16 : 0.9 + speed * 0.1;
          const blur = isNear ? 0 : 1 + (1 - speed) * 5;
          const rotation = (index % 2 === 0 ? -1 : 1) * (5 + speed * 4);

          pill.style.setProperty("--pill-size", `${size}px`);
          pill.style.setProperty("left", left);
          pill.style.setProperty("top", top);
          pill.style.setProperty("--pill-opacity", opacity.toFixed(2));
          pill.style.setProperty("--pill-blur", `${blur.toFixed(1)}px`);
          gsap.set(pill, {
            z,
            scale,
            rotationX: rotation * 1.4,
            rotationY: -rotation * 1.8,
            rotationZ: rotation,
            autoAlpha: animate ? 0 : opacity,
          });

          if (!animate) return;

          const distance = sectionHeight * 0.26 * speed;
          gsap.to(pill, {
            autoAlpha: opacity,
            duration: 0.5,
            delay: index * 0.035,
            ease: "power2.out",
            scrollTrigger: {
              trigger: section,
              start: "top 88%",
              once: true,
            },
          });
          gsap.fromTo(
            pill,
            { y: distance },
            {
              y: -distance,
              rotationX: -rotation * 5,
              rotationY: rotation * 12,
              rotationZ: -rotation,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6 + speed * 0.4,
              },
            },
          );

          ScrollTrigger.create({
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            onUpdate: () => {
              const pillBounds = pill.getBoundingClientRect();
              const overlapsText = textBlocks.some((textBlock) => {
                const textBounds = textBlock.getBoundingClientRect();
                return !(
                  pillBounds.right < textBounds.left ||
                  pillBounds.left > textBounds.right ||
                  pillBounds.bottom < textBounds.top ||
                  pillBounds.top > textBounds.bottom
                );
              });
              gsap.set(pill, { opacity: overlapsText ? opacity * 0.3 : opacity });
            },
          });
        });
      };

      media.add("(prefers-reduced-motion: no-preference)", () => configurePills(true));
      media.add("(prefers-reduced-motion: reduce)", () => configurePills(false));
    }, section);

    let active = true;
    const imagesReady = Promise.all(
      Array.from(document.images).map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }),
    );
    void Promise.all([document.fonts.ready, imagesReady]).then(() => {
      if (active) ScrollTrigger.refresh();
    });

    return () => {
      active = false;
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}

function AmbientObjects() {
  useEffect(() => {
    const sections = [".process", ".demo", ".portfolio", ".pricing", ".trust", ".final-cta"]
      .map((selector) => document.querySelector<HTMLElement>(selector))
      .filter((section): section is HTMLElement => Boolean(section));
    const containers = sections.map((section, sectionIndex) => {
      section.classList.add("has-ambient-objects");
      const container = document.createElement("div");
      container.className = `ambient-objects ambient-objects-${sectionIndex + 1}`;
      container.setAttribute("aria-hidden", "true");
      container.innerHTML = '<div class="ambient-wave"></div>';

      [0.68, 0.86, 1.08, 1.32, 1.56].forEach((speed) => {
        const object = document.createElement("span");
        object.className = "ambient-object";
        object.dataset.speed = speed.toString();
        object.innerHTML = '<span class="ambient-object-core"></span>';
        container.append(object);
      });
      section.prepend(container);
      return container;
    });

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      const setObjects = (animate: boolean) => {
        containers.forEach((container) => {
          const section = container.parentElement as HTMLElement;
          const sectionHeight = section.offsetHeight;
          const objects = Array.from(container.querySelectorAll<HTMLElement>(".ambient-object"));
          const wave = container.querySelector<HTMLElement>(".ambient-wave")!;

          gsap.set(wave, { autoAlpha: animate ? 0 : 0.14 });
          if (animate) {
            gsap.fromTo(
              wave,
              { xPercent: -8, autoAlpha: 0 },
              {
                xPercent: 8,
                autoAlpha: 0.14,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.2,
                },
              },
            );
          }

          objects.forEach((object, index) => {
            const speed = Number(object.dataset.speed);
            const core = object.querySelector<HTMLElement>(".ambient-object-core")!;
            const opacity = 0.32 + speed * 0.2;
            const depth = (speed - 1) * 120;
            const rotation = index % 2 === 0 ? -11 : 11;

            gsap.set(object, {
              z: depth,
              scale: 0.86 + speed * 0.12,
              rotationX: rotation * 2,
              rotationY: -rotation * 3,
              rotationZ: rotation,
            });
            gsap.set(core, { autoAlpha: opacity });
            if (!animate || getComputedStyle(object).display === "none") return;

            const distance = sectionHeight * 0.2 * speed;
            gsap.fromTo(
              object,
              { y: distance },
              {
                y: -distance,
                rotationX: -rotation * 5,
                rotationY: rotation * 11,
                rotationZ: -rotation,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.9 + speed * 0.35,
                },
              },
            );
            gsap.fromTo(
              core,
              { autoAlpha: 0 },
              {
                autoAlpha: opacity,
                duration: 0.8,
                delay: index * 0.08,
                ease: "power2.out",
                scrollTrigger: { trigger: section, start: "top 86%", once: true },
              },
            );
            gsap.to(core, {
              y: index % 2 === 0 ? -26 : 26,
              rotationX: index % 2 === 0 ? 28 : -28,
              rotationY: index % 2 === 0 ? -42 : 42,
              duration: 4.6 + index * 0.6,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
          });
        });
      };

      media.add("(prefers-reduced-motion: no-preference)", () => setObjects(true));
      media.add("(prefers-reduced-motion: reduce)", () => setObjects(false));
    });

    void document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      media.revert();
      context.revert();
      containers.forEach((container) => {
        container.parentElement?.classList.remove("has-ambient-objects");
        container.remove();
      });
    };
  }, []);

  return null;
}

function GlassCardMotion() {
  useEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".glass-card");
    const sectionBlobGroups = gsap.utils.toArray<HTMLElement>(".section-glass-blobs");
    if (!cards.length) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const touchOnly = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const removeTouchListeners: Array<() => void> = [];

        sectionBlobGroups.forEach((group, groupIndex) => {
          const section = group.closest<HTMLElement>("section");
          if (!section) return;
          group.querySelectorAll<HTMLElement>("span").forEach((blob, blobIndex) => {
            const direction = (groupIndex + blobIndex) % 2 === 0 ? 1 : -1;
            gsap.fromTo(
              blob,
              { xPercent: direction * -10, yPercent: blobIndex * 8 },
              {
                xPercent: direction * 16,
                yPercent: -blobIndex * 10,
                ease: "none",
                scrollTrigger: {
                  trigger: section,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.4,
                },
              },
            );
          });
        });

        cards.forEach((card, cardIndex) => {
          gsap.fromTo(
            card,
            { autoAlpha: 0, y: 30, "--glass-glow": 0 },
            {
              autoAlpha: 1,
              y: 0,
              "--glass-glow": 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: card, start: "top 85%", once: true },
            },
          );

          card.querySelectorAll<HTMLElement>(".glass-blobs span").forEach((blob, blobIndex) => {
            const direction = (blobIndex + cardIndex) % 2 === 0 ? 1 : -1;
            gsap.fromTo(
              blob,
              { xPercent: direction * -18, yPercent: blobIndex * 8 },
              {
                xPercent: direction * 18,
                yPercent: -blobIndex * 8,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1.1,
                },
              },
            );
          });

          if (!touchOnly) return;
          const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType === "mouse") return;
            gsap.fromTo(
              card,
              { scale: 1 },
              { scale: 0.98, duration: 0.12, ease: "power2.out", yoyo: true, repeat: 1 },
            );
            gsap
              .timeline()
              .set(card, { "--glass-sheen-opacity": 0 })
              .to(card, { "--glass-sheen-opacity": 0.28, duration: 0.22, ease: "power2.out" })
              .to(card, { "--glass-sheen-opacity": 0, duration: 0.35, ease: "power2.in" });
          };
          card.addEventListener("pointerdown", onPointerDown);
          removeTouchListeners.push(() => card.removeEventListener("pointerdown", onPointerDown));
        });

        return () => removeTouchListeners.forEach((remove) => remove());
      });

      media.add(
        "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
        () => {
          const removePointerListeners: Array<() => void> = [];
          cards.forEach((card) => {
            gsap.set(card, { transformPerspective: 900 });
            const tiltX = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
            const tiltY = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
            const onPointerMove = (event: PointerEvent) => {
              const bounds = card.getBoundingClientRect();
              const progressX = (event.clientX - bounds.left) / bounds.width;
              const progressY = (event.clientY - bounds.top) / bounds.height;
              card.style.setProperty("--mx", `${(progressX * 100).toFixed(1)}%`);
              card.style.setProperty("--my", `${(progressY * 100).toFixed(1)}%`);
              tiltX((progressY - 0.5) * -12);
              tiltY((progressX - 0.5) * 12);
            };
            const onPointerLeave = () => {
              tiltX(0);
              tiltY(0);
              card.style.setProperty("--mx", "50%");
              card.style.setProperty("--my", "50%");
            };
            card.addEventListener("pointermove", onPointerMove);
            card.addEventListener("pointerleave", onPointerLeave);
            removePointerListeners.push(() => {
              card.removeEventListener("pointermove", onPointerMove);
              card.removeEventListener("pointerleave", onPointerLeave);
            });
          });
          return () => removePointerListeners.forEach((remove) => remove());
        },
      );
    });

    return () => {
      media.revert();
      context.revert();
    };
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
      ".process-list li, .portfolio-card, .package-card, .package-included",
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

function App() {
  const portfolioRoot = document.getElementById("portfolio-root");
  const packagesRoot = document.getElementById("packages-root");
  useEffect(() => {
    document.querySelectorAll<HTMLAnchorElement>("[data-whatsapp-message]").forEach((link) => {
      const key = link.dataset.whatsappMessage as WhatsAppMessage;
      link.href = linkWhats(whatsappMessages[key]);
      link.setAttribute("aria-label", `${link.textContent?.trim()}: abrir conversa pelo WhatsApp`);
    });
  }, []);
  return (
    <>
      {portfolioRoot && createPortal(<Portfolio />, portfolioRoot)}
      {packagesRoot && createPortal(<Packages />, packagesRoot)}
      <PageAtmosphere />
      <HeaderState />
      <PageMotion />
      <PillParallax />
      <AmbientObjects />
      <GlassCardMotion />
      <ScrollStates />
    </>
  );
}

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = new Date().getFullYear().toString();

document.querySelectorAll<HTMLElement>("[data-brand-name]").forEach((element) => {
  element.textContent = BRAND_NAME;
});
document.querySelectorAll<HTMLElement>("[data-owner-name]").forEach((element) => {
  element.textContent = OWNER_NAME;
});
document.querySelectorAll<HTMLElement>("[data-area]").forEach((element) => {
  element.textContent = AREA;
});
createRoot(document.getElementById("react-effects-root")!).render(<App />);
