import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from './AuthContext'
import { toast } from 'sonner'

interface FavoritesContextType {
  favoriteIds: Set<string>
  loading: boolean
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set())
      return
    }
    setLoading(true)
    try {
      const { data } = await api.get('/favorites')
      const ids = (data || []).map((i: any) => String(i._id || i.id))
      setFavoriteIds(new Set(ids))
    } catch {
      // fallback from user object if present
      const fromUser = ((user as any)?.favorites || []).map((id: any) => String(id))
      setFavoriteIds(new Set(fromUser))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isFavorite = useCallback((id: string) => favoriteIds.has(String(id)), [favoriteIds])

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        toast.error('Kyçu për të ruajtur të preferuarat')
        return
      }
      try {
        const { data } = await api.post(`/favorites/${id}/toggle`)
        setFavoriteIds((prev) => {
          const next = new Set(prev)
          if (data.favorited) next.add(String(id))
          else next.delete(String(id))
          return next
        })
        toast.success(data.message || 'U përditësua')
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Nuk u ruajt')
      }
    },
    [isAuthenticated],
  )

  return (
    <FavoritesContext.Provider value={{ favoriteIds, loading, isFavorite, toggleFavorite, refresh }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
