export const WHATSAPP_NUMBER = "5534998861525";

export const whatsappMessages = {
  geral: "Oi Gabriel, vi seus trabalhos e quero uma página para o meu negócio.",
  pousada: "Oi Gabriel, tenho uma pousada e quero uma página com fotos, localização e contato.",
  loja: "Oi Gabriel, tenho uma loja e quero uma página com horários, produtos e WhatsApp.",
  salao: "Oi Gabriel, tenho um salão e quero uma página com serviços, horários e agendamento.",
  oficina: "Oi Gabriel, tenho uma oficina e quero uma página com serviços, endereço e contato.",
  turismo: "Oi Gabriel, trabalho com turismo e quero uma página com passeios, fotos e reservas.",
  essencial:
    "Olá! Tenho interesse no pacote Essencial. Quero contar sobre o meu negócio e entender o valor do projeto.",
  completo:
    "Olá! Tenho interesse no pacote Completo. Quero contar sobre o meu negócio e alinhar as seções e o valor do projeto.",
  premium:
    "Olá! Tenho interesse no pacote Premium. Quero conversar sobre integrações, agendamento ou reservas e entender o valor do projeto.",
  cidade: "Olá! Quero conversar sobre uma página para o meu negócio. Minha cidade é ______.",
  escolha: "Olá! Vi o site. Meu negócio é ______ e quero conversar sobre uma página.",
} as const;

export type WhatsAppMessage = keyof typeof whatsappMessages;

export const linkWhats = (texto: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
