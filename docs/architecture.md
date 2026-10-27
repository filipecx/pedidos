# Arquitetura e System Design

## Tech Stack
- **Frontend / Backend**: Next.js (LTS mais novo) - React, Server Components, Server Actions, API Routes.
- **Banco de Dados Relacional**: PostgreSQL gerenciado via **AWS RDS** (ou Supabase/Neon).
- **ORM**: Drizzle ORM (tipagem forte, leve, migrações fáceis).
- **Autenticação**: BetterAuth. (Sessão baseada no banco/Redis para permitir revogação e maior segurança).
- **Containerização**: Docker (Next.js standalone, BullMQ Workers, Redis).
- **Testes**: Vitest (testes unitários e integração).
- **Cache e Mensageria (Filas/SSE)**: Redis.
- **Job Queue**: BullMQ (para processar webhooks do OpenPix, liberação de reserva de estoque e tarefas agendadas).
- **Validação de Dados**: Zod (tanto no frontend via formulários quanto no backend para API).
- **Hospedagem de Imagens**: Cloudflare R2 (S3-compatible) ou AWS S3.
- **Meio de Pagamento**: OpenPix.
- **Infraestrutura / Cloud**: AWS (EC2, ECR, RDS) + GitHub Actions.

## Infraestrutura (Deploy e CI/CD)
- **CI/CD com GitHub Actions**: O build completo da aplicação Next.js e a geração da imagem Docker ocorrem **exclusivamente dentro do runner do GitHub Actions**. Nunca executar `npm run build` diretamente dentro da EC2 para evitar travamento por falta de memória (OOM Killer).
- **Padrão de Imagem Docker Unificada (Unified Container Image)**:
  - Uma **única imagem Docker** (`pedidos-app:latest`) é compilada no GitHub Actions e enviada ao **AWS ECR**.
  - Essa imagem contém:
    1. A aplicação Next.js compilada (`server.js` via standalone);
    2. O runner consolidado dos workers BullMQ (`dist/server/all.worker.js`);
    3. O painel administrativo do Bull-Board (`dist/server/dashboard.js`).
  - No `docker-compose.yml` da EC2, a mesma imagem é reutilizada para múltiplos serviços através do override de comando:
    - `app`: `command: node server.js` (Porta 3000)
    - `worker`: `command: node dist/server/all.worker.js` (Processo único consolidado para economizar RAM)
    - `queues-board`: `command: node dist/server/dashboard.js` (Porta 3001, pode rodar sob demanda para poupar memória)
- **AWS ECR (Elastic Container Registry)**: Armazena e versiona as imagens Docker produzidas pelo GitHub Actions.
- **AWS EC2 (Free Tier / t2.micro)**: Hospeda os containers (`app`, `worker`, `queues-board`, `redis`, `nginx`), puxando a imagem única do ECR. A EC2 deve ter **memória SWAP (2GB - 4GB)** configurada para estabilidade.
- **AWS RDS (PostgreSQL)**: Banco de dados relacional gerenciado e isolado da EC2, garantindo persistência, backups automáticos e liberando ~150MB de memória RAM da instância EC2.
- **Rotas de Lojas**: Baseadas no padrão sub-rota (ex: `app.com/doces-da-maria`), dispensando complexidade de Custom Domains via Middleware neste momento.

## Modelagem de Dados Inicial

