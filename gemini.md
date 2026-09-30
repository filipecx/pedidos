# Projeto: Plataforma SaaS para MEIs e Confeiteiros

Este projeto consiste em uma plataforma SaaS para gerenciamento de vitrines, pedidos, estoques e pagamentos (PIX) para confeiteiros e pequenos vendedores do ramo de alimentação.

## Estrutura do Projeto

O projeto adota uma arquitetura modular dentro de um repositório único, com a seguinte estrutura proposta:

- `/docs`: Documentações do projeto (requisitos, arquitetura, checkpoints).
- `/src/app`: Rotas da aplicação Next.js (App Router).
- `/src/components`: Componentes React reutilizáveis (UI e específicos do domínio).
- `/src/lib`: Bibliotecas compartilhadas, utilitários, configurações e integrações.
- `/src/db`: Configurações, schema e migrações do Drizzle ORM.
- `/src/server`: Server Actions, rotas de API, e lógicas de backend isoladas.
- `/src/types`: Definições de tipos TypeScript globais (Zod schemas inclusos).

## Regras e Convenções para AI/Agentes

- **Mobile-first**: Todo o CSS/Tailwind escrito para a vitrine deve focar na visualização em celular primeiro.
- **Tipagem Forte**: Sempre tipar os retornos das funções, especialmente as de banco de dados. Utilizar o schema do Drizzle em conjunto com Zod.
- **SSE / Eventos**: Evite chamadas síncronas bloqueantes longas. O fluxo de pagamento e notificação de lojista se apoiará em processamento assíncrono.
- **SSR e Server Components**: Privilegie o uso de Server Components na visualização da vitrine para garantir máxima performance ("blazing fast").
- **Design de Banco**: Cuidado ao misturar conceitos de loja com sessão de usuário. Um `User` pode ser `LOJISTA` ou `CLIENTE`.
- **Paginação e Performance**: Nenhuma query de listagem (produtos, pedidos) deve ser feita sem `limit` e suporte a paginação/cursores para evitar overload no banco.
- **Testes**: A estratégia de testes será baseada em Testes Unitários -> Testes de Integração usando **Vitest**. Nenhum código crítico (como cálculos de carrinho e pagamentos) deve ser commitado sem testes.
- **Commits Padrão**: Utilizar a convenção de commits semânticos (ex: `feat:`, `fix:`, `chore:`, `test:`).

## Stack
- Next.js
- PostgreSQL & Drizzle ORM
- Redis & BullMQ
- BetterAuth
- TailwindCSS
- Vitest

*Atualize o `docs/checkpoints.md` sempre que uma nova grande fase do projeto for completada.*
