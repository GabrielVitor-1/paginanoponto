# SEO local: integração, medições e textos para aprovação

Branch: `seo/local-integrado` (local, não enviada, não publicada). Data: 18/11/2026.

## 1. Estado das versões

| Versão                               | Commit    | Pré-renderização                                              | Situação                               |
| ------------------------------------ | --------- | ------------------------------------------------------------- | -------------------------------------- |
| **Publicada** (paginaponto.com.br)   | `352afd5` | ❌ `<div id="root"></div>` vazio                              | Último deploy em 17/11 21:57 UTC       |
| `perf/mobile-seo-conversao`          | `4019c14` | ✅ `scripts/prerender.mjs` (`renderToString`) + `hydrateRoot` | **Local, nunca enviada nem integrada** |
| `seo/tecnico-baixo-risco` (anterior) | `cf54631` | ❌ criada a partir do publicado                               | Substituída por esta integração        |
| **`seo/local-integrado`** (esta)     | `c555e63` | ✅ preservada, sem duplicação                                 | Pronta para revisão                    |

Não houve regressão em produção. A pré-renderização nunca chegou à `main`; as branches tinham divergido.
Esta branch parte da `perf/mobile-seo-conversao` e, portanto, **também leva os 4 commits dela** (painel `?perf=1`, fluidez no celular, conteúdo pré-renderizado, projetos sempre visíveis e CTAs direto no WhatsApp). Revise-os junto.

## 2. O que entrou nesta branch

| Commit    | Mudança                                                                                                                                                                                                                                                                                                                                                      | Prova de não-regressão                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `62adad7` | **Fontes servidas pelo próprio site + fontes reserva com métricas ajustadas.** A pré-renderização exibe o texto antes das fontes; a troca deslocava o H1 e quebrava a linha de botões (**CLS 0,13**). Mesmos arquivos woff2 do Google Fonts (OFL), pré-carregados. Reservas Arial/Roboto com `size-adjust` e `ascent`/`descent`/`line-gap-override` medidos. | JS idêntico à branch de desempenho (só nomes com hash mudam). CSS: só a lista de fontes. 80/80 elementos nas mesmas posições após carregar, nos dois tamanhos, com e sem WebGL. |
| `38dd685` | Cherry-pick de `b9ef349`: JSON-LD em `@graph` (`WebSite` + `ProfessionalService`, e-mail corrigido, os 6 serviços já descritos na página) e `meta robots max-image-preview:large`.                                                                                                                                                                           | Só `<head>`.                                                                                                                                                                    |
| `c555e63` | `areaServed`: Pirenópolis (GO) e Brasil, conforme você informou. Sem endereço.                                                                                                                                                                                                                                                                               | Só `<head>`.                                                                                                                                                                    |

**Descartado:** `359fe93` (texto em `<noscript>`). Duplicaria o conteúdo que a pré-renderização já entrega a partir do mesmo componente React.

## 3. Medições (Lighthouse 13, mobile, CPU 4× mais lenta, GPU real, 3 rodadas)

|                                | Publicado      | `perf/mobile-seo-conversao` | **Esta branch**                         |
| ------------------------------ | -------------- | --------------------------- | --------------------------------------- |
| Desempenho                     | 34–38          | 40–41                       | **54–67** (66–67 com servidor aquecido) |
| FCP                            | 4,1 s          | 3,4 s                       | **1,3 s**                               |
| LCP                            | 5,0–6,0 s      | 4,6–4,9 s                   | **2,6 s**                               |
| CLS                            | 0              | **0,13** (2 de 3 rodadas)   | **0**                                   |
| TBT                            | 7,4–9,8 s      | 5,9–6,4 s                   | 5,6–6,3 s                               |
| SEO / Acessib. / Boas práticas | 100 / 93 / 100 | —                           | **100 / 98 / 100**                      |
| Palavras no HTML inicial       | ~18            | 371                         | 371                                     |

`npm run check` (ESLint, Stylelint, html-validate, Prettier, build + prerender) ✅ · `tsc --noEmit` ✅ · regressão no navegador: hidratação sem erros, WebGL ativo, mesmos 6 H2, 17 links e ~320 palavras visíveis; só os 2 avisos de depreciação do three.js que já existiam.

> Observação: no Windows, `npm run check` acusa formatação em 36 arquivos por causa do CRLF do checkout (`core.autocrlf=true`). Numa cópia com LF, como no CI, passa. Este worktree foi configurado com LF só para ele.

## 4. TBT de 6–10 s: diagnóstico

1. **É o WebGL.** Com o WebGL desligado, a mesma página dá **TBT 10 ms e desempenho 87**.
2. **Não é artefato do SwiftShader.** Com a GPU real (RTX 4060 via D3D11), o TBT é o mesmo (~6 s).
3. **Perfil de CPU** (build sem minificação, CPU 4×), tarefas longas de 2,6 s e 3,3–3,8 s no chunk `site-v2-webgl`:
   - ~1,3 s em `WebGLUniforms`, na primeira vez que cada programa de shader é usado. O three.js lê os uniforms e **espera o link do shader de forma síncrona**. O `ShaderWarmup` já chama `compileAsync`, mas o loop de renderização continua desenhando a cena enquanto a compilação paralela acontece, então cada objeto bloqueia na primeira vez.
   - ~0,9 s no próprio aquecimento: um desenho de tudo num recorte de 1 px, para o ANGLE finalizar os shaders nativos.
   - ~0,5 s no passe de transmissão do vidro nos primeiros quadros; ~0,9 s na montagem da cena (React/r3f).
4. **Impacto real:** em celulares de entrada, isso aparece como 1–3 s de página travada logo após a abertura (o INP sofre se a pessoa tocar nesse momento). O ranqueamento usa dados de campo (INP), que o Search Console ainda não mostra por falta de tráfego.

