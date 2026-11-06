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
- **Tipagem Forte e Zod**: Sempre tipar os retornos das funções. O Zod atuará como o portão de entrada (Anti-Corruption Layer) blindando as Server Actions e APIs de dados malformados.
- **Functional Domain Modeling**: O domínio da aplicação será "rico", porém adaptado ao paradigma funcional. Regras de negócio devem ser encapsuladas em **funções puras** (que recebem dados primitivos/objetos e retornam o novo estado) para garantir testabilidade máxima, sem depender de classes ou orientação a objetos. As Server Actions serão apenas orquestradoras.
- **SSE / Eventos**: Evite chamadas síncronas bloqueantes longas. O fluxo de pagamento e notificação de lojista se apoiará em processamento assíncrono.
- **SSR e Server Components**: Privilegie o uso de Server Components na visualização da vitrine para garantir máxima performance ("blazing fast").
- **Design de Banco**: Cuidado ao misturar conceitos de loja com sessão de usuário. Um `User` pode ser `ADMIN`, `LOJISTA` ou `CLIENTE`.
- **Paginação e Performance**: Nenhuma query de listagem (produtos, pedidos) deve ser feita sem `limit` e suporte a paginação/cursores para evitar overload no banco.
- **Testes**: A estratégia de testes será baseada em Testes Unitários -> Testes de Integração usando **Vitest**. Nenhum código crítico (como cálculos de carrinho e pagamentos) deve ser commitado sem testes.
- **Design System e UI**: Evitar bibliotecas genéricas (como shadcn/ui) para garantir identidade visual única. Construir componentes base reutilizáveis (Design System próprio) em `/src/components/ui` (ex: Button, Input) e utilizá-los em toda a aplicação. Utilizar **variáveis CSS globais** mapeadas no Tailwind (ex: `bg-primary`) para facilitar trocas de tema centralizadas, fugindo de cores "hardcoded".
- **Commits Padrão**: Utilizar a convenção de commits semânticos (ex: `feat:`, `fix:`, `chore:`, `test:`).
- **Nomes Descritivos em Migrações**: Ao gerar novas migrações com o Drizzle Kit, nunca usar a geração padrão com codinomes aleatórios. Sempre fornecer nomes explícitos e semânticos via `--name <nome_descritivo>` (ex: `npx drizzle-kit generate --name create_stores_table`).
- **Deploy e Infraestrutura (AWS + GitHub Actions)**: O build da aplicação Next.js (imagem Docker standalone), workers e dashboard do Bull-Board deve ser executado **exclusivamente no GitHub Actions** gerando uma **Imagem Docker Unificada** publicada no **AWS ECR**. A **AWS EC2** apenas puxa essa imagem única para executar os serviços (`app`, `worker` consolidado e `queues-board` sob demanda via Docker Compose). O banco de dados relacional de produção roda no **AWS RDS PostgreSQL** (desacoplado da EC2 para economizar RAM). Nunca rodar `npm run build` diretamente na EC2 para evitar travamento por esgotamento de memória (OOM).

## Módulo de Inteligência Artificial (Assistente do Lojista)

O sistema conta com um assistente conversacional inteligente dedicado ao lojista autenticado. O módulo reside em `/src/server/modules/ai` e segue estritamente as seguintes diretrizes:

- **Autenticação e Multi-tenancy Mandatórios**: Nenhuma interação com a IA ocorre sem sessão autenticada com role `LOJISTA`. O `storeId` e `userId` são extraídos da sessão validada e injetados de forma imutável no contexto de execução do agente. É expressamente proibido permitir que o modelo deduza ou alterne de loja.
- **Independência de SDK Serverless**: Não utilizamos o SDK da Vercel (`ai` / `ai-sdk`). O harness e os clientes de modelos são implementados diretamente usando LangChain / SDKs oficiais dos provedores (ex: `@google/genai` / `@langchain/google-genai`), garantindo portabilidade para execução conteinerizada em servidores dedicados/EC2 (Node.js runtime).
- **Divisão de Responsabilidades (Leitura vs. Escrita)**:
  - **Consultas Analíticas (Text2SQL com Guardrails)**: O lojista pode fazer perguntas livres sobre suas vendas, pedidos, clientes e catálogo. A harness de Text2SQL:
    1. Executa exclusivamente instruções de leitura (`SELECT`). Qualquer menção a `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE` ou comandos DDL/DML de escrita é bloqueada por analisador sintático/AST antes do envio ao banco.
    2. Aplica filtro mandatório de isolamento (`WHERE store_id = :storeId`) e cláusula de `LIMIT` e paginação para blindar a infraestrutura.
    3. Utiliza conexão/transação com usuário de banco de dados restrito (`read-only`) ou schemas/views específicas para IA.
    4. Possui rate limiting por lojista gerenciado via Redis.
  - **Mutações de Negócio via Function Calling (Tools)**: Alterações de estado são restritas a **Tools tipadas com Zod**. A IA não executa SQL de escrita. As ferramentas acionam as funções de domínio existentes do projeto para:
    - Adicionar e modificar produtos.
    - Renovar e ajustar estoque de produtos.
    - Alterar status operacional da loja (abrir/fechar loja).
    - Atualizar status de pedidos (`CONFIRMED`, `PREPARING`, `DISPATCHED`, etc.), preservando disparos de eventos/SSE.

## Stack
- Next.js
- PostgreSQL & Drizzle ORM
- Redis & BullMQ
- BetterAuth
- TailwindCSS
- Vitest
- AWS (EC2, ECR, RDS) & GitHub Actions (CI/CD)

*Atualize o `docs/checkpoints.md` sempre que uma nova grande fase do projeto for completada.*
