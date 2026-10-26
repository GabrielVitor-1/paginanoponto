export const WHATSAPP_NUMBER = "5534998861525";

export const whatsappMessages = {
  geral:
    "Olá, Gabriel! Vi a Página no Ponto e quero conversar sobre uma página para o meu negócio. Meu negócio é",
  pousada: "Oi Gabriel, tenho uma pousada e quero uma página com fotos, localização e contato.",
  loja: "Oi Gabriel, tenho uma loja e quero uma página com horários, produtos e WhatsApp.",
  salao: "Oi Gabriel, tenho um salão e quero uma página com serviços, horários e agendamento.",
  oficina: "Oi Gabriel, tenho uma oficina e quero uma página com serviços, endereço e contato.",
  turismo: "Oi Gabriel, trabalho com turismo e quero uma página com passeios, fotos e reservas.",
  essencial:
    "Olá, Gabriel! Tenho interesse no pacote Essencial. Quero te contar sobre o meu negócio e saber o valor.",
  completo:
    "Olá, Gabriel! Tenho interesse no pacote Completo. Quero te contar sobre o meu negócio e alinhar as seções e o valor.",
  premium:
    "Olá, Gabriel! Tenho interesse no pacote Premium. Quero conversar sobre agendamento ou reservas e saber o valor.",
  cidade:
    "Olá, Gabriel! Vi a Página no Ponto e quero conversar sobre uma página para o meu negócio. Meu negócio é",
  escolha:
    "Olá, Gabriel! Vi a Página no Ponto e quero conversar sobre uma página para o meu negócio. Meu negócio é",
} as const;

export type WhatsAppMessage = keyof typeof whatsappMessages;

export const linkWhats = (texto: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
