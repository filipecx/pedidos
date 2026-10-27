/**
 * Utilitário de Domínio Puro para Ordenação com espaçamento (Fractional / Midpoint Indexing).
 * 
 * Regras:
 * 1. O passo inicial padrão de incremento é 10 (ex: 10, 20, 30, 40...).
 * 2. Quando um novo item é inserido no final (ou quando não há itens), o próximo índice é (último + 10) ou 10.
 * 3. Quando um item é inserido entre dois itens existentes (com ordens A e B):
 *    - Ele recebe a média entre eles: Math.floor((A + B) / 2)
 *    - Exemplo: Entre 10 e 20 -> 15.
 *    - Exemplo: Entre 10 e 15 -> 12.
 *    - Se não houver espaço inteiro (ex: entre 10 e 11), a função recalcula a redistribuição
 *      de 10 em 10 para todos os itens da lista, garantindo espaço infinito e resiliência.
 */

export const DEFAULT_ORDER_STEP = 10;

/**
 * Retorna o próximo displayOrder para um novo item no final de uma lista ordenada.
 */
export function getNextDisplayOrder(lastDisplayOrder?: number | null): number {
  if (lastDisplayOrder === undefined || lastDisplayOrder === null) {
    return DEFAULT_ORDER_STEP;
  }
  return lastDisplayOrder + DEFAULT_ORDER_STEP;
}

/**
 * Calcula o displayOrder para um item posicionado entre dois vizinhos (prev e next).
 * Retorna o valor intermediário ou indica se é necessário reespaçar a lista.
 */
export function calculateMidpointOrder(
  prevOrder: number | null | undefined,
  nextOrder: number | null | undefined
): { displayOrder: number; needsRebalance: boolean } {
  // Se não tem anterior nem próximo
  if ((prevOrder === null || prevOrder === undefined) && (nextOrder === null || nextOrder === undefined)) {
    return { displayOrder: DEFAULT_ORDER_STEP, needsRebalance: false };
  }

  // Se é inserido antes do primeiro item (ex: antes de 10)
  if (prevOrder === null || prevOrder === undefined) {
    const next = nextOrder!;
    if (next > 1) {
      return { displayOrder: Math.floor(next / 2), needsRebalance: false };
    }
    // Não tem espaço antes de 1 -> precisa de rebalance
    return { displayOrder: 0, needsRebalance: true };
  }

  // Se é inserido depois do último item
  if (nextOrder === null || nextOrder === undefined) {
    return { displayOrder: prevOrder + DEFAULT_ORDER_STEP, needsRebalance: false };
  }

  // Inserção entre dois itens: A e B
  const diff = nextOrder - prevOrder;
  if (diff > 1) {
    const midpoint = prevOrder + Math.floor(diff / 2);
    return { displayOrder: midpoint, needsRebalance: false };
  }

  // Não há número inteiro disponível entre prevOrder e nextOrder (ex: 10 e 11)
  return { displayOrder: prevOrder, needsRebalance: true };
}

/**
 * Redistribui uma lista de IDs de 10 em 10.
 */
export function rebalanceDisplayOrders<T extends { id: string }>(
  items: T[]
): { id: string; displayOrder: number }[] {
  return items.map((item, index) => ({
    id: item.id,
    displayOrder: (index + 1) * DEFAULT_ORDER_STEP,
  }));
}
