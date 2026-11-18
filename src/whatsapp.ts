import { BRAND_NAME } from "./content";

export const WHATSAPP_NUMBER = "5534998861525";

export const whatsappMessages = {
  geral: `Oi, Gabriel! Vi os trabalhos da ${BRAND_NAME} e gostaria de conversar sobre um site para o meu negócio.`,
  essencial:
    "Olá! Tenho interesse no pacote Essencial. Quero contar sobre o meu negócio e entender o valor do projeto.",
  completo:
    "Olá! Tenho interesse no pacote Completo. Quero contar sobre o meu negócio e alinhar as seções e o valor do projeto.",
  premium:
    "Olá! Tenho interesse no pacote Premium. Quero conversar sobre integrações, agendamento ou reservas e entender o valor do projeto.",
  cidade: "Olá! Gostaria de conversar sobre um site para o meu negócio.",
  escolha: `Olá! Vi a ${BRAND_NAME} e gostaria de conversar sobre um site para o meu negócio.`,
  iniciar: `Olá! Vim pelo site da ${BRAND_NAME} e gostaria de conversar sobre um novo projeto.`,
  orcamento: `Olá! Vim pelo site da ${BRAND_NAME} e gostaria de pedir um orçamento.`,
} as const;

export type WhatsAppMessage = keyof typeof whatsappMessages;

export const linkWhats = (texto: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
