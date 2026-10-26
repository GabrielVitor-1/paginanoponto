export const SITE_URL = "https://gabrielvitor-1.github.io/paginanoponto/";

export type Example = {
  name: string;
  url: string;
  image: string;
  imageAlt: string;
  fictional?: boolean;
};

export const content = {
  respostaPromessa: "",
  prazoPublicacao: "",
  exemploLegenda: "",
  exemplos: [] as Example[],
  precoEssencial: "",
  precoCompleto: "",
  precoPremium: "",
  pacoteDestaque: "",
  faqPreco: "",
  faqPrazo: "",
  faqMensalidade: "",
  faqAlteracoes: "",
  analytics: {
    provider: "" as "" | "plausible" | "umami",
  },
} as const;
