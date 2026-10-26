import { content } from "./content";

export default function ExampleShowcase() {
  if (!content.exemplos.length) return null;

  return (
    <section
      className="section portfolio examples"
      aria-labelledby="exemplos-titulo"
      data-atmosphere="examples"
    >
      <div className="container">
        <div className="portfolio-heading reveal">
          <p className="section-label">Veja como fica</p>
          <h2 id="exemplos-titulo">Uma página de verdade, aberta no celular.</h2>
          {content.exemploLegenda && <p className="examples-caption">{content.exemploLegenda}</p>}
        </div>
        <div className="portfolio-grid">
          {content.exemplos.map((example) => (
            <article className="portfolio-card" key={example.url}>
              <div className="portfolio-media">
                <img
                  src={example.image}
                  alt={example.imageAlt}
                  width="1200"
                  height="630"
                  loading="lazy"
                />
              </div>
              <div className="portfolio-card-content">
                <h3>{example.name}</h3>
                {example.fictional && (
                  <p className="portfolio-tag">Exemplo fictício, criado para mostrar o formato.</p>
                )}
                <div className="portfolio-card-action">
                  <a
                    className="portfolio-visit"
                    href={example.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-evento="exemplo_click"
                    data-evento-local="exemplo"
                    aria-label="Abrir o exemplo em nova aba"
                  >
                    Abrir o exemplo <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
