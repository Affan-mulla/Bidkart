import { create } from "zustand"

export type UserRole = "buyer" | "seller" | "admin"

export type AuthUser = {
  _id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

type LegacyCredentialsPayload = {
  user?: AuthUser | null
  token?: string | null
  role?: UserRole | null
}

type AuthState = {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  pendingEmail: string | null
  token: string | null
  role: UserRole | null
  setCredentials: {
    (user: AuthUser, accessToken: string): void
    (payload: LegacyCredentialsPayload): void
  }
  clearAuth: () => void
  setPendingEmail: (email: string) => void
  clearPendingEmail: () => void
  setLoading: (isLoading: boolean) => void
  setAccessToken: (accessToken: string) => void
  logout: () => void
}

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  pendingEmail: null,
  token: null,
  role: null,
} satisfies Pick<
  AuthState,
  "user" | "accessToken" | "isAuthenticated" | "isLoading" | "pendingEmail" | "token" | "role"
>

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,
  setCredentials: (arg1: AuthUser | LegacyCredentialsPayload, arg2?: string) => {
    if (typeof arg2 === "string") {
      const user = arg1 as AuthUser
      set({
        user,
        accessToken: arg2,
        token: arg2,
        role: user.role,
        isAuthenticated: true,
      })
      return
    }

    const payload = arg1 as LegacyCredentialsPayload
    const user = payload.user ?? null
    const token = payload.token ?? null
    const role = payload.role ?? user?.role ?? null

    set({
      user,
      accessToken: token,
      token,
      role,
      isAuthenticated: Boolean(token),
    })
  },
  clearAuth: () => set({ ...initialState, isLoading: false }),
  setPendingEmail: (email) => set({ pendingEmail: email }),
  clearPendingEmail: () => set({ pendingEmail: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      token: accessToken,
      isAuthenticated: Boolean(accessToken) || state.isAuthenticated,
    })),
  logout: () => set({ ...initialState, isLoading: false }),
}))
