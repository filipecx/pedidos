export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PREPARING"
  | "READY"
  | "DELIVERED"
  | "CANCELED";

/**
 * Transições válidas de status permitidas pela máquina de estados.
 *
 * Regras de Negócio:
 * - PENDING_PAYMENT: pode ir para PREPARING (pagamento recebido/manual) ou CANCELED (expirado ou cancelado).
 * - PREPARING: pode avançar para READY (item preparado) ou CANCELED (cancelado/estornado).
 * - READY: pode avançar para DELIVERED (entregue ao cliente/retirado no balcão) ou CANCELED (cancelado/estornado).
 * - DELIVERED: estado terminal final. Não pode retroceder nem mudar para outro estado.
 * - CANCELED: estado terminal final. Não pode ser reaberto.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["DELIVERED", "CANCELED"],
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
  icon?: string;
  variant: "primary" | "success" | "warning";
}

/**
 * Obtém a próxima transição natural e progressiva (avanço de fluxo operacional).
 */
export function getNextOrderStatusAction(
  status: OrderStatus,
  deliveryType?: "DELIVERY" | "PICKUP"
): NextStatusAction | null {
  switch (status) {
    case "PENDING_PAYMENT":
      return {
        nextStatus: "PREPARING",
        label: "Iniciar Preparo",
        shortLabel: "Preparar",
        icon: "👨‍🍳",
        variant: "primary",
      };
    case "PREPARING":
      return {
        nextStatus: "READY",
        label: "Marcar como Pronto",
        shortLabel: "Pronto",
        icon: "✨",
        variant: "warning",
      };
    case "READY":
      return {
        nextStatus: "DELIVERED",
        label: deliveryType === "DELIVERY" ? "Confirmar Entrega" : "Confirmar Retirada",
        shortLabel: deliveryType === "DELIVERY" ? "Entregar" : "Retirar",
        icon: "✅",
        variant: "success",
      };
    case "DELIVERED":
    case "CANCELED":
    default:
      return null;
  }
}