**Recomendação: não mexer agora.** A correção candidata é segurar o desenho regular até o `compileAsync` terminar e espalhar o aquecimento por vários quadros. Estimo uma redução de ~1,3–1,8 s do TBT (CPU 4×). O efeito visual seria o mundo 3D aparecer algumas centenas de milissegundos depois em aparelhos lentos; os efeitos em si não mudam. Proponho testar numa branch própria, com comparação lado a lado, **só se** o relatório de Core Web Vitals do Search Console indicar INP ruim no celular.

## 5. Textos para aprovação (nada aplicado)

Critério: só o que é verdadeiro e útil para quem lê. Sem repetição de palavras-chave e sem texto escondido.

### 5.1 Título da aba e dos resultados (não aparece na página)

|                     | Texto                                                           | Caracteres            |
| ------------------- | --------------------------------------------------------------- | --------------------- |
| Atual               | Página Ponto — Ideias que ganham forma                          | 38                    |
| **A (recomendado)** | Criação de sites e sistemas em Pirenópolis \| Página Ponto      | 57                    |
| B                   | Criação de sites em Pirenópolis e todo o Brasil \| Página Ponto | 62 (pode ser cortado) |
| C                   | Sites, landing pages e sistemas em Pirenópolis · Página Ponto   | 61                    |

### 5.2 Descrição (snippet dos resultados)

|                     | Texto                                                                                                                                                  | Caracteres |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Atual               | Criamos sites, sistemas e experiências digitais que transformam ideias em soluções reais.                                                              | 89         |
| **A (recomendado)** | Sites institucionais, landing pages, sistemas personalizados e automações. Atendimento presencial em Pirenópolis e região e remoto para todo o Brasil. | 150        |
| B                   | Criamos sites, landing pages, sistemas sob medida e automações para empresas. Visitas em Pirenópolis e região, atendimento remoto em todo o Brasil.    | 147        |

`og:title` e `twitter:title` ("Página Ponto — Tudo num só ponto.") ficam como estão: são da marca, para compartilhamento.

### 5.3 Conteúdo visível (mínimo, nos lugares naturais)

Hoje "Pirenópolis" não aparece em nenhum lugar visível. Para o Google ligar o site ao Perfil da Empresa e às buscas locais, proponho **duas** inserções:

1. **Nova pergunta no FAQ** (mesmo componente `<details>` das outras três; sem mudança de layout):
   > **Vocês atendem fora de Pirenópolis?**
   > Sim. Fazemos reuniões presenciais em Pirenópolis e região e atendemos empresas de todo o Brasil por videochamada e WhatsApp.
2. **Uma linha no rodapé**, junto do e-mail e do WhatsApp:
   > Atendimento presencial em Pirenópolis e região · remoto em todo o Brasil.

Opcional (avalie o impacto na composição do hero antes): 3. Lead do hero: _"Criamos sites, sistemas e experiências digitais que transformam ideias em soluções reais."_ → _"… em soluções reais, em Pirenópolis e em todo o Brasil."_ Não recomendo sem ver no preview, porque o hero é parte da composição aprovada.

Títulos (H1/H2/H3): **manter.** "Sites institucionais", "Landing pages" e "Sistemas personalizados" já coincidem com buscas comerciais. "Tarefa manual vira fluxo" não usa a palavra "automação". Se quiser, o parágrafo da seção pode mencionar "automação de processos", mas não é essencial.

### 5.4 Links internos e páginas de serviço

A homepage é uma página só, com âncoras (`#svc`, `#proj`, `#contato`, `#trust`) e sem links quebrados. Para disputar buscas específicas sem mexer na homepage, proponho criar **uma página de cada vez**, leve e sem WebGL, com conteúdo real:

1. `/sites-para-pousadas-e-turismo/`, com a prova Chácaras Morro Grande. Preciso saber: onde ficam as chácaras e o que o site resolveu para elas (se o cliente autorizar citar).
2. `/criacao-de-sites/`: Pirenópolis, região e remoto, com Dora Doces e Nexbr.
3. `/sistemas-e-automacao/`: só quando houver um caso real publicável.

Cada página teria link a partir do card de serviço correspondente na homepage. Isso muda a homepage, então entra na mesma aprovação.

### 5.5 Dados que faltam de você

- **Link público do Perfil da Empresa** (Compartilhar perfil → link `maps.app.goo.gl/…`): entra no `sameAs` do JSON-LD e liga site e perfil.
- **Cidades cadastradas** como área de atendimento no perfil: o `areaServed` deve repetir exatamente as mesmas.
- Telefone: o perfil usa o mesmo +55 34 99886-1525? Nome, site e telefone devem ser idênticos nos dois.

## 6. Perfil da Empresa: alinhamento

- Site no perfil: `https://paginaponto.com.br/`. O mesmo canônico do site.
- Categoria principal "Web designer": ok. Secundárias a considerar, se existirem na lista: "Serviço de design de sites" e "Desenvolvedor de software".
- Serviços no perfil = os 6 do site (mesmos nomes).
- Posts e fotos: projetos reais (as capturas em `public/portfolio/` servem).
- Avaliações: pedir aos três clientes reais, sem incentivo.

## 7. Publicação (quando aprovado)

```bash
cd ../pp-seo-local
git log --oneline 352afd5..HEAD          # 7 commits: 4 da branch de desempenho + 3 desta
git push origin seo/local-integrado      # para revisão; não publica
# merge na main → o workflow publica no GitHub Pages
```

Depois de publicar: atualizar `lastmod` do sitemap, usar **Inspeção de URL → Testar URL publicado** e conferir no HTML renderizado o texto "Sites institucionais", e então Solicitar indexação.
