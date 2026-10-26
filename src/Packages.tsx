import { linkWhats, whatsappMessages } from "./whatsapp";

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
  },
  {
    name: "Premium",
    audience: "Para fazer mais pela página",
    deliveries: [
      "Conteúdo do Instagram junto das informações principais",
      "Pedidos de agendamento ou reserva sem começar tudo do zero no WhatsApp",
      "Estrutura preparada para apresentar melhor o negócio nas buscas pelo nome e pela região",
    ],
    url: linkWhats(whatsappMessages.premium),
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
          >
            {item.featured && <p className="package-badge">Mais escolhido</p>}
            <p className="package-for">Para quem é</p>
            <h3>{item.name}</h3>
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
              aria-label={`Conversar pelo WhatsApp sobre o pacote ${item.name}`}
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
