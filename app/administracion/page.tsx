'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type AccessRow = { userId: string; email?: string | null; role: string; active: boolean; createdAt?: string }
type AuditRow = { id: number; actor_id: string | null; entity_table: string; entity_id: string; action: string; reason: string | null; before_data: unknown; after_data: unknown; created_at: string }
const roles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'sales', label: 'Ventas / Caja' },
  { value: 'viewer', label: 'Sólo lectura' },
]
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function AdministrationPage() {
  const db = useMemo(() => createClient(), [])
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [users, setUsers] = useState<AccessRow[]>([])
  const [audit, setAudit] = useState<AuditRow[]>([])
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('sales')
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setError('')
    const [{ data: userData, error: userError }, { data: auditData, error: auditError }] = await Promise.all([
      db.rpc('jam_admin_users_list'), db.rpc('jam_admin_audit_list', { p_limit: 100, p_before: null }),
    ])
    if (userError) throw userError
    if (auditError) throw auditError
    setUsers((userData ?? []) as AccessRow[])
    setAudit((auditData ?? []) as AuditRow[])
  }, [db])

  useEffect(() => {
    let live = true
    db.auth.getSession().then(async ({ data }) => {
      if (!live) return
      if (!data.session) { router.replace('/'); return }
      try { await refresh(); if (live) setReady(true) }
      catch (e) { if (live) { setError(e instanceof Error ? e.message : 'Acceso administrativo no disponible'); setReady(true) } }
    })
    return () => { live = false }
  }, [db, router, refresh])

  async function saveAccess() {
    setError(''); setMessage('')
    if (!uuidPattern.test(userId.trim())) { setError('Introduce el UUID válido de un usuario que ya exista en Supabase Auth.'); return }
    setBusy(true)
    try {
      const { error: rpcError } = await db.rpc('jam_admin_user_access_set', { p_user_id: userId.trim(), p_role: role, p_active: active })
      if (rpcError) throw rpcError
      setMessage('Acceso guardado correctamente.')
      setUserId('')
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el acceso') }
    finally { setBusy(false) }
  }

  if (!ready) return <main className="min-h-screen bg-slate-50 p-8">Verificando permisos administrativos…</main>
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold tracking-widest text-orange-600">PINTURAS JAM</p><h1 className="text-3xl font-black">Administración y auditoría</h1><p className="mt-1 text-sm text-slate-500">Control de acceso por usuario y bitácora de operaciones del negocio.</p></div><button onClick={() => router.push('/operaciones')} className="rounded-lg border bg-white px-4 py-2 font-semibold">Volver a operaciones</button></header>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Asignar o actualizar acceso</h2><p className="mt-2 text-sm text-slate-600">El usuario debe estar creado previamente en Supabase → Authentication → Users. Aquí no se crean contraseñas.</p>
        <label className="mt-4 block text-sm font-semibold">UUID del usuario<input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="mt-1 block w-full rounded-lg border p-3 font-mono text-xs" /></label>
        <label className="mt-3 block text-sm font-semibold">Rol<select value={role} onChange={e=>setRole(e.target.value)} className="mt-1 block w-full rounded-lg border p-3">{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} /> Acceso activo</label>
        <button disabled={busy} onClick={()=>void saveAccess()} className="mt-4 w-full rounded-lg bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">Guardar permisos</button>
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Seguridad: no se permite asignar ni modificar el rol propietario desde esta pantalla. Un administrador no puede crear otros administradores.</div>
      </div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="text-xl font-bold">Usuarios autorizados</h2><button onClick={()=>void refresh().catch(e=>setError(e.message))} className="rounded-lg border px-3 py-2 text-sm font-semibold">Actualizar</button></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Usuario / correo</th><th className="p-2">Rol</th><th className="p-2">Estado</th></tr></thead><tbody>{users.map(u=><tr key={u.userId} className="border-b"><td className="p-2"><div className="font-medium">{u.email || 'Correo no disponible'}</div><div className="font-mono text-[10px] text-slate-500">{u.userId}</div></td><td className="p-2">{roles.find(r=>r.value===u.role)?.label ?? (u.role==='owner'?'Propietario':u.role)}</td><td className="p-2"><span className={u.active?'rounded-full bg-green-100 px-2 py-1 text-green-800':'rounded-full bg-slate-100 px-2 py-1 text-slate-600'}>{u.active?'Activo':'Inactivo'}</span></td></tr>)}</tbody></table>{!users.length && <p className="p-6 text-center text-sm text-slate-500">No se encontraron accesos o faltan permisos administrativos.</p>}</div>
      </div>
    </section>
    <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">Bitácora de auditoría</h2><p className="mt-1 text-sm text-slate-500">Últimos 100 cambios registrados en inventario, ventas, compras, caja y accesos.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{audit.length} eventos</span></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Fecha</th><th className="p-2">Acción</th><th className="p-2">Módulo / registro</th><th className="p-2">Usuario</th><th className="p-2">Detalle</th></tr></thead><tbody>{audit.map(a=><tr key={a.id} className="border-b align-top"><td className="whitespace-nowrap p-2">{new Date(a.created_at).toLocaleString()}</td><td className="p-2 font-semibold">{a.action}</td><td className="p-2">{a.entity_table}<div className="font-mono text-[10px] text-slate-500">{a.entity_id}</div></td><td className="p-2 font-mono text-[10px]">{a.actor_id ?? 'Sistema'}</td><td className="max-w-sm p-2"><details><summary className="cursor-pointer text-orange-700">Ver cambios</summary><pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 text-[10px]">{JSON.stringify({ reason:a.reason, before:a.before_data, after:a.after_data },null,2)}</pre></details></td></tr>)}</tbody></table>{!audit.length && <p className="p-6 text-center text-sm text-slate-500">La bitácora aparecerá aquí después de aplicar la migración y registrar operaciones.</p>}</div>
    </section>
    <p className="mt-5 text-xs leading-5 text-slate-500">La auditoría registra cambios posteriores a la instalación de esta migración; no reconstruye operaciones antiguas. El historial contiene datos de los registros comerciales, por lo que sólo propietarios y administradores pueden consultarlo.</p>
  </div></main>
}
