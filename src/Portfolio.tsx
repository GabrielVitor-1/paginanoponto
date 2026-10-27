import { linkWhats, whatsappMessages } from "./whatsapp";

type Segment = "pousada" | "loja" | "salao" | "oficina" | "turismo";
type Project = {
  name: string;
  segment: Segment;
  url: string;
  deliveries: [string, string, string];
  image: string;
  imageAlt: string;
  imagePosition?: string;
};

const labels: Record<Segment, string> = {
  pousada: "Pousadas",
  loja: "Lojas",
  salao: "Salões",
  oficina: "Oficinas",
  turismo: "Turismo",
};
const projects: Project[] = [
  {
    name: "Q Cachos",
    segment: "salao",
    url: "https://q-cachos.pages.dev",
    deliveries: [
      "Cada cuidado explicado com calma",
      "O atendimento em três passos simples",
      "Conversa direta pelo WhatsApp",
    ],
    image: "portfolio/q-cachos.webp",
    imageAlt: "Imagem de apresentação do site Q Cachos",
  },
  {
    name: "Chácaras Morro Grande",
    segment: "pousada",
    url: "https://chacarasmorrogrande.com.br",
    deliveries: [
      "Cada hospedagem tem a sua própria página",
      "Disponibilidade consultada direto no WhatsApp",
      "Domínio próprio",
    ],
    image: "portfolio/chacaras-morro-grande.webp",
    imageAlt: "Imagem de apresentação do site Chácaras Morro Grande",
    imagePosition: "center top",
  },
  {
    name: "Dora Doces e Biscoitos",
    segment: "loja",
    url: "https://doradoces.com.br",
    deliveries: [
      "Catálogo organizado por categoria, com preços",
      "Cada produto com botão de pedido no WhatsApp",
      "Endereço e domínio próprio",
    ],
    image: "portfolio/dora-doces.webp",
    imageAlt: "Imagem de apresentação do site Dora Doces e Biscoitos",
  },
];

export default function Portfolio() {
  const whatsappUrl = linkWhats(whatsappMessages.geral);
  return (
    <section
      className="section portfolio"
      id="trabalhos"
      aria-labelledby="trabalhos-titulo"
      data-atmosphere="portfolio"
    >
      <div className="container">
        <div className="portfolio-heading reveal">
          <h2 id="trabalhos-titulo">Cada negócio precisa de um jeito claro de ser encontrado.</h2>
          <p>Uma seleção das páginas que fiz. Cada uma parte do que o negócio precisa mostrar.</p>
        </div>
        <div className="portfolio-grid">
          {projects.map((project) => (
            <article className="portfolio-card" key={project.name}>
              <div className="portfolio-media">
                <img
                  src={project.image}
                  alt={project.imageAlt}
                  width="1200"
                  height="630"
                  loading="lazy"
                  style={{ objectPosition: project.imagePosition }}
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              </div>
              <div className="portfolio-card-content">
                <p className="portfolio-tag">{labels[project.segment]}</p>
                <h3>{project.name}</h3>
                <ul>
                  {project.deliveries.map((delivery) => (
                    <li key={delivery}>{delivery}</li>
                  ))}
                </ul>
                <div className="portfolio-card-action">
                  <a
                    className="portfolio-visit"
                    href={project.url}
                    target="_blank"
                    rel="noopener"
                    data-evento="portfolio_click"
                    data-cliente={project.name}
                    aria-label={`Visitar site: abrir o site de ${project.name} em nova aba`}
                  >
                    <span>Visitar site</span>
                    <svg aria-hidden="true" viewBox="0 0 16 16">
                      <path d="M6 3h7v7M13 3 6 10M3 6v7h7" />
                    </svg>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="portfolio-cta reveal">
          <a
            className="button button-primary"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Quero uma página para meu negócio: abrir conversa pelo WhatsApp"
          >
            Quero uma página para meu negócio
          </a>
        </div>
      </div>
    </section>
  );
}
