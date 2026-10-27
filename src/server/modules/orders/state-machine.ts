export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PREPARING"
  | "READY"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELED";

/**
 * Transições válidas de status permitidas pela máquina de estados.
 *
 * Regras de Negócio:
 * - PENDING_PAYMENT: pode ir para PREPARING ou CANCELED.
 * - PREPARING: pode avançar para READY ou CANCELED.
 * - READY:
 *    - Se for Balcão (PICKUP): avança direto para DELIVERED (ou CANCELED).
 *    - Se for Entrega (DELIVERY): avança para DISPATCHED (ou DELIVERED diretamente, ou CANCELED).
 * - DISPATCHED: pode avançar para DELIVERED (entregue ao cliente) ou CANCELED.
 * - DELIVERED: estado terminal final.
 * - CANCELED: estado terminal final.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["DISPATCHED", "DELIVERED", "CANCELED"],
  DISPATCHED: ["DELIVERED", "CANCELED"],
  DELIVERED: [], // Terminal
  CANCELED: [],  // Terminal
} as const;

/**
 * Retorna se a transição entre dois status de pedido é válida.
 */
export function isValidOrderStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): boolean {
  if (currentStatus === targetStatus) return false;
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

export interface NextStatusAction {
  nextStatus: OrderStatus;
  label: string;
  shortLabel: string;
  isCheckOnly?: boolean;
}

/**
 * Obtém a próxima transição natural e progressiva (avanço de fluxo operacional).
 */
export function getNextOrderStatusAction(
  status: OrderStatus,
  deliveryType?: "DELIVERY" | "PICKUP",
  sectionId?: string
): NextStatusAction | null {
  switch (status) {
    case "PENDING_PAYMENT":
      return {
        nextStatus: "PREPARING",
        label: "Iniciar Preparo",
        shortLabel: "✓",
        isCheckOnly: true,
      };
    case "PREPARING":
      return {
        nextStatus: "READY",
        label: "Marcar como Pronto",
        shortLabel: "✓",
        isCheckOnly: true,
      };
    case "READY":
      // Se for entrega a domicílio, o próximo passo ao ficar pronto é despachar com motoboy
      if (deliveryType === "DELIVERY") {
        return {
          nextStatus: "DISPATCHED",
          label: "Despachar com Motoboy",
          shortLabel: "Despachar",
          isCheckOnly: false,
        };
      }
      // Se for balcão (PICKUP), o cliente retira e o pedido é concluído
      return {
        nextStatus: "DELIVERED",
        label: "Entregar no Balcão",
        shortLabel: "✓",
        isCheckOnly: true,
      };
    case "DISPATCHED":
      return {
        nextStatus: "DELIVERED",
        label: "Concluir Entrega",
        shortLabel: "Concluir",
        isCheckOnly: false,
      };
    case "DELIVERED":
    case "CANCELED":
    default:
      return null;
  }
}
