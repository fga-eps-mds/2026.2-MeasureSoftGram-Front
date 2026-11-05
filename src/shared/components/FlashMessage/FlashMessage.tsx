'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { takeFlashMessage } from '../../utils/flashMessage';

/** Mostra o toast guardado antes da última recarga (boas-vindas, "Volte logo", sessão expirada). */
export default function FlashMessage() {
  const pathname = usePathname();

  useEffect(() => {
    const message = takeFlashMessage();
    if (message) toast[message.type](message.text);
  }, [pathname]);

  return null;
}
