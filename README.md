# Gabriel Vitor - landing page

Base leve e reutilizavel para a landing page pessoal de Gabriel Vitor e futuros projetos
do mesmo tipo. A pagina final sera feita com HTML, CSS e JavaScript puros; o Vite existe
apenas para desenvolvimento local e geracao da pasta `dist`.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

No Windows deste computador, use `npm.cmd` se a politica do PowerShell bloquear `npm.ps1`.

## Comandos

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run check
npm.cmd run build
```

## Publicação

Cada push na branch `main` valida e publica a pasta `dist` pelo GitHub Pages. A configuração
está em `.github/workflows/deploy-pages.yml`.

- Página pública: `https://gabrielvitor-1.github.io/paginanoponto/`
- Link curto para divulgação: `https://bit.ly/paginanoponto`
- O link curto não deve ser usado como URL canônica ou no sitemap.

## Estrutura

- `index.html`: documento e metadados da pagina
- `src/styles.css`: tokens e estilos mobile-first
- `src/main.js`: comportamento progressivo da pagina
- `public/`: imagens e arquivos publicados sem transformacao
- `docs/PROJECT-BRIEF.md`: requisitos consolidados e pendencias
- `docs/DESIGN-DECISIONS.md`: registro das duas passadas de design
- `design-system/gabriel-vitor/MASTER.md`: recomendacao automatica de referencia

## Reuso

Para uma nova landing page, duplique a base sem `node_modules` e `dist`, troque o nome no
`package.json`, preencha um novo briefing e refaca as duas passadas de design. Nao copie a
identidade visual de Gabriel para clientes: reutilize a infraestrutura e os criterios de
qualidade, nao as cores, fontes ou assinatura visual.
