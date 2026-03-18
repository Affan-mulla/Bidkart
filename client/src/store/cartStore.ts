import { create } from "zustand";

interface CartStore {
  totalItems: number;
  setTotalItems: (count: number) => void;
  reset: () => void;
}

export const useCartStore = create<CartStore>((set) => ({
  totalItems: 0,
  setTotalItems: (count) => set({ totalItems: count }),
  reset: () => set({ totalItems: 0 }),
}));
