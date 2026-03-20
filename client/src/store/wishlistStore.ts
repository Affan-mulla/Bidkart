import { create } from "zustand"

interface WishlistStore {
  wishlistedIds: Set<string>
  setWishlistedIds: (ids: string[]) => void
  add: (productId: string) => void
  remove: (productId: string) => void
  isWishlisted: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  wishlistedIds: new Set(),
  setWishlistedIds: (ids) => set({ wishlistedIds: new Set(ids) }),
  add: (productId) =>
    set((state) => ({
      wishlistedIds: new Set([...state.wishlistedIds, productId]),
    })),
  remove: (productId) =>
    set((state) => {
      const next = new Set(state.wishlistedIds)
      next.delete(productId)
      return { wishlistedIds: next }
    }),
  isWishlisted: (productId) => get().wishlistedIds.has(productId),
}))
