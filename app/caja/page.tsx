'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Line = { id: string; quantity: string; description: string; mobile: string; pos: string; cash: string; usdt: string }
type Closing = { id: string; closing_date: string; closing_number: number; cashier_name: string; cash_currency: 'USD' | 'VES'; opening_fund: number; withdrawals: number; lines: Line[]; total_mobile: number; total_pos: number; total_cash: number; total_usdt: number; notes: string | null; status: 'draft' | 'closed' }

const localDate = () => {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
const emptyLine = (): Line => ({ id: crypto.randomUUID(), quantity: '1', description: '', mobile: '', pos: '', cash: '', usdt: '' })
const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0
const money = (v: number, currency = 'VES') => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + (currency === 'USDT' ? ' USDT' : currency === 'USD' ? ' $' : ' Bs.')
const dateLabel = (v: string) => { const p = v.split('-'); return p[2] + '/' + p[1] + '/' + p[0] }

export default function CashPage() {
  const db = useMemo(() => createClient(), [])
  const router = useRouter()
  const [today, setToday] = useState('')
  const [ready, setReady] = useState(false)
  const [date, setDate] = useState('')
  const [cashier, setCashier] = useState('')
  const [cashCurrency, setCashCurrency] = useState<'USD' | 'VES'>('USD')
  const [openingFund, setOpeningFund] = useState('0')
  const [withdrawals, setWithdrawals] = useState('0')
  const [rows, setRows] = useState<Line[]>([emptyLine()])
  const [notes, setNotes] = useState('')
  const [closing, setClosing] = useState<Closing | null>(null)
  const [history, setHistory] = useState<Closing[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!today) return
    const [{ data: { user }, error: userError }, { data, error: listError }] = await Promise.all([
      db.auth.getUser(),
      db.rpc('jam_daily_closing_list', { p_limit: 40 }),
    ])
    if (userError || !user) { router.replace('/'); return }
    if (listError) { setError(listError.message); setReady(true); return }
    const displayName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Usuario')
    setCashier(displayName)
    const items = (data ?? []) as Closing[]
    setHistory(items)
    const current = items.find(x => x.closing_date === today)
    if (current) {
      setClosing(current); setDate(current.closing_date); setCashier(current.cashier_name); setCashCurrency(current.cash_currency)
      setOpeningFund(String(current.opening_fund ?? 0)); setWithdrawals(String(current.withdrawals ?? 0))
      setRows((current.lines?.length ? current.lines : [emptyLine()]).map(x => ({ ...x, id: x.id || crypto.randomUUID() })))
      setNotes(current.notes ?? '')
    } else {
      setClosing(null); setDate(today); setOpeningFund('0'); setWithdrawals('0')
      setRows([emptyLine()]); setNotes('')
    }
    setReady(true)
  }, [db, router, today])

  useEffect(() => { setToday(localDate()) }, [])
  useEffect(() => { void load() }, [load])

  const totals = useMemo(() => rows.reduce((a, r) => ({
    mobile: a.mobile + num(r.mobile), pos: a.pos + num(r.pos), cash: a.cash + num(r.cash), usdt: a.usdt + num(r.usdt),
  }), { mobile: 0, pos: 0, cash: 0, usdt: 0 }), [rows])
  const editable = !closing || (closing.status === 'draft' && closing.closing_date === today)
  const updateRow = (id: string, field: keyof Omit<Line, 'id'>, value: string) => setRows(old => old.map(r => r.id === id ? { ...r, [field]: value } : r))

  async function save(finalize: boolean) {
    setBusy(true); setError(''); setMessage('')
    try {
      const valid = rows.filter(r => r.description.trim() || r.mobile || r.pos || r.cash || r.usdt)
      if (!valid.length) throw new Error('Agrega al menos un producto al detalle.')
      if (valid.some(r => !r.description.trim())) throw new Error('Completa la descripción de cada fila que tenga importes.')
      if (valid.some(r => num(r.quantity) <= 0 || [r.mobile, r.pos, r.cash, r.usdt].some(v => num(v) < 0))) throw new Error('Revisa las cantidades e importes. No pueden ser negativos ni tener cantidad cero.')
      if (!cashier.trim()) throw new Error('Indica el cajero responsable.')
      if (num(openingFund) < 0 || num(withdrawals) < 0) throw new Error('El fondo y los retiros no pueden ser negativos.')
      const payload = valid.map(({ quantity, description, mobile, pos, cash, usdt }) => ({
        quantity, description: description.trim(), mobile: mobile || '0', pos: pos || '0', cash: cash || '0', usdt: usdt || '0',
      }))
      const { data, error: rpcError } = await db.rpc('jam_daily_closing_save', {
        p_closing_date: date, p_cashier_name: cashier.trim(), p_cash_currency: cashCurrency,
        p_opening_fund: openingFund || '0', p_withdrawals: withdrawals || '0',
        p_lines: payload, p_notes: notes, p_finalize: finalize,
      })
      if (rpcError) throw rpcError
      setClosing(data as Closing)
      setMessage(finalize ? 'Cierre finalizado y guardado correctamente.' : 'Borrador guardado. Puedes seguir editándolo.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el cierre.')
    } finally { setBusy(false) }
  }

  function view(item: Closing) {
    setClosing(item); setDate(item.closing_date); setCashier(item.cashier_name); setCashCurrency(item.cash_currency)
    setOpeningFund(String(item.opening_fund ?? 0)); setWithdrawals(String(item.withdrawals ?? 0))
    setRows((item.lines?.length ? item.lines : [emptyLine()]).map(x => ({ ...x, id: x.id || crypto.randomUUID() })))
    setNotes(item.notes ?? ''); setError(''); setMessage('')
  }

  if (!ready) return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-200"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-orange-500" /><p className="text-sm font-semibold">Preparando tu espacio de caja…</p></div></main>

  const cashLabel = cashCurrency === 'USD' ? '$' : 'Bs.'
  return (
    <main className="min-h-screen bg-[#f3f5f8] px-3 py-5 text-slate-900 sm:px-6 lg:px-8">
      <style jsx global>{'@media print { body { background:white!important } .no-print { display:none!important } .print-sheet { box-shadow:none!important; border:0!important; max-width:none!important } input,textarea,select { border:0!important; background:transparent!important; padding:2px!important } }'}</style>
      <div className="mx-auto max-w-[1500px]">
        <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-500/20">PJ</div>
            <div><p className="text-[10px] font-black tracking-[.25em] text-orange-600">PINTURAS JAM · ADMINISTRACIÓN</p><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Cierre diario de caja</h1><p className="mt-0.5 text-sm text-slate-500">Controla, revisa y deja registrado cada cierre.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition hover:border-slate-300 hover:bg-slate-50">↗ Imprimir</button>
            <button onClick={() => router.push('/operaciones')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700">← Operaciones</button>
          </div>
        </header>

        {error && <div role="alert" className="no-print mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}
        {message && <div role="status" className="no-print mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}

        <section className="no-print mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Estado del cierre</p><div className="mt-2 flex items-center justify-between"><strong className="text-xl">{closing?.status === 'closed' ? 'Finalizado' : closing ? 'En borrador' : 'Sin guardar'}</strong><span className={'rounded-full px-2.5 py-1 text-[10px] font-black uppercase ' + (closing?.status === 'closed' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-orange-400/15 text-orange-300')}>{closing?.status === 'closed' ? 'Cerrado' : 'En proceso'}</span></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Pago móvil</p><p className="mt-2 text-2xl font-black tabular-nums">{money(totals.mobile)}</p><p className="mt-1 text-xs text-slate-500">Total registrado en bolívares</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Punto de venta</p><p className="mt-2 text-2xl font-black tabular-nums">{money(totals.pos)}</p><p className="mt-1 text-xs text-slate-500">Total registrado en bolívares</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Efectivo + USDT</p><p className="mt-2 text-2xl font-black tabular-nums">{money(totals.cash, cashCurrency)} <span className="text-base text-pink-600">· {money(totals.usdt, 'USDT')}</span></p><p className="mt-1 text-xs text-slate-500">Montos separados por moneda</p></div>
        </section>

        <section className="print-sheet overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.06)]">
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-6 text-white sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div><p className="text-[10px] font-black tracking-[.25em] text-orange-400">PINTURAS JAM / CONTROL DIARIO</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">CIERRE DE CAJA</h2><p className="mt-1 text-sm text-slate-300">Registro de ventas y arqueo por método de pago</p></div>
              <div className="min-w-[145px] rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-right backdrop-blur"><p className="text-[9px] font-bold tracking-[.2em] text-slate-300">NÚMERO DE CIERRE</p><p className="mt-1 text-3xl font-black tabular-nums text-orange-400">#{String(closing?.closing_number ?? '---').padStart(3, '0')}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">{closing?.status === 'closed' ? 'Finalizado' : closing ? 'Borrador' : 'Pendiente de guardar'}</p></div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <label className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-300">Fecha del cierre<input type="date" value={date} disabled={!editable} onChange={e => setDate(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-400 disabled:opacity-60 [color-scheme:dark]" /></label>
              <label className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-300">Cajero / responsable<input value={cashier} disabled={!editable} onChange={e => setCashier(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-400 disabled:opacity-60" /></label>
              <label className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-300">Moneda del efectivo<select value={cashCurrency} disabled={!editable} onChange={e => setCashCurrency(e.target.value as 'USD' | 'VES')} className="mt-1.5 block w-full rounded-xl border border-white/15 bg-slate-800 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-400 disabled:opacity-60"><option value="USD">Efectivo en dólares ($)</option><option value="VES">Efectivo en bolívares (Bs.)</option></select></label>
            </div>
          </div>

          <div className="p-4 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">01 / Registro</p><h3 className="mt-1 text-xl font-black">Detalle de ventas</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Una fila por producto. Introduce el importe en la columna del método de pago utilizado.</p></div>{editable && <button onClick={() => setRows(old => [...old, emptyLine()])} className="no-print rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600">＋ Agregar producto</button>}</div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-sm">
                  <thead><tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500"><th className="w-20 border-b border-slate-200 p-3 text-center">Cant.</th><th className="min-w-64 border-b border-slate-200 p-3 text-left">Descripción del producto</th><th className="w-36 border-b border-slate-200 p-3 text-right">Pago móvil · Bs.</th><th className="w-32 border-b border-slate-200 p-3 text-right">Punto · Bs.</th><th className="w-36 border-b border-slate-200 p-3 text-right">Efectivo · {cashLabel}</th><th className="w-32 border-b border-slate-200 p-3 text-right">USDT</th>{editable && <th className="no-print w-12 border-b border-slate-200" />}</tr></thead>
                  <tbody>{rows.map((row, index) => <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-orange-50/30">
                    <td className="border-r border-slate-100 p-1.5"><input aria-label={'Cantidad fila ' + (index + 1)} value={row.quantity} disabled={!editable} onChange={e => updateRow(row.id, 'quantity', e.target.value)} inputMode="decimal" className="w-full rounded-lg bg-slate-50 px-2 py-2.5 text-center font-bold outline-none focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 disabled:opacity-70" /></td>
                    <td className="border-r border-slate-100 p-1.5"><input aria-label={'Producto fila ' + (index + 1)} placeholder="Nombre del producto" value={row.description} disabled={!editable} onChange={e => updateRow(row.id, 'description', e.target.value)} className="w-full rounded-lg bg-slate-50 px-3 py-2.5 font-semibold outline-none placeholder:font-normal placeholder:text-slate-400 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 disabled:opacity-70" /></td>
                    {(['mobile', 'pos', 'cash', 'usdt'] as const).map(field => <td key={field} className="border-r border-slate-100 p-1.5 last:border-0"><input aria-label={field + ' fila ' + (index + 1)} placeholder="0,00" value={row[field]} disabled={!editable} onChange={e => updateRow(row.id, field, e.target.value)} inputMode="decimal" className="w-full rounded-lg bg-slate-50 px-2 py-2.5 text-right font-semibold tabular-nums outline-none placeholder:text-slate-300 focus:bg-orange-50 focus:ring-1 focus:ring-orange-300 disabled:opacity-70" /></td>)}
                    {editable && <td className="no-print p-1 text-center"><button aria-label="Eliminar fila" onClick={() => setRows(old => old.length > 1 ? old.filter(x => x.id !== row.id) : [emptyLine()])} className="rounded-lg px-2 py-1 text-lg font-bold text-slate-300 transition hover:bg-red-50 hover:text-red-600">×</button></td>}
                  </tr>)}</tbody>
                  <tfoot><tr className="bg-orange-50 text-sm font-black"><td colSpan={2} className="p-3 text-right text-[10px] uppercase tracking-wider text-slate-600">Totales automáticos</td><td className="p-3 text-right tabular-nums text-slate-900">{money(totals.mobile)}</td><td className="p-3 text-right tabular-nums text-slate-900">{money(totals.pos)}</td><td className="p-3 text-right tabular-nums text-slate-900">{money(totals.cash, cashCurrency)}</td><td className="p-3 text-right tabular-nums text-pink-700">{money(totals.usdt, 'USDT')}</td>{editable && <td className="no-print" />}</tr></tfoot>
                </table>
              </div>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_.85fr]">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">02 / Control de efectivo</p><h3 className="mt-1 text-lg font-black">Fondo inicial y retiros</h3><p className="mt-1 text-xs leading-5 text-slate-500">Se registran por separado: no alteran los totales de ventas.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fondo inicial · {cashLabel}<input value={openingFund} disabled={!editable} onChange={e => setOpeningFund(e.target.value)} inputMode="decimal" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xl font-black tabular-nums outline-none focus:border-orange-400 disabled:opacity-70" /></label>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Retiros · {cashLabel}<input value={withdrawals} disabled={!editable} onChange={e => setWithdrawals(e.target.value)} inputMode="decimal" className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xl font-black tabular-nums outline-none focus:border-orange-400 disabled:opacity-70" /></label>
                </div>
              </section>
              <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg shadow-slate-900/10">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">03 / Resumen</p><h3 className="mt-1 text-lg font-black">Arqueo por método de pago</h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-sm text-slate-300">Pago móvil</span><strong className="tabular-nums">{money(totals.mobile)}</strong></div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-sm text-slate-300">Punto de venta</span><strong className="tabular-nums">{money(totals.pos)}</strong></div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3"><span className="text-sm text-slate-300">Efectivo · {cashLabel}</span><strong className="tabular-nums">{money(totals.cash, cashCurrency)}</strong></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-300">USDT</span><strong className="tabular-nums text-pink-300">{money(totals.usdt, 'USDT')}</strong></div>
                </div>
              </section>
            </div>

            <section className="mt-7"><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">04 / Observaciones</p><h3 className="mt-1 text-lg font-black">Notas y aclaratorias</h3><p className="mt-1 text-xs text-slate-500">Dinero de terceros, diferencias, retiros u otra información importante del día.</p><textarea rows={4} value={notes} disabled={!editable} onChange={e => setNotes(e.target.value)} placeholder="Ej.: Quedaron 131 $: 16 $ de caja, 65 $ de la venta de hoy y 50 $ de Rosa. Se retiraron 50 $." className="mt-3 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-orange-400 focus:bg-white disabled:opacity-70" /></section>

            <div className="no-print mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="max-w-lg text-xs leading-5 text-slate-500">{closing?.status === 'closed' ? 'Este cierre está finalizado y protegido contra modificaciones.' : 'Puedes guardar un borrador mientras trabajas o finalizar el cierre al terminar el día.'}</p>
              {editable && <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void save(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold transition hover:bg-slate-100 disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar borrador'}</button><button disabled={busy} onClick={() => void save(true)} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50">{busy ? 'Procesando…' : 'Finalizar cierre del día →'}</button></div>}
            </div>
          </div>
        </section>

        <section className="no-print mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Archivo</p><h2 className="mt-1 text-xl font-black">Historial de cierres</h2><p className="mt-0.5 text-xs text-slate-500">Consulta un reporte anterior para revisarlo o imprimirlo.</p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">{history.length} registros</span></div>
          <div className="divide-y divide-slate-100">{history.map(item => <button key={item.id} onClick={() => view(item)} className={'flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ' + (closing?.id === item.id ? 'bg-orange-50/70' : '')}>
            <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-700">#{String(item.closing_number).padStart(3, '0')}</span><span><strong className="block text-sm text-slate-900">{dateLabel(item.closing_date)}</strong><span className="mt-0.5 block text-xs text-slate-500">{item.cashier_name}</span></span></span>
            <span className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-slate-500">Móvil {money(num(item.total_mobile))} · Punto {money(num(item.total_pos))}</span><span className={'rounded-full px-2.5 py-1 text-[10px] font-black uppercase ' + (item.status === 'closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{item.status === 'closed' ? 'Cerrado' : 'Borrador'}</span></span>
          </button>)}</div>
          {!history.length && <p className="px-5 py-10 text-center text-sm text-slate-500">Todavía no hay cierres guardados.</p>}
        </section>
      </div>
    </main>
  )
}
