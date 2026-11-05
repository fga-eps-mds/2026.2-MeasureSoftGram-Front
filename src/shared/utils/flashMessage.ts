export type FlashType = 'success' | 'info' | 'warning' | 'error';

export interface FlashMessage {
  type: FlashType;
  text: string;
}

export const FLASH_MESSAGE_KEY = 'msgram_flash_message';

/**
 * Mensagem para aparecer na próxima página. O login e o logout recarregam a página inteira, e um toast disparado
 * antes da recarga se perderia. Só a última mensagem fica guardada.
 */
export const setFlashMessage = (message: FlashMessage) => {
  try {
    sessionStorage.setItem(FLASH_MESSAGE_KEY, JSON.stringify(message));
  } catch {
    // sessionStorage indisponível: o toast simplesmente não aparece
  }
};

/** Lê e apaga a mensagem guardada (uso único). */
export const takeFlashMessage = (): FlashMessage | null => {
  try {
    const raw = sessionStorage.getItem(FLASH_MESSAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FLASH_MESSAGE_KEY);

    const message = JSON.parse(raw) as FlashMessage;
    return typeof message?.text === 'string' && ['success', 'info', 'warning', 'error'].includes(message.type)
      ? message
      : null;
  } catch {
    return null;
  }
};
