'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'react-toastify';
import { takeFlashMessage } from '../../utils/flashMessage';
import { translateInSavedLanguage } from '../../i18n/savedLanguage';

export default function FlashMessage() {
  const pathname = usePathname();

  useEffect(() => {
    const message = takeFlashMessage();
    if (!message) return;
    void translateInSavedLanguage(message.text).then((text) => toast[message.type](text));
  }, [pathname]);

  return null;
}
