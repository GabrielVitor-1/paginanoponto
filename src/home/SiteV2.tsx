import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { linkWhats, whatsappMessages } from "../whatsapp";
import "./preflight.css";
import "./site-v2.css";

// Real projects (links and captures). The Nexbr capture is a real screenshot of the live site.
const projects = [
  [
    "dora-doces",
    "Dora Doces",
    "Presença digital com um catálogo completo, reunindo centenas de produtos num só lugar.",
    "#f2b37a",
    "https://doradoces.com.br",
    "center",
  ],
  [
    "chacaras-morro-grande",
    "Chácaras Morro Grande",
    "Várias hospedagens num só site, cada uma com sua página e consulta direta pelo WhatsApp.",
    "#d8b25c",
    "https://chacarasmorrogrande.com.br",
    "center top",
  ],
  [
    "nexbr",
    "Nexbr",
    "Serviços da gráfica bem apresentados e pedido de orçamento direto pelo WhatsApp.",
    "#ff5c25",
    "https://nexbr.vercel.app",
    "center top",
  ],
];
const whatsapp = linkWhats(whatsappMessages.geral);
// Main commercial CTAs open the official WhatsApp directly, with a message for each intent.
const whatsappStart = linkWhats(whatsappMessages.iniciar),
  whatsappQuote = linkWhats(whatsappMessages.orcamento);

// The 3D world (three.js, ~1 MB) is a separate chunk loaded after the page's own HTML is on
// screen, so the content is readable and clickable before WebGL starts.
const SiteV2Webgl = lazy(() => import("./site-v2-webgl"));

const hasWebgl2 = () => {
  try {
    const ctx = document.createElement("canvas").getContext("webgl2");
    ctx?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!ctx;
  } catch {
    return false;
  }
};

