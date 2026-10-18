import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type CartChoice = { optionName: string; choiceId: string; name: string; priceDeltaKobo: number };

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  basePriceKobo: number;
  qty: number;
  choices: CartChoice[];
};

type CartState = {
  lines: CartLine[];
  count: number;
  subtotalKobo: number;
  lineUnitPrice: (line: CartLine) => number;
  addLine: (line: Omit<CartLine, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const STORAGE_KEY = 'cart.v1';
const CartContext = createContext<CartState | null>(null);

const lineUnitPrice = (l: CartLine) => l.basePriceKobo + l.choices.reduce((s, c) => s + c.priceDeltaKobo, 0);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setLines(JSON.parse(raw)))
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines)).catch(() => {});
  }, [lines, hydrated]);

  const addLine = useCallback((line: Omit<CartLine, 'key'>) => {
    const key = `${line.itemId}:${line.choices.map((c) => c.choiceId).sort().join(',')}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l));
      return [...prev, { ...line, key }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l))));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotalKobo: lines.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0),
      lineUnitPrice,
      addLine,
      setQty,
      clear,
    }),
    [lines, addLine, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
