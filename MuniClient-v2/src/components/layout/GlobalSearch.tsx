import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, FolderOpen, Users } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { type Project, type User } from '@/types'

type ResultItem =
  | { kind: 'project'; id: string; label: string; sub: string }
  | { kind: 'user';    id: string; label: string; sub: string }

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-ocean-500/20 text-ocean-600 dark:text-ocean-400 rounded-sm not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function GlobalSearch() {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60)
      setQuery('')
      setCursor(0)
    }
  }, [open])

  const results: ResultItem[] = (() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()

    const projects = (qc.getQueryData<Project[]>(['projects']) ?? [])
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.departamento_ID?.name ?? '').toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map<ResultItem>(p => ({
        kind: 'project',
        id: p.proyect_ID,
        label: p.name,
        sub: p.departamento_ID?.name ?? 'Sin departamento',
      }))

    const users = (qc.getQueryData<User[]>(['users']) ?? [])
      .filter(u =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
      )
      .slice(0, 3)
      .map<ResultItem>(u => ({
        kind: 'user',
        id: u.user_ID,
        label: `${u.first_name} ${u.last_name}`,
        sub: u.puesto || u.email,
      }))

    return [...projects, ...users]
  })()

  useEffect(() => { setCursor(0) }, [results.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')    { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) {
      const r = results[cursor]
      navigate(r.kind === 'project' ? `/projects/${r.id}` : `/users/${r.id}`)
      setOpen(false)
    }
  }

  const go = (r: ResultItem) => {
    navigate(r.kind === 'project' ? `/projects/${r.id}` : `/users/${r.id}`)
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search size={15} className="text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar proyectos, usuarios..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <kbd className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border hidden sm:block">
                  ESC
                </kbd>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Resultados */}
            {query.trim() ? (
              results.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Sin resultados para "{query}"
                </div>
              ) : (
                <div className="py-2 max-h-72 overflow-y-auto">
                  {results.map((r, i) => (
                    <button
                      key={`${r.kind}-${r.id}`}
                      onClick={() => go(r)}
                      onMouseEnter={() => setCursor(i)}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                        cursor === i ? 'bg-accent' : 'hover:bg-accent/50',
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                        r.kind === 'project'
                          ? 'bg-ocean-500/10 text-ocean-500'
                          : 'bg-amber-500/10 text-amber-500',
                      )}>
                        {r.kind === 'project' ? <FolderOpen size={13} /> : <Users size={13} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          <Highlight text={r.label} query={query} />
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {r.kind === 'project' ? 'Proyecto' : 'Usuario'}
                      </span>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="px-4 py-8 text-center space-y-3">
                <p className="text-xs text-muted-foreground">Escribe para buscar proyectos y usuarios</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5">↑↓</kbd> navegar
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5">↵</kbd> abrir
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <kbd className="bg-muted border border-border rounded px-1.5 py-0.5">⌘K</kbd> cerrar
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
