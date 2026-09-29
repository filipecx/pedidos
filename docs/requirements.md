# Requisitos do SaaS para Confeiteiros/MEIs

## Requisitos Funcionais (RF)

### Lojista (Administrador da Loja)
- Deve poder criar categorias para seus produtos.
- Deve poder criar produtos e inseri-los em categorias.
- Deve poder inserir detalhes dos produtos:
  - Nome, descrição, foto.
  - Preço para encomenda.
  - Preço para pronta-entrega.
  - Estoque (para pronta-entrega).
  - Mínimo de dias de antecedência para realizar uma encomenda.
- Deve poder selecionar se o produto vai ser vendido por encomenda, pronta-entrega ou ambos.
- Deve poder escolher o prazo mínimo para o pedido sob encomenda.
- Deve poder configurar **Horário de Funcionamento**. (Fora do horário, produtos de pronta-entrega ficam bloqueados para compra/loja fechada).
- Deve poder escolher suas janelas de horário de entrega (ex: de duas em duas horas, horários disponíveis).
- Deve poder criar combos (produtos que contêm outros produtos) e defini-los como pronta-entrega ou encomenda.
- Deve poder criar preços promocionais (ativar preço promocional, valor promocional).
- Deve poder adicionar avisos na vitrine.
- Deve poder escolher a ordem de exibição dos produtos na vitrine.
- Deve poder personalizar sua vitrine (cores, cards, textos, botões) - *Future Feature*.
- Deve poder criar uma conta na plataforma.
- Deve poder cadastrar/modificar os dados da loja (nome, slug, endereço, chave PIX, raio de entrega, banner, foto de perfil).
- Deve poder visualizar um dashboard contendo:
  - Informações financeiras.
  - Total de pedidos e faturamento.
- Deve poder escolher modalidades de entrega (Retirada no balcão ou Entrega). **Nota**: A entrega é por conta do cliente (ele chama aplicativo como Uber Flash, sem cálculo de taxa de entrega pelo sistema).
- Deve visualizar dois tipos de painel de pedidos (com atualizações via SSE):
  - Visão por dias (para encomendas).
  - Visão por pedido individual (para pronta-entrega, focado em status de preparação).

### Cliente (Comprador)
- Deve poder visualizar a vitrine da loja (acesso via rota simples: `app.com/nomedaloja`).
- Deve poder alternar entre as abas/versões da vitrine: pronta-entrega e encomenda (ou pré-venda).
- Deve poder adicionar produtos ao carrinho (não pode misturar pronta-entrega com encomenda no mesmo carrinho).
  - O carrinho de clientes não logados (Guests) será salvo via **LocalStorage**.
- Deve poder pagar os pedidos exclusivamente via PIX (integração OpenPix).
- Deve poder escolher receber em domicílio (por conta própria) ou buscar no balcão.
- Deve poder comprar como *guest* ou criar conta.
- Deve poder visualizar no checkout o endereço do lojista e horário (se encomenda).
- Deve receber atualizações sobre o status do pagamento e do pedido.
- Deve visualizar um número de pedido amigável (Ex: `Pedido #001`).

## Requisitos Não Funcionais (RNF)

- **Mobile First**: Design focado prioritariamente em dispositivos móveis.
- **Performance**: A vitrine da loja deve ser *blazing fast* (otimizada para conversão).
- **Concorrência e Estoque**: Ao gerar o pagamento (PIX) no checkout, o estoque do produto pronta-entrega é **reservado por 10 minutos**. Se expirar, o estoque volta (Evita problemas de concorrência).
- **Pagamentos**: Janela de pagamento PIX de 10 minutos para expiração. Integração e webhook de pagamento para atualização em tempo real (Event Emitter + Server-Sent Events/SSE).
- **Idempotência**: Requisições de criação de pagamento/pedido devem utilizar chaves de idempotência para evitar duplicidade.
- **Armazenamento de Imagens**: Uso de uma CDN gratuita/barata ou serviço em nuvem para fotos dos produtos.
- **Arquitetura Orientada a Eventos**: Uso de SSE para atualizar pedidos e filas (BullMQ) para processamento em background (ex: expiração de pagamentos, reserva de estoque, webhooks).

## Fluxos Principais

### Onboarding de Lojista
1. Acessa Landing Page -> Criar conta.
2. Preenche Nome, E-mail, Senha -> Salva usuário.
3. Redirecionado para criação de Loja:
   - Nome, Slug (validação de unicidade ou uso de UUID no fallback), Endereço, Chave PIX, Raio de entrega, Banner.
4. Escolha do plano (Taxa por venda vs Mensalidade).
5. Fluxo de primeiro cadastro: "Deseja cadastrar seus primeiros produtos?" -> Sim/Não.

### Fluxo de Compra
1. Cliente acessa Vitrine via link -> Escolhe modalidade (Pronta-entrega ou Encomenda).
2. Adiciona itens ao carrinho.
3. Checkout -> Login/Guest -> Preenche dados (nome, celular).
4. Confirmação -> Criação de Pedido (`pending_payment`) -> Reserva de estoque -> Gera PIX OpenPix.
5. Pagamento confirmado (via webhook) -> SSE notifica o Lojista -> Status do pedido atualiza.
6. Falha/Expiração -> Pedido atualiza status -> Estoque é devolvido -> Cliente é avisado.
