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

## Fase 4: Pagamentos e Gerenciamento de Pedidos (Concluída)
- [x] Integração com OpenPix (geração de cobrança via Idempotency Key).
- [x] Webhook receiver para atualização de status de pagamento (e transição de pedido para PREPARING).
- [x] Sistema Real-Time com SSE (Server-Sent Events) via Redis + Notificação Sonora (AudioContext).
- [x] Dashboard do Lojista (Gestão de Pedidos - Visão de Dia e Visão de Fila) com interface Mobile-First (Cards Quadrados e Scroll Horizontal).
- [x] Layout PWA Lojista (Navegação via Bottom Bar no Mobile).
- [x] Configurações "Minha Loja" (Atualização de dados, Chave Pix, Link da loja e Logout).
- [x] Rotina (BullMQ) para expiração de pagamentos não concluídos.

## Fase 5: Ajustes Finais e Otimizações
- [x] Fluxo de Esqueci/Redefinir Senha (BetterAuth + BullMQ worker).
- [x] Dashboard Financeiro do lojista (Gráficos em CSS nativo, Visão Geral).
- [x] Testes de integração (Vitest) nos fluxos críticos de pagamento.
- [x] Configurar CI/CD com GitHub Actions (deploy automático na branch main).
- [x] Otimizações de performance na vitrine (Isolamento de Server Components e redução de bundle).
- [x] Preparação para Deploy em Produção (Dockerfile e arquitetura VPS/AWS: Build unificado, workers consolidados e runner de migrações).
- [x] Checkout completo com suporte a Endereço de Entrega (Delivery) e validações Zod.
- [x] Fluxo de Pagamento PIX com QR Code, Copia-e-Cola e confirmação em tempo real via SSE para o cliente.
- [x] Painel de Pedidos com link direto para WhatsApp e modelos de mensagens rápidas de status.
- [x] Automação de migrações (`dist/db/migrate.js`) compatível com VPS e Docker Compose.
- [x] Controle Atômico de Estoque: Check constraint no Postgres, decremento atômico anti race-condition e devolução idempotente em cancelamentos e expirações.
- [x] Fila e Worker de Processamento de Imagens (Sharp + R2/S3) via BullMQ com preview visual em tempo real no painel do lojista.
- [x] Documentação de Infraestrutura Multi-Aplicações com custo zero via Oracle Cloud (OCI Always Free 24GB ARM).

## Fase 6: Refinamentos Operacionais e Gestão de Estoque
- [x] Remover funcionalidade de reorganizar itens da vitrine em `/lojista/produtos` e `/lojista/categorias`.
- [x] Ajustar rotulagem em `/lojista/pedidos`: deixar coluna/linha de pedidos finalizados apenas como "Pronto".
- [x] Gestão de Estoque ao Abrir Loja (Mobile-First):
  - [x] Testes TDD cobrindo diagnósticos de estoque, reposição em massa, erros de borda e ajustes manuais (`stock-services.test.ts`).
  - [x] Serviços e Server Actions de diagnóstico, restauração em massa e ajuste rápido (`stock-services.ts`).
  - [x] Fluxo de abertura da loja com detecção automática de itens zerados e Drawer/Modal mobile-first (`StockOpeningModal`).
  - [x] Ajuste rápido de estoque com stepper inline (`+` e `-`) no celular e desktop na lista de produtos.


