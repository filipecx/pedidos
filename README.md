# 🍰 SaaS de Gestão de Pedidos e Vitrines em Tempo Real

> **Monolito modular de alta resiliência e concorrência controlada**, desenvolvido com foco em consistência transacional, processamento assíncrono desacoplado e testes automatizados rigorosos.

![Tests](https://img.shields.io/badge/tests-98%20passed-brightgreen?style=flat-square)
![Vitest](https://img.shields.io/badge/testing-Vitest-FCC72B?style=flat-square&logo=vitest&logoColor=black)
![Next.js](https://img.shields.io/badge/framework-Next.js%2016%20(App%20Router)-black?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/queue%20%26%20pubsub-Redis%20%2F%20BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/containers-Docker%20%26%20Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## 🎯 Sobre o Projeto

Plataforma multi-tenant voltada para lojistas e autônomos gerenciarem catálogo, vitrine digital mobile-first, estoque atômico e recebimento de pagamentos via PIX automatizado. 

Mais do que um CRUD comum, o projeto foi concebido para resolver **desafios reais de sistemas distribuídos e de concorrência** no comércio eletrônico: consistência de estoque em picos de acesso, resiliência na recepção de webhooks de pagamento e consumo consciente de memória em ambientes cloud com recursos limitados.

---

## 🏗️ Visão da Arquitetura

O sistema adota o padrão de **Monolito Modular** com separação clara de domínios, desacoplamento de tarefas pesadas via mensageria assíncrona e infraestrutura orientada a containers unificados.

```mermaid
flowchart TB
    Client["📱 Cliente / Lojista (Browser / PWA)"]
    Nginx["🛡️ Nginx (Reverse Proxy & Rate Limit)"]
    NextApp["⚡ Next.js Standalone (App Router)"]
    Postgres[("🐘 PostgreSQL (Drizzle ORM)")]
    Redis[("🔴 Redis (Broker BullMQ + Pub/Sub)")]
    Worker["⚙️ Background Worker (Sharp / E-mails / Status)"]
    OpenPix["💳 OpenPix Gateway"]
    R2["☁️ Cloudflare R2 / S3 (Storage)"]

    Client -->|HTTPS| Nginx
    Nginx -->|Proxy Pass| NextApp
    
    NextApp -->|Leituras & Transações Atômicas| Postgres
    NextApp -->|Publica Jobs & Eventos| Redis
    NextApp <-->|Eventos em Tempo Real (SSE)| Redis

    Redis -->|Consumo de Tarefas| Worker
    Worker -->|Persistência de Estados| Postgres
    Worker -->|Upload Imagens Otimizadas| R2

    OpenPix -.->|Webhook Idempotente| NextApp
```

---

## ⚡ Destaques de Engenharia e Problemas Resolvidos

### 1. Prevenção de Condições de Corrida (*Race Conditions*) no Estoque
* **O Problema:** Múltiplas requisições simultâneas poderiam vender o mesmo item com estoque limitado (overselling / *race condition*).
* **A Solução:** Implementação de decremento atômico diretamente a nível de banco (`UPDATE ... SET quantity = quantity - $x WHERE id = $id AND quantity >= $x`) combinado com **CHECK Constraints** no PostgreSQL (`quantity >= 0`). 
* **Verificação:** Coberto com testes de integração concorrentes em `src/server/modules/orders/race-condition.test.ts`, disparando requisições paralelas e garantindo integridade estrita sem necessidade de bloqueios pessimistas pesados (*table locks*).

### 2. Resiliência e Idempotência em Pagamentos (Inbox & Outbox Patterns)
* **O Problema:** Gateways de pagamento usam política *at-least-once delivery*, disparando o mesmo webhook de pagamento múltiplas vezes em caso de instabilidade de rede, arriscando duplicar entregas ou pedidos.
* **A Solução:**
  * **Transactional Inbox Pattern:** O ID único do evento é gravado na tabela `webhookInbox` dentro da **mesma transação** de confirmação do pedido. Se o webhook bater duplicado, a violação de chave única (`Postgres 23505`) força um *rollback* limpo e responde `200 OK` para cessar os retries do provedor.
  * **Optimistic Concurrency Control:** O status do pedido só é promovido com a guarda `WHERE id = $id AND status = 'PENDING'`, prevenindo execução duplicada.
  * **Transactional Outbox Pattern:** Tarefas secundárias (como envio de e-mail e notificações push) não rodam durante a requisição HTTP; são gravadas no banco na mesma transação e delegadas de forma segura ao BullMQ.

### 3. Pipeline de Uploads sem Esgotamento de Memória (*Anti-OOM Streaming*)
* **O Problema:** O processamento tradicional de imagens no Node.js via buffers em memória RAM (`ArrayBuffer` ou Base64) causava picos severos de consumo de memória, ativando o *OOM Killer* da AWS/Linux em instâncias pequenas.
* **A Solução em 3 Camadas:**
  1. **Nginx:** Rejeita payloads superiores a 10MB na porta de entrada (`client_max_body_size 10M;`).
  2. **Server Streaming:** O upload faz streaming via `ReadableStream` diretamente para o disco temporário (`/tmp/uploads`), consumindo quase zero de RAM.
  3. **Worker com BullMQ:** O worker recebe apenas o caminho do arquivo temporário (`tempFilePath`), processa a imagem via pipeline nativo do **Sharp**, faz upload pro bucket S3/R2 e remove o arquivo temporário do disco (`fs.promises.unlink()`).

### 4. Notificações em Tempo Real com SSE (Server-Sent Events)
* **O Problema:** Polling constante da vitrine ou do painel de pedidos sobrecarregava o banco com queries desnecessárias a cada segundo.
* **A Solução:** Conexão unidirecional via **Server-Sent Events (SSE)** acoplada ao **Pub/Sub do Redis**. Quando um pagamento é aprovado pelo webhook, o lojista recebe a atualização em milissegundos com feedback sonoro nativo (`AudioContext`), e o cliente vê seu pedido mudar de tela instantaneamente.

### 5. Padrão de Imagem Docker Unificada (*Unified Container Image*)
* **O Problema:** Rodar múltiplos builds do Next.js ou subir processos pesados separadamente em servidores pequenos esgota CPU e memória.
* **A Solução:**
  * Build executado exclusivamente via **CI/CD no GitHub Actions**, gerando uma imagem única publicada no registry.
  * O `docker-compose.yml` reaproveita a mesma imagem para rodar os diferentes papéis do sistema via comandos específicos:
    * `app`: `node server.js` (Aplicação Next.js)
    * `worker`: `node dist/server/all.worker.js` (Worker consolidado BullMQ)
    * `migrator`: `node dist/db/migrate.js` (Runner isolado de migrações Drizzle)

---

## 🧪 Cobertura de Testes (TDD & Integração)

O projeto conta com **18 arquivos de teste e 98 casos de teste** cobrindo domínios críticos:

```bash
✓ src/server/modules/orders/race-condition.test.ts (3 tests)  # Teste de concorrência real
✓ src/server/modules/orders/actions.test.ts (10 tests)        # Fluxos completos de checkout
✓ src/server/modules/orders/state-machine.test.ts (6 tests)   # Transições de status válidas e inválidas
✓ src/server/modules/payments/openpix.test.ts (7 tests)       # Resiliência de gateway e retries
✓ src/server/common/file-storage.test.ts (4 tests)            # Validação e streaming de uploads
✓ src/server/modules/products/stock-services.test.ts          # Ajustes e reposição atômica de estoque
...
Test Files  18 passed (18)
Tests       98 passed (98)
```

Para rodar a suíte completa:
```bash
npm run test:run
```

---

## 🛠️ Tecnologias Utilizadas

| Camada | Ferramenta | Finalidade |
| :--- | :--- | :--- |
| **Linguagem** | TypeScript 5 | Tipagem estática de ponta a ponta |
| **Framework** | Next.js 16 (App Router) | Server Components, Server Actions e Standalone Output |
| **Banco de Dados** | PostgreSQL | Persistência relacional, constraints e transações ACID |
| **ORM** | Drizzle ORM | Migrações determinísticas e queries tipadas em SQL puro |
| **Cache & Filas** | Redis & BullMQ | Fila assíncrona com retries exponenciais e Pub/Sub |
| **Proxy Reverso** | Nginx | Terminação HTTP, rate limit e controle de tamanho de requisição |
| **Autenticação** | BetterAuth | Sessões seguras com controle de permissão (*RBAC*) |
| **Validação** | Zod | *Anti-Corruption Layer (ACL)* blindando dados externos |
| **Manipulação de Imagem** | Sharp | Otimização e conversão para WebP de alto desempenho |
| **Testes** | Vitest | Testes unitários e de integração com execução paralela |
| **Containers** | Docker & Compose | Orquestração do ecossistema local e de produção |

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js 20+
* Docker e Docker Compose instalados

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/filipecx/pedidos.git
   cd pedidos
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env.local
   ```

3. **Suba os serviços de infraestrutura (PostgreSQL e Redis):**
   ```bash
   docker compose up -d postgres redis
   ```

4. **Instale as dependências e rode as migrações:**
   ```bash
   npm install
   npm run db:migrate
   ```

5. **Inicie a aplicação e o worker assíncrono:**
   ```bash
   # Terminal 1: Inicia a aplicação Next.js
   npm run dev

   # Terminal 2: Inicia o worker do BullMQ
   npm run worker
   ```

6. Acesse a aplicação em: `http://localhost:3000`

---

## 👨‍💻 Autor

Desenvolvido por **Filipe** ([@filipecx](https://github.com/filipecx)).
Engenheiro focado em arquitetura backend, concorrência, testes e sistemas distribuídos resilientes.