**User**
- `id`: uuid
- `email`: varchar
- `name`: varchar
- `password_hash`: varchar (gerenciado pelo BetterAuth)
- `phone`: varchar
- `role`: enum (ADMIN, LOJISTA, CLIENTE)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Store (Loja)**
- `id`: uuid
- `owner_id`: uuid (FK User)
- `name`: varchar
- `slug`: varchar (unique)
- `banner_url`: varchar
- `profile_url`: varchar
- `pix_key`: varchar
- `business_hours`: jsonb (Ex: `{ "monday": { "open": "08:00", "close": "18:00" }, ... }`)
- `delivery_radius`: int (metros ou km)
- `plan_type`: enum (PERCENTAGE, MONTHLY)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Category**
- `id`: uuid
- `store_id`: uuid (FK Store)
- `name`: varchar
- `display_order`: int
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Product**
- `id`: uuid
- `store_id`: uuid (FK Store)
- `category_id`: uuid (FK Category)
- `name`: varchar
- `description`: text
- `image_url`: varchar
- `active`: boolean
- `is_pronta_entrega`: boolean
- `is_encomenda`: boolean
- `pronta_entrega_price`: numeric(10, 2)
- `encomenda_price`: numeric(10, 2)
- `quantity`: int (estoque pronta entrega)
- `min_days_encomenda`: int
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Combo**
- `id`: uuid
- `store_id`: uuid (FK Store)
- `name`: varchar
- `display_order`: int
- `type`: enum (PRONTA_ENTREGA, ENCOMENDA)
- `price`: numeric(10, 2)
- `rule`: jsonb
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Order (Pedido)**
- `id`: uuid
- `idempotency_key`: varchar (unique)
- `store_id`: uuid (FK Store)
- `order_number`: int (Sequencial único por loja, ex: #001)
- `customer_id`: uuid (FK User, opcional para guests)
- `customer_name`: varchar
- `customer_phone`: varchar
- `type`: enum (PRONTA_ENTREGA, ENCOMENDA)
- `delivery_method`: enum (DELIVERY, PICKUP)
- `scheduled_time`: timestamp (para encomendas)
- `total_amount`: numeric(10,2)
- `status`: enum (PENDING_PAYMENT, PAID, PREPARING, READY, DISPATCHED, CANCELLED, EXPIRED)
- `payment_method`: enum (PIX)
- `createdAt`: timestamp
- `updatedAt`: timestamp

**OrderItem**
- `id`: uuid
- `order_id`: uuid (FK Order)
- `product_id`: uuid (FK Product)
- `quantity`: int
- `unit_price`: numeric(10,2)
- `observations`: text

**Sale / Payment (Pagamentos)**
- `id`: uuid
- `order_id`: uuid (FK Order)
- `provider_transaction_id`: varchar (OpenPix Charge ID)
- `amount`: numeric(10,2)
- `status`: enum (PENDING, APPROVED, DENIED, EXPIRED, CANCELLED)
- `qr_code`: text
- `qr_code_link`: varchar
- `expires_at`: timestamp
- `createdAt`: timestamp
- `updatedAt`: timestamp

## Arquitetura de Eventos e Real-Time (SSE)
- Quando o Lojista gera o PIX no checkout, o backend desconta o estoque (reserva) e enfileira um Job (BullMQ) para rodar em 10 minutos. 
- Se o webhook de pagamento do OpenPix não confirmar o PIX nesse período, o Job marca o pedido como EXPIRED e **devolve a quantidade ao estoque**.
- Um endpoint de SSE (Server-Sent Events) no Next.js do lado do Lojista recebe os eventos (novo pedido pago, estorno, expiração) via Redis Pub/Sub e empurra a atualização para o frontend.

## Segurança e Performance (Políticas da API)
- **Paginação Obrigatória**: Nunca retornar listas completas do banco de dados (ex: consultar todos os produtos ou todos os pedidos de uma vez). Todas as queries que retornam coleções devem usar limitação (`LIMIT`, `OFFSET` ou cursores baseados em ID/data).
- **Rate Limiting**: Implementaremos um limite de requisições por IP ou por usuário (usando Redis ou ferramentas integradas no Next.js Middleware/Upstash) para evitar que usuários maliciosos façam *DDoS* ou brute-force em nossa infraestrutura, derrubando a API ou sobrecarregando o banco de dados.
- **Cache da Vitrine (Redis/Next.js)**: Para garantir a exigência de "Blazing Fast" no mobile, os dados da vitrine pública de cada Lojista (produtos, preços, banners) serão servidos a partir de **Cache** em vez de consultar o Postgres a cada hit. Imagens serão delegadas paralelamente à CDN. Utilizaremos estratégias de *On-demand Revalidation* (Invalidação de Cache sob demanda) para que o lojista veja a vitrine atualizar na hora quando edita um produto.

## Estratégia de Deploy Alternativa / Multi-Aplicações: Oracle Cloud (OCI Always Free)

Como alternativa de custo zero (R$ 0,00/mês) para hospedar este SaaS e **múltiplas outras aplicações simultâneas**, o projeto documenta a viabilidade de uso da infraestrutura **Oracle Cloud Always Free (Ampere ARM A1)**:

### 1. Capacidade do Tier Gratuito Permanente (Always Free)
- **CPU & Memória**: Até 4 OCPUs (vCPUs ARM Ampere) e **24 GB de Memória RAM**.
- **Armazenamento**: 200 GB de SSD em Bloco (Block Volume).
- **Rede**: 1 IP Público IPv4 Fixo Grátis + 10 TB de transferência mensal.

### 2. Cenário Multi-Aplicações em Servidor Único (Docker + Nginx)
Graças aos 24 GB de RAM, é viável executar com folga:
- **Nginx Reverse Proxy com Certbot**: Porta 80/443 roteando múltiplos domínios e subdomínios via SNI e gerenciando certificados SSL Let's Encrypt automaticamente.
- **Container do SaaS Pedidos**:
  - `app` (Next.js Standalone): ~512MB - 1GB RAM.
  - `workers` (All-in-one BullMQ consolidado): ~512MB RAM.
  - `queues-board` (Bull-Board): ~128MB RAM.
- **Bancos Compartilhados ou Isolados**:
  - `PostgreSQL` com tuned shared_buffers (2GB - 4GB RAM).
  - `Redis` (512MB - 1GB RAM).
- **Outras Aplicações Paralelas**: Espaço remanescente (~15 GB de RAM) para hospedar APIs secundárias, landing pages, bots ou outros micro-SaaS em containers isolados via Docker Compose.

### 3. Requisitos de Build e Arquitetura
- **Arquitetura ARM64**: As imagens Docker devem ser compiladas para `linux/arm64` no GitHub Actions (via `docker/setup-buildx-action`) ou multi-arch (`linux/amd64,linux/arm64`).
- **Firewall Dual**: Abrir portas HTTP (80) e HTTPS (443) tanto nas *Ingress Security Rules* da VCN da Oracle quanto no *iptables/ufw* do sistema operacional (Ubuntu/Oracle Linux).

