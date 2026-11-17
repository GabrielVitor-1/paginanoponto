import { useRef } from "react";
import { linkWhats, whatsappMessages } from "../whatsapp";
import { SiteV2Webgl } from "./site-v2-webgl";
import "./preflight.css";
import "./site-v2.css";

// Real projects (links and captures). The Nexbr capture is a real screenshot of the live site.
const projects = [
  [
    "dora-doces",
    "Dora Doces",
    "Catálogo digital e navegação pensada para escolher sabores.",
    "#f2b37a",
    "https://doradoces.com.br",
    "center",
  ],
  [
    "chacaras-morro-grande",
    "Chácaras Morro Grande",
    "Apresentação das hospedagens e consulta de disponibilidade pelo WhatsApp.",
    "#d8b25c",
    "https://chacarasmorrogrande.com.br",
    "center top",
  ],
  [
    "nexbr",
    "Nexbr",
    "Site de gráfica rápida e comunicação visual em Uberlândia-MG, com catálogo de serviços e pedido de orçamento pelo WhatsApp.",
    "#ff5c25",
    "https://nexbr.vercel.app",
    "center top",
  ],
];
const whatsapp = linkWhats(whatsappMessages.geral);
export function SiteV2() {
  const root = useRef<HTMLElement>(null),
    dot = useRef<HTMLSpanElement>(null);
  return (
    <main ref={root} className="site-v2">
      <SiteV2Webgl root={root} targetRef={dot} />
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
          Criamos sites, sistemas e experiências digitais que transformam ideias em soluções reais.
        </p>
        <div className="btns">
          <a className="btn p" href="#proj">
            Explorar projetos
          </a>
          <a className="btn" href="#contato">
            Iniciar um projeto
          </a>
        </div>
      </header>
      <section id="svc" className="sec">
        <div className="svc-in">
          <h2 data-r>Sites que mostram o que você faz</h2>
          <div className="its">
            {[
              ["Sites institucionais", "Apresentam o negócio com clareza e levam ao contato."],
              ["Landing pages", "Uma página, uma ação, feita para converter."],
              ["Experiências interativas", "Movimento e interação a serviço da mensagem."],
              ["Identidade digital na web", "Sua marca aplicada com consistência em cada tela."],
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
            className={`project ${i === 1 ? "right" : ""} ${i === 0 ? "on" : ""}`}
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
        <p className="lead">Ferramentas construídas para o jeito como o seu negócio trabalha.</p>
        <div className="pans">
          {[
            ["Sistemas personalizados", "Cada regra do seu processo, no lugar certo."],
            ["Plataformas digitais", "Área de clientes, painéis e catálogos."],
            ["Aplicações web", "Rodam no navegador, em qualquer dispositivo."],
            ["Ferramentas internas", "Menos planilha solta, mais controle."],
            ["Soluções sob medida", "Conte o problema e desenhamos o caminho."],
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
              ["Conversa", "Entendemos o negócio e o objetivo do projeto."],
              ["Proposta", "Escopo, prazo e valor combinados antes de começar."],
              ["Criação", "Você acompanha e aprova cada etapa."],
              ["Entrega", "Site ou sistema no ar, com suporte para os ajustes."],
            ].map(([title, text]) => (
              <li key={title}>
                <b>{title}</b>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <div className="btns">
            <a className="btn p" href="#contato">
              Pedir orçamento
            </a>
          </div>
        </div>
        <div className="faq">
          <details>
            <summary>Quanto custa um site?</summary>
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
          <p className="cap">Tudo o que apareceu na página volta para o mesmo núcleo.</p>
          <button className="skip" data-skip type="button">
            Pular animação
          </button>
          <p className="tag">Tudo num só ponto.</p>
          <p className="mat" />
        </div>
      </section>
      <footer id="contato">
        <div>
          <p className="big">
            Vamos tirar
            <br />
            sua ideia do papel?
          </p>
          <a href="mailto:contato@paginaponto.com.br" style={{ color: "var(--am)", marginTop: 16 }}>
            contato@paginaponto.com.br
          </a>
          <a href="tel:+5534998861525">+55 34 99886-1525</a>
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
        </div>
        <small>© 2026 Página Ponto. Todos os direitos reservados.</small>
      </footer>
      <div className="site-v2-ind" aria-hidden="true">
        <span data-ind-label>Tinta</span>
        <i>
          <b data-ind-bar />
        </i>
      </div>
    </main>
  );
}
