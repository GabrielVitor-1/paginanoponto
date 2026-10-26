import { linkWhats, whatsappMessages } from "./whatsapp";
import { content } from "./content";

const packages = [
  {
    name: "Essencial",
    audience: "Para começar",
    deliveries: [
      "Uma página direta para sair do improviso",
      "Fotos, horário, localização e o que você oferece",
      "Um botão claro para iniciar a conversa",
    ],
    url: linkWhats(whatsappMessages.essencial),
    price: content.precoEssencial,
  },
  {
    name: "Completo",
    audience: "Para mostrar mais",
    deliveries: [
      "Espaço para explicar serviços, quartos, passeios ou opções",
      "Um endereço próprio para divulgar sem depender do link do Instagram",
      "Visual pensado a partir das fotos e do jeito do seu negócio",
    ],
    url: linkWhats(whatsappMessages.completo),
    featured: true,
    price: content.precoCompleto,
  },
  {
    name: "Premium",
    audience: "Para fazer mais pela página",
    deliveries: [
      "Conteúdo do Instagram junto das informações principais",
      "Pedidos de agendamento ou reserva sem começar tudo do zero no WhatsApp",
      "Ajustes para o negócio ser encontrado mais fácil quando alguém pesquisa o nome ou a região",
    ],
    url: linkWhats(whatsappMessages.premium),
    price: content.precoPremium,
  },
];

// TODO: confirmar se domínio, revisões e perfil no Google entram em todos os pacotes.
const included = [
  "Você envia fotos e informações soltas, eu organizo",
  "Você confere antes de publicar",
  "Link pronto para bio, Google e WhatsApp",
];

export default function Packages() {
  return (
    <>
      <div className="package-grid reveal">
        {packages.map((item) => (
          <article
            className={`package-card${item.featured ? " package-card-featured" : ""}`}
            key={item.name}
            onPointerMove={(event) => {
              if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
              const bounds = event.currentTarget.getBoundingClientRect();
              const rotateX = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2;
              const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
              event.currentTarget.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
              event.currentTarget.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
            }}
            onPointerLeave={(event) => {
              event.currentTarget.style.removeProperty("--tilt-x");
              event.currentTarget.style.removeProperty("--tilt-y");
            }}
          >
            {content.pacoteDestaque === item.name && (
              <p className="package-badge">Indicado para a maioria</p>
            )}
            <p className="package-for">Para quem é</p>
            <h3>{item.name}</h3>
            {item.price && <p className="package-price">A partir de R$ {item.price}</p>}
            <p className="package-summary">{item.audience}</p>
            <ul>
              {item.deliveries.map((delivery) => (
                <li key={delivery}>{delivery}</li>
              ))}
            </ul>
            <a
              className="button package-button"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Quero entender o ${item.name}: abrir conversa pelo WhatsApp`}
              data-evento="whatsapp_click"
              data-evento-local={`pacote_${item.name.toLowerCase()}`}
            >
              Quero entender o {item.name}
            </a>
          </article>
        ))}
      </div>
      <aside className="package-included">
        <p>Em todos os pacotes</p>
        <ul>
          {included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </aside>
    </>
  );
}
