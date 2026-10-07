# Checkpoints e Progresso do Projeto

Este arquivo registrará o progresso do desenvolvimento do SaaS, etapa por etapa.

## Fase 1: Planejamento e Scaffolding (Concluída)
- [x] Levantar requisitos funcionais e não funcionais.
- [x] Definir Tech Stack e Arquitetura.
- [x] Modelar Banco de Dados preliminar.
- [x] Inicializar repositório Next.js com App Router.
- [x] Estruturar arquitetura modular de diretórios (Monolito Modular).
- [x] Configurar ambiente de Testes Unitários/Integração (Vitest).
- [x] Configurar Zod para validação de esquemas (inserido nos módulos).
- [x] Configurar Drizzle ORM e conexão com PostgreSQL (Docker).
- [x] Configurar BetterAuth para autenticação inicial.

## Fase 2: Módulos Core - Lojista (Concluída)
- [x] Criar fluxo de registro de Lojista e Onboarding.
- [x] Criar CRUD de Lojas (Stores) com Slug único.
- [x] Infraestrutura de Workers (BullMQ + Redis) para E-mails e Assincronia.
- [x] Feature: Personalização da Vitrine (Cores, Banner, Perfil, Layout).
- [x] Feature: Configuração dinâmica de Taxas e Split de Pagamentos (OpenPix).
- [x] Criar CRUD de Categorias.
- [x] Criar CRUD de Produtos (diferenciando pronta-entrega e encomenda).
- [x] Feature: Combos e Adicionais (Modificadores de Produtos).
- [x] Criar funcionalidade de Upload de Imagens (S3/Cloudflare R2).

## Fase 3: Vitrine e Carrinho (Concluída)
- [x] Desenvolver a interface da Vitrine (Cliente).
- [x] Implementar separação de visualização (Pronta-Entrega vs Encomenda).
- [x] Desenvolver carrinho de compras gerenciado no lado do cliente (Zustand/Context).
- [x] Implementar regras de conflito no carrinho (Não misturar pronta-entrega e encomenda).
- [x] Checkout form (Guest e Usuário autenticado).

## Fase 4: Pagamentos e Gerenciamento de Pedidos (Em Andamento)
- [x] Integração com OpenPix (geração de cobrança via Idempotency Key).
- [x] Webhook receiver para atualização de status de pagamento.
- [x] Sistema Real-Time com SSE (Server-Sent Events) e Redis.
- [ ] Dashboard do Lojista (Gestão de Pedidos - Visão de Dia e Visão de Fila).
- [x] Rotina (BullMQ) para expiração de pagamentos não concluídos.

## Fase 5: Ajustes Finais e Otimizações
- [ ] Dashboard Financeiro do lojista.
- [ ] Testes de integração (Vitest) nos fluxos críticos de pagamento.
- [ ] Configurar CI/CD com GitHub Actions (deploy automático na branch main).
- [ ] Otimizações de performance na vitrine.
- [ ] Preparação para Deploy em Produção (Dockerfile).
