# Release: SEO local + pré-renderização + fontes

Branch `seo/local-integrado` · base publicada `352afd5` (tag `site-estavel-v1.0.0`) · preparado em 18/11/2026.
**Status: publicação autorizada em 18/11/2026, sem o link do Perfil da Empresa.**

## Conteúdo do release (`git log 352afd5..HEAD`)

| Commit    | Origem     | Resumo                                                                                  |
| --------- | ---------- | --------------------------------------------------------------------------------------- |
| `68e2b2a` | desempenho | Painel `?perf=1` (só aparece com o parâmetro)                                           |
| `c1f41a2` | desempenho | Fluidez no celular sem alterar os efeitos                                               |
| `1a3c79c` | desempenho | HTML pré-renderizado + hidratação; WebGL carregado após a primeira pintura              |
| `4019c14` | desempenho | Projetos sempre visíveis; "Iniciar um projeto" e "Pedir orçamento" abrem o WhatsApp     |
| `62adad7` | SEO        | Fontes servidas pelo site, com fallbacks métricos (corrige CLS 0,13 → 0)                |
| `38dd685` | SEO        | JSON-LD (`WebSite` + `ProfessionalService`) e meta robots                               |
| `c555e63` | SEO        | `areaServed` inicial                                                                    |
| `14e1590` | SEO        | Documento de integração e medições                                                      |
| `be652d1` | SEO        | Textos aprovados: título, descrição, FAQ, linha do rodapé; 6 áreas do Perfil da Empresa |

## Verificações antes do deploy (todas feitas na build final)

| #   | Verificação                            | Resultado                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Identidade, WebGL e fluidez            | JS idêntico à branch de desempenho; CSS difere só nas fontes e na classe `.area`. Hero, Como trabalhamos e convergência no nível do ruído em relação ao publicado. Na seção de serviços do desktop, o quadro do publicado reaparece **400 ms depois** no release (0,8% de diferença, igual ao ruído de 0,9%): mesma cena, iniciada depois por causa do carregamento adiado do WebGL. |
| 2   | Regressões dos 4 commits de desempenho | Nenhum texto removido; nenhum erro no console. A única mudança visual é a intencional: os cards de projeto passam de 50% para 100% de opacidade. Fluidez na rolagem completa: 60 fps nas duas versões (p99 16,8 ms; 0 quadros > 33 ms), no desktop e no mobile com CPU 4×.                                                                                                           |
| 3   | Botões comerciais                      | "Iniciar um projeto" e "Pedir orçamento" → `wa.me/5534998861525`, cada um com sua mensagem, `target=_blank`, `rel=noopener`. "Contato" → `#contato`; "Explorar projetos" → `#proj`. Botões de WhatsApp do rodapé inalterados.                                                                                                                                                        |
| 4   | Pré-renderizado × visível              | Texto do HTML inicial **idêntico** ao DOM hidratado (300 palavras); mesmos links; FAQ e linha do rodapé presentes no HTML inicial; nenhum aviso de hidratação.                                                                                                                                                                                                                       |
| 5   | Testes e build                         | `npm run check` (ESLint, Stylelint, html-validate, Prettier, build de produção + prerender) ✅ · `tsc --noEmit` ✅                                                                                                                                                                                                                                                                   |
| 6   | Visual final                           | Desktop 1440 e mobile 390, com e sem WebGL: hero, serviços, projetos, FAQ aberto, convergência, rodapé ✅ (o fallback sem WebGL mostra a assinatura como texto)                                                                                                                                                                                                                      |

Lighthouse mobile (3 rodadas; a 1ª com servidor frio):

|                                      | Publicado       | Release          |
| ------------------------------------ | --------------- | ---------------- |
| Desempenho                           | 34–38           | 66–67 (54 na 1ª) |
| FCP / LCP                            | 4,1 / 5,0–6,0 s | 1,3 / 2,6 s      |
| CLS                                  | 0               | 0                |
| TBT                                  | 7,4–9,8 s       | 6,0–6,5 s        |
| SEO / Acessibilidade / Boas práticas | 100 / 93 / 100  | 100 / 98 / 100   |

## Pendências antes de publicar

1. ~~Link público do Perfil da Empresa~~ **Adiado para uma atualização futura** (sem link público confiável ainda). Quando houver, entra como `"sameAs": ["<link>"]` no nó `ProfessionalService` do JSON-LD. Nunca usar link inventado, de pesquisa ou administrativo.
2. ✅ `public/sitemap.xml`: `<lastmod>2026-11-18</lastmod>`.
3. ✅ Publicação autorizada.

## Publicação (após a confirmação)

```bash
cd ../pp-seo-local
# 1) aplicar sameAs + lastmod, npm run check, commit
git push -u origin seo/local-integrado
# 2) merge na main (fast-forward a partir de 352afd5) → o workflow deploy-pages publica
git tag -a site-v1.1.0 -m "SEO local, pré-renderização e fontes"
git push origin site-v1.1.0
```

**Reversão:** `site-estavel-v1.0.0` aponta para o publicado atual (`352afd5`).

Depois do deploy:

- `curl` na home: o `<title>` novo e o texto "Sites institucionais" já no HTML inicial.
- Search Console → Inspeção de URL → **Testar URL publicado** → HTML renderizado → **Solicitar indexação** (uma vez).
- Search Console → Sitemaps → reenviar `sitemap.xml`.
- No Perfil da Empresa, conferir se site, nome e telefone batem com o site.

## Pendência técnica documentada: TBT da inicialização do WebGL

Não incluída neste release, por decisão. Diagnóstico completo em `docs/SEO-LOCAL-INTEGRACAO.md` § 4: ~1,3 s esperando o link dos shaders no primeiro uso (o desenho regular continua durante o `compileAsync`), ~0,9 s no desenho de aquecimento, ~0,5 s no passe de transmissão e ~0,9 s na montagem da cena (valores com CPU 4×). Com o WebGL desligado: TBT 10 ms.
Próximo passo sugerido, numa branch própria e com comparação visual lado a lado: segurar o desenho até o `compileAsync` terminar e distribuir o aquecimento entre quadros. Gatilho: INP ruim no relatório de Core Web Vitals do Search Console.
