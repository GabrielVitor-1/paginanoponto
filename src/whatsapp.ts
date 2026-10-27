import { BRAND_NAME } from "./content";

export const WHATSAPP_NUMBER = "5534998861525";

export const whatsappMessages = {
  geral: "Oi Gabriel, vi seus trabalhos e quero uma página para o meu negócio. Meu negócio é",
  essencial:
    "Olá! Tenho interesse no pacote Essencial. Quero contar sobre o meu negócio e entender o valor do projeto.",
  completo:
    "Olá! Tenho interesse no pacote Completo. Quero contar sobre o meu negócio e alinhar as seções e o valor do projeto.",
  premium:
    "Olá! Tenho interesse no pacote Premium. Quero conversar sobre integrações, agendamento ou reservas e entender o valor do projeto.",
  cidade: "Olá! Quero conversar sobre uma página para o meu negócio. Minha cidade é ______.",
  escolha: `Olá! Vi a ${BRAND_NAME}. Meu negócio é ______ e quero conversar sobre uma página.`,
} as const;

export type WhatsAppMessage = keyof typeof whatsappMessages;

export const linkWhats = (texto: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
