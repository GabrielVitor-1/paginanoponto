# Auditoria de segurança

Data: 2026-08-12

## Escopo

Landing page estática hospedada no GitHub Pages, sem login, formulário, banco de dados, API
própria, cookies de aplicação ou processamento de pagamentos.

## Verificações realizadas

- `npm audit` em dependências de produção e desenvolvimento: zero vulnerabilidades.
- Busca por chaves, tokens, senhas e chaves privadas: nenhum segredo encontrado.
- Busca por sinks comuns de XSS e execução dinâmica: nenhuma ocorrência.
- Links com `target="_blank"`: todos usam `rel="noopener noreferrer"`.
- Eventos JavaScript inline: nenhum.
- HTTP público redireciona para HTTPS.
- HSTS ativo no GitHub Pages.
- Conteúdo da build revisado: somente HTML, CSS, JavaScript e assets esperados.
- Permissões do workflow limitadas a leitura do conteúdo e publicação no Pages.
- GitHub Actions fixadas por SHA imutável.
- Política de referência definida como `strict-origin-when-cross-origin`.

## Risco residual

- O telefone e o e-mail são públicos por necessidade comercial e podem receber spam.
- Google Fonts, Gmail, WhatsApp e Bitly são serviços externos com suas próprias políticas.
- O GitHub Pages não permite configurar livremente cabeçalhos como CSP, `frame-ancestors`,
  `X-Content-Type-Options` e `Permissions-Policy`.
- A imagem social atual é ilustrativa e pública; deve ser revisada ao trocar por fotos reais.

## Reavaliação

Repetir a auditoria ao adicionar formulários, analytics, scripts de terceiros, domínio próprio,
agendamento, pagamento ou qualquer backend. Esses recursos mudam substancialmente o risco.
