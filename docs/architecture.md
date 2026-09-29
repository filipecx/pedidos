# Arquitetura e System Design

## Tech Stack
- **Frontend / Backend**: Next.js (LTS mais novo) - React, Server Components, Server Actions, API Routes.
- **Banco de Dados Relacional**: PostgreSQL (hospedado na VPS ou Supabase/Neon).
- **ORM**: Drizzle ORM (tipagem forte, leve, migrações fáceis).
- **Autenticação**: BetterAuth. (Sessão baseada no banco/Redis para permitir revogação e maior segurança).
- **Containerização**: Docker (Postgres, Redis, Aplicação, Workers).
- **Testes**: Vitest (testes unitários e integração).
- **Cache e Mensageria (Filas/SSE)**: Redis.
- **Job Queue**: BullMQ (para processar webhooks do OpenPix, liberação de reserva de estoque e tarefas agendadas).
- **Validação de Dados**: Zod (tanto no frontend via formulários quanto no backend para API).
- **Hospedagem de Imagens**: AWS S3, Cloudflare R2 (gratuito e escalável) ou Uploadthing.
- **Meio de Pagamento**: OpenPix.

## Infraestrutura (Deploy)
- Inicialmente planejado para uma VPS (DigitalOcean, Hetzner, etc) usando Docker Compose.
- Rotas de Lojas baseadas no padrão sub-rota (ex: `app.com/doces-da-maria`), dispensando complexidade de Custom Domains via Middleware neste momento.

## Modelagem de Dados Inicial

**User**
- `id`: uuid
- `email`: varchar
- `name`: varchar
- `password_hash`: varchar (gerenciado pelo BetterAuth)
- `phone`: varchar
- `role`: enum (LOJISTA, CLIENTE)
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
