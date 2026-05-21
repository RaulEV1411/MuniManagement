import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNotificaciones, marcarLeida, marcarTodasLeidas } from '@/lib/api'
import type { Notificacion } from '@/types'

export function useNotificaciones() {
  return useQuery<Notificacion[]>({
    queryKey: ['notificaciones'],
    queryFn: () => getNotificaciones(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarcarLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marcarLeida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => marcarTodasLeidas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  })
}
