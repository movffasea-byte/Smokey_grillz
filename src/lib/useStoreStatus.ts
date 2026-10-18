import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { fetchStoreSettings } from '@/lib/checkout';

// Re-checks whether the store is accepting orders every time the screen is focused.
export function useStoreOpen(): boolean {
  const [open, setOpen] = useState(true);
  useFocusEffect(
    useCallback(() => {
      fetchStoreSettings()
        .then((s) => setOpen(s.accepting_orders))
        .catch(() => {});
    }, []),
  );
  return open;
}
