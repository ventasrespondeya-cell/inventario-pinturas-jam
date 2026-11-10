'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CashService } from '@/lib/modules/cash'

type Row = Record<string, unknown>
const fmt = (v: unknown) => v == null ? '—' : String(v)

export default function CashPage() {
  const db = useMemo(() => createClient(), [])
  const cash = useMemo(() => new CashService(db), [db])
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [sessions, setSessions] = useState<Row[]>([])
  const [active, setActive] = useState<Row | null>(null)
  const [movements, setMovements] = useState<Row[]>([])
  const [summary, setSummary] = useState<Row | null>(null)
  const [currency, setCurrency] = useState<'VES'|'USD'>('VES')
  const [opening, setOpening] = useState('0')
  const [amount, setAmount] = useState('')
  const [counted, setCounted] = useState('')
  const [description, setDescription] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [type, setType] = useState<'income'|'expense'>('income')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async (selected?: string) => {
    const result = await cash.listSessions()
    if (!result.ok) { setError(result.error.message); return }
    setSessions(result.data as Row[])
    const current = (result.data as Row[]).find(x => x.status === 'open' && (!selected || x.id === selected)) ?? (result.data as Row[]).find(x => x.status === 'open')
    setActive(current ?? null)
    if (current?.id) {
      const [s, m] = await Promise.all([cash.summary(String(current.id)), cash.listMovements(String(current.id))])
      if (s.ok) setSummary(s.data as Row)
      if (m.ok) setMovements(m.data as Row[])
    } else { setSummary(null); setMovements([]) }
  }, [cash])

  useEffect(() => { let live = true; db.auth.getSession().then(({ data }) => { if (!live) return; if (!data.session) router.replace('/'); else { setReady(true); void refresh() } }); return () => { live = false } }, [db, router, refresh])

  async function run(action: () => Promise<{ok: boolean; data?: unknown; error?: {message: string}}>, success: string) {
    setBusy(true); setError(''); setMessage('')
    try { const result = await action(); if (!result.ok) throw new Error(result.error?.message ?? 'No se pudo completar la operación'); setMessage(success); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'Error inesperado') }
    finally { setBusy(false) }
  }
  const sessionId = active?.id ? String(active.id) : ''
  const money = (v: unknown) => `${fmt(v)} ${fmt((summary?.session as Row | undefined)?.currency ?? active?.currency)}`

  if (!ready) return <main className="min-h-screen bg-slate-50 p-8">Verificando acceso…</main>
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold tracking-widest text-orange-600">PINTURAS JAM</p><h1 className="text-3xl font-black">Caja y cierres</h1><p className="mt-1 text-sm text-slate-500">Apertura, ingresos, egresos, sincronización comercial y arqueo por moneda.</p></div><button onClick={() => router.push('/operaciones')} className="rounded-lg border bg-white px-4 py-2 font-semibold">Volver a operaciones</button></header>
    {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
    {!active ? <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Abrir caja</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><label className="text-sm">Moneda<select value={currency} onChange={e=>setCurrency(e.target.value as 'VES'|'USD')} className="mt-1 block w-full rounded-lg border p-3"><option value="VES">Bolívares (VES)</option><option value="USD">Dólares (USD)</option></select></label><label className="text-sm">Fondo inicial<input value={opening} onChange={e=>setOpening(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border p-3" /></label><label className="text-sm">Nota<input value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" /></label></div><button disabled={busy || !/^\d+(\.\d{1,6})?$/.test(opening)} onClick={()=>void run(()=>cash.open(opening,currency,notes),'Caja abierta.')} className="mt-4 rounded-lg bg-orange-600 px-5 py-3 font-bold text-white disabled:opacity-50">Abrir turno de caja</button></section> : <>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{t:'Fondo inicial',v:money((summary?.session as Row | undefined)?.opening_amount)},{t:'Ingresos',v:money(summary?.income)},{t:'Egresos',v:money(summary?.expense)},{t:'Efectivo esperado',v:money(summary?.expected)}].map(x=><div key={x.t} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{x.t}</p><p className="mt-2 text-2xl font-black">{x.v}</p></div>)}</section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Registrar movimiento</h2><div className="mt-3 grid gap-3"><label className="text-sm">Tipo<select value={type} onChange={e=>setType(e.target.value as 'income'|'expense')} className="mt-1 block w-full rounded-lg border p-3"><option value="income">Entrada / ingreso</option><option value="expense">Salida / egreso</option></select></label><label className="text-sm">Importe<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border p-3" /></label><label className="text-sm">Descripción<input value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" /></label><label className="text-sm">Referencia<input value={reference} onChange={e=>setReference(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" /></label><button disabled={busy || !sessionId || !/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount)<=0 || !description.trim()} onClick={()=>void run(()=>cash.addMovement(sessionId,type,amount,description,reference),'Movimiento registrado.')} className="rounded-lg bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">Guardar movimiento</button></div></div>
      <div className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Sincronización y cierre</h2><p className="mt-2 text-sm text-slate-500">Importa a esta caja los cobros de ventas y pagos a proveedores pendientes de la misma moneda.</p><button disabled={busy} onClick={()=>void run(()=>cash.consume(sessionId),'Eventos comerciales sincronizados.')} className="mt-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 font-semibold text-orange-800">Sincronizar eventos comerciales</button><div className="mt-5 border-t pt-4"><label className="text-sm">Efectivo contado al cierre<input value={counted} onChange={e=>setCounted(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border p-3" /></label><label className="mt-3 block text-sm">Observaciones<textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 block w-full rounded-lg border p-3" rows={2} /></label><button disabled={busy || !/^\d+(\.\d{1,6})?$/.test(counted)} onClick={()=>void run(()=>cash.close(sessionId,counted,notes),'Caja cerrada. Revisa el arqueo y la diferencia registrada.')} className="mt-3 rounded-lg bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50">Cerrar caja y registrar arqueo</button></div></div></section>
      <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Movimientos del turno</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Fecha</th><th className="p-2">Tipo</th><th className="p-2">Descripción</th><th className="p-2">Referencia</th><th className="p-2 text-right">Importe</th></tr></thead><tbody>{movements.map(m=><tr key={String(m.id)} className="border-b"><td className="p-2">{new Date(String(m.created_at)).toLocaleString()}</td><td className="p-2">{fmt(m.movement_type)}</td><td className="p-2">{fmt(m.description)}</td><td className="p-2">{fmt(m.reference)}</td><td className="p-2 text-right">{fmt(m.amount)} {fmt(m.currency)}</td></tr>)}</tbody></table>{!movements.length && <p className="p-5 text-center text-sm text-slate-500">Sin movimientos todavía.</p>}</div></section>
    </>}
    <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="font-bold">Historial de turnos</h2><div className="mt-3 space-y-2">{sessions.map(s=><div key={String(s.id)} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm"><span>{fmt(s.currency)} · {new Date(String(s.opened_at)).toLocaleString()} · {fmt(s.status)}</span><strong>{s.status==='closed'?`Esperado ${fmt(s.expected_amount)} / contado ${fmt(s.counted_amount)} / diferencia ${fmt(s.difference)}`:`Fondo ${fmt(s.opening_amount)}`}</strong></div>)}</div></section>
  </div></main>
}
