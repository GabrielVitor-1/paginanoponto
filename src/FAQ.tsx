import { content } from "./content";

const faqs = [
  [
    "Quanto custa?",
    content.faqPreco ||
      "Depende do que a página precisa mostrar. Você me conta como o negócio funciona e eu volto com o valor fechado, antes de você decidir qualquer coisa.",
  ],
  [
    "Em quanto tempo fica pronta?",
    content.faqPrazo ||
      "Depende do pacote e de quando você me manda as fotos e as informações. Combinamos o prazo na conversa, antes de começar.",
  ],
  [
    "Tem mensalidade?",
    content.faqMensalidade ||
      "Na conversa eu explico o que está incluído e o que tem custo por ano, como o domínio, antes de fechar.",
  ],
  [
    "E se eu quiser mudar o horário ou o preço depois?",
    content.faqAlteracoes ||
      "Combinamos isso antes de começar: quantos ajustes entram no pacote e como pedir mudanças depois.",
  ],
  [
    "Já tenho Instagram. Preciso de uma página?",
    "O Instagram mostra seu trabalho, mas horário, endereço e preço ficam perdidos no meio dos posts. A página junta o que a pessoa precisa para decidir, e você coloca o link na bio.",
  ],
  [
    "Não tenho fotos boas. Dá para fazer?",
    "Dá para começar com as que você já tem. Se alguma não ajudar, eu te digo qual vale trocar.",
  ],
  [
    "Meu negócio é pequeno. Serve?",
    "Serve. Pousada, restaurante, passeio, loja, salão, oficina: se as pessoas procuram você pelo celular, uma página ajuda.",
  ],
] as const;

export default function FAQ() {
  return (
    <section className="section faq" aria-labelledby="faq-titulo" data-atmosphere="faq">
      <div className="container faq-inner reveal">
        <p className="section-label">Dúvidas</p>
        <h2 id="faq-titulo">O que costumam me perguntar</h2>
        <div className="faq-list">
          {faqs.map(([question, answer], index) => (
            <details key={question}>
              <summary data-evento="faq_aberto" data-evento-local={`faq_${index + 1}`}>
                {question}
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
