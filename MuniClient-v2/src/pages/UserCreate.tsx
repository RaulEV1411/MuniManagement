import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, UserPlus, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createUser, getRoles, getDepartments } from '@/lib/api'
import { type Role, type Department } from '@/types'
import { cn } from '@/lib/utils'

export default function UserCreatePage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    first_name:      '',
    last_name:       '',
    cedula:          '',
    email:           '',
    phone_number:    '',
    puesto:          '',
    role:            '',
    departamento_ID: '',
    password:        '',
  })

  const { data: roles = [] }       = useQuery<Role[]>({ queryKey: ['roles'], queryFn: getRoles })
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim()) { toast.error('El nombre es requerido'); return }
    if (!form.last_name.trim())  { toast.error('El apellido es requerido'); return }
    if (!form.email.trim())      { toast.error('El email es requerido'); return }
    if (!form.password.trim())   { toast.error('La contraseña es requerida'); return }
    if (form.password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }

    setLoading(true)
    try {
      const newUser = await createUser({
        first_name:      form.first_name,
        last_name:       form.last_name,
        cedula:          form.cedula ? parseInt(form.cedula) : undefined,
        email:           form.email,
        phone_number:    form.phone_number ? parseInt(form.phone_number) : undefined,
        puesto:          form.puesto || undefined,
        role:            form.role || undefined,
        departamento_ID: form.departamento_ID || undefined,
        password:        form.password,
      })
      await qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuario creado exitosamente')
      const uid = newUser?.user_ID ?? newUser?.id
      navigate(uid ? `/users/${uid}` : '/users')
    } catch {
      toast.error('Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm bg-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 flex items-center gap-3 flex-shrink-0" style={{ height: 72 }}>
        <button
          onClick={() => navigate('/users')}
          className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active:scale-[0.98]"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-ocean-500 flex items-center justify-center flex-shrink-0">
          <UserPlus size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground">Nuevo usuario</h1>
          <p className="text-xs text-muted-foreground">Completar la información del usuario</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleSubmit}
          className="max-w-xl space-y-4"
        >
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Información personal</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
                <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Juan" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Apellido *</label>
                <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Pérez" className={inputCls} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Cédula</label>
              <input type="number" value={form.cedula} onChange={e => set('cedula', e.target.value)} placeholder="1-1234-5678" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@muni.cr" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Teléfono</label>
                <input type="number" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="88887777" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Puesto</label>
                <input value={form.puesto} onChange={e => set('puesto', e.target.value)} placeholder="Analista" className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Rol y departamento</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Rol</label>
                <select value={form.role} onChange={e => set('role', e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                  <option value="">Sin rol</option>
                  {roles.map(r => <option key={r.role_ID} value={r.role_ID}>{r.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Departamento</label>
                <select value={form.departamento_ID} onChange={e => set('departamento_ID', e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
                  <option value="">Sin departamento</option>
                  {departments.map(d => <option key={d.departamentos_ID} value={d.departamentos_ID}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground">Contraseña *</h2>
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={cn(inputCls, 'pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pb-4">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-accent rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-ocean-500 hover:bg-ocean-600 text-white rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  )
}