/** If WebGL fails (no GPU, lost context, blocked), the page stays readable instead of blank. */
class WebglBoundary extends Component<{ onFail: () => void; children: ReactNode }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onFail();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SiteV2() {
  const root = useRef<HTMLElement>(null),
    dot = useRef<HTMLSpanElement>(null);
  // "wait" is also what the prerendered HTML contains, so hydration matches exactly.
  const [world, setWorld] = useState<"wait" | "on" | "off">("wait");
  useEffect(() => {
    if (!hasWebgl2()) {
      setWorld("off");
      return;
    }
    // Let the browser paint the page first, then start loading the 3D world.
    let timer = 0;
    const frame = requestAnimationFrame(() => (timer = window.setTimeout(() => setWorld("on"))));
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  return (
    <main ref={root} className={world === "off" ? "site-v2 no-webgl" : "site-v2"}>
      {world === "on" && (
        <WebglBoundary onFail={() => setWorld("off")}>
          <Suspense fallback={null}>
            <SiteV2Webgl root={root} targetRef={dot} />
          </Suspense>
        </WebglBoundary>
      )}
      <nav aria-label="Principal">
        <a className="brand" href="#hero" aria-label="Página Ponto — voltar ao início">
          Página Ponto.
        </a>
        <a className="nav-link" href="#proj">
          Projetos
        </a>
        <button data-reduced type="button" aria-pressed="false">
          Movimento reduzido
        </button>
        <a className="cta" href="#contato">
          Contato
        </a>
      </nav>
      <header id="hero" className="sec">
        <h1 data-r>Ideias que ganham forma.</h1>
        <p className="lead">
          Site, sistema ou automação: primeiro entendemos o que trava o seu negócio, depois
          construímos o que resolve.
        </p>
        <div className="btns">
          <a className="btn p" href="#proj">
            Explorar projetos
          </a>
          <a className="btn" href={whatsappStart} target="_blank" rel="noopener">
            Iniciar um projeto
          </a>
        </div>
      </header>
      <section id="svc" className="sec">
        <div className="svc-in">
          <h2 data-r>Presença que trabalha por você</h2>
          <div className="its">
            {[
              ["Sites institucionais", "Apresentam o negócio com clareza e levam ao contato."],
              ["Landing pages", "Uma página, um objetivo, nenhuma distração."],
              ["Experiências interativas", "Movimento e interação a serviço da mensagem."],
              ["Catálogos digitais", "Produtos e serviços organizados para escolher e pedir."],
            ].map(([title, text]) => (
              <div className="it" data-r key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="proj" className="sec">
        <h2 data-r style={{ marginBottom: "14vh" }}>
          Projetos no ar
        </h2>
        {projects.map(([image, title, text, color, url, position], i) => (
          <a
            className={i === 1 ? "project right" : "project"}
            href={url}
            target="_blank"
            rel="noopener"
            data-c={color}
            key={title}
          >
            <div className="shot" data-r>
              <img
                src={`./portfolio/${image}.webp`}
                alt={`Página inicial do site ${title}`}
                width={1200}
                height={630}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: position }}
              />
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <u>Visitar o site</u>
          </a>
        ))}
      </section>
      <section id="auto" className="sec">
        <h2 data-r>Tarefa manual vira fluxo</h2>
        <div className="nodes">
          {[
            ["Entrada", "Formulários, pedidos e mensagens chegam num só lugar."],
            ["Processamento", "Regras organizam e validam cada informação."],
            ["Integração", "Planilhas, e-mail, WhatsApp e sistemas conversam entre si."],
            ["Resultado", "O que era repetitivo passa a rodar sozinho."],
          ].map(([title, text]) => (
            <div className="node" data-r key={title}>
              <i />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="sys" className="sec">
        <h2 data-r>Sistemas sob medida</h2>
        <p className="lead">
          Ferramentas para organizar pedidos, reservas e processos do jeito que o seu negócio
          trabalha.
        </p>
        <div className="pans">
          {[
            ["Sistemas personalizados", "Cada regra do seu processo, no lugar certo."],
            ["Plataformas digitais", "Área de clientes, painéis e catálogos."],
            ["Aplicações web", "Acesse do celular ou do computador, sem instalar nada."],
            ["Ferramentas internas", "Menos planilha solta, mais controle."],
            ["Projetos especiais", "Conte o problema e desenhamos o caminho."],
          ].map(([title, text]) => (
            <div className="pan" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="trust" className="sec">
        <div>
          <h2 data-r>Como trabalhamos</h2>
          <ol>
            {[
              ["Conversa", "Entendemos o negócio e o desafio a resolver."],
              ["Proposta", "Escopo, prazo e valor combinados antes de começar."],
              ["Criação", "Você acompanha e aprova cada etapa."],
              ["Entrega", "Solução funcionando, com suporte para os ajustes."],
            ].map(([title, text]) => (
              <li key={title}>
                <b>{title}</b>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="btns">
            <a className="btn p" href={whatsappQuote} target="_blank" rel="noopener">
              Pedir orçamento
            </a>
          </div>
        </div>
        <div className="faq">
          <details>
            <summary>Quanto custa um projeto?</summary>
            <p>Depende do escopo. Descreva o que precisa e enviamos uma proposta.</p>
          </details>
          <details>
            <summary>Preciso saber o que quero antes?</summary>
            <p>Não. Ajudamos a transformar a ideia em escopo.</p>
          </details>
          <details>
            <summary>Posso só automatizar um processo?</summary>
            <p>Sim. Automações e integrações podem ser contratadas à parte.</p>
          </details>
        </div>
      </section>
      <section id="conv" aria-label="Assinatura Página Ponto">
        <div className="pin">
          <div className="mark">
            <h2>
              Página
              <br />
              Ponto
              <span ref={dot} className="dot" data-dot />
            </h2>
          </div>
          <button className="skip" data-skip type="button">
            Pular animação
          </button>
          <p className="tag">Tudo num só ponto.</p>
        </div>
      </section>
      <footer id="contato">
        <div>
          <p className="big">
            Qual desafio
            <br />
            vamos resolver?
          </p>
          <a href="mailto:contato@paginaponto.com.br" style={{ color: "var(--am)", marginTop: 16 }}>
            contato@paginaponto.com.br
          </a>
          <a
            className="wa-btn"
            href={whatsapp}
            target="_blank"
            rel="noopener"
            aria-label="Conversar no WhatsApp: +55 34 99886-1525"
          >
            <img src="./whatsapp-glyph-official-2026.png" alt="" width={22} height={22} />
            WhatsApp
          </a>
          <p className="area">Atendimento presencial ou on-line, onde a sua empresa estiver.</p>
        </div>
        <div>
          <h4>Navegação</h4>
          <a href="#svc">Serviços</a>
          <a href="#proj">Projetos</a>
          <a href="#contato">Orçamento</a>
        </div>
        <div>
          <h4>Redes</h4>
          <a href={whatsapp} target="_blank" rel="noopener">
            WhatsApp
          </a>
        </div>
        <div>
          <h4>Institucional</h4>
          <a href="#trust">Como trabalhamos</a>
          <a href="#trust">Perguntas frequentes</a>
          <button data-reduced type="button" aria-pressed="false">
            Movimento reduzido
          </button>
          <button data-consent type="button">
            Privacidade e cookies
          </button>
        </div>
        <small>© 2026 Página Ponto. Todos os direitos reservados.</small>
      </footer>
    </main>
  );
}
