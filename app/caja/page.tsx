'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Line = { id: string; quantity: string; description: string; mobile: string; pos: string; cash: string; usdt: string }
type Closing = { id:string; closing_date:string; closing_number:number; cashier_name:string; cash_currency:'USD'|'VES'; opening_fund:number; withdrawals:number; lines:Line[]; total_mobile:number; total_pos:number; total_cash:number; total_usdt:number; notes:string|null; status:'draft'|'closed' }
const localDate = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-') }
const emptyLine = ():Line => ({id:crypto.randomUUID(),quantity:'1',description:'',mobile:'',pos:'',cash:'',usdt:''})
const num = (v:string|number|null|undefined) => Number(v??0)||0
const money = (v:number,currency='VES') => new Intl.NumberFormat('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)+(currency==='USDT'?' USDT':currency==='USD'?' 
const dateLabel = (v:string) => { const p=v.split('-'); return p[2]+'/'+p[1]+'/'+p[0] }

export default function CashPage() {
  const db=useMemo(()=>createClient(),[])
  const router=useRouter()
  const [today,setToday]=useState('')
  const [ready,setReady]=useState(false)
  const [date,setDate]=useState(today)
  const [cashier,setCashier]=useState('')
  const [cashCurrency,setCashCurrency]=useState<'USD'|'VES'>('USD')
  const [openingFund,setOpeningFund]=useState('0')
  const [withdrawals,setWithdrawals]=useState('0')
  const [rows,setRows]=useState<Line[]>([emptyLine()])
  const [notes,setNotes]=useState('')
  const [closing,setClosing]=useState<Closing|null>(null)
  const [history,setHistory]=useState<Closing[]>([])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  const load=useCallback(async()=>{
    if(!today)return
    const [{data:{user},error:userError},{data,error:listError}]=await Promise.all([db.auth.getUser(),db.rpc('jam_daily_closing_list',{p_limit:40})])
    if(userError||!user){router.replace('/');return}
    if(listError){setError(listError.message);setReady(true);return}
    const displayName=String(user.user_metadata?.full_name??user.user_metadata?.name??user.email??'Usuario')
    setCashier(displayName)
    const items=(data??[]) as Closing[]
    setHistory(items)
    const current=items.find(x=>x.closing_date===today)
    if(current){
      setClosing(current);setDate(current.closing_date);setCashier(current.cashier_name);setCashCurrency(current.cash_currency)
      setOpeningFund(String(current.opening_fund??0));setWithdrawals(String(current.withdrawals??0))
      setRows((current.lines?.length?current.lines:[emptyLine()]).map(x=>({...x,id:x.id||crypto.randomUUID()})))
      setNotes(current.notes??'')
    } else { setDate(today) }
    setReady(true)
  },[db,router,today])
  useEffect(()=>{setToday(localDate())},[])
  useEffect(()=>{void load()},[load])

  const totals=useMemo(()=>rows.reduce((a,r)=>({mobile:a.mobile+num(r.mobile),pos:a.pos+num(r.pos),cash:a.cash+num(r.cash),usdt:a.usdt+num(r.usdt)}),{mobile:0,pos:0,cash:0,usdt:0}),[rows])
  const editable=!closing||(closing.status==='draft'&&closing.closing_date===today)
  const updateRow=(id:string,field:keyof Omit<Line,'id'>,value:string)=>setRows(old=>old.map(r=>r.id===id?{...r,[field]:value}:r))

  async function save(finalize:boolean){
    setBusy(true);setError('');setMessage('')
    try{
      const valid=rows.filter(r=>r.description.trim()||r.mobile||r.pos||r.cash||r.usdt)
      if(!valid.length)throw new Error('Agrega al menos un producto al detalle.')
      if(valid.some(r=>!r.description.trim()))throw new Error('Completa la descripción de cada fila que tenga importes.')
      if(valid.some(r=>num(r.quantity)<=0||[r.mobile,r.pos,r.cash,r.usdt].some(v=>num(v)<0)))throw new Error('Revisa las cantidades e importes. No pueden ser negativos ni tener cantidad cero.')
      if(!cashier.trim())throw new Error('Indica el cajero responsable.')
      if(num(openingFund)<0||num(withdrawals)<0)throw new Error('El fondo y los retiros no pueden ser negativos.')
      const payload=valid.map(({quantity,description,mobile,pos,cash,usdt})=>({quantity,description:description.trim(),mobile:mobile||'0',pos:pos||'0',cash:cash||'0',usdt:usdt||'0'}))
      const {data,error:rpcError}=await db.rpc('jam_daily_closing_save',{p_closing_date:date,p_cashier_name:cashier.trim(),p_cash_currency:cashCurrency,p_opening_fund:openingFund||'0',p_withdrawals:withdrawals||'0',p_lines:payload,p_notes:notes,p_finalize:finalize})
      if(rpcError)throw rpcError
      setClosing(data as Closing)
      setMessage(finalize?'Cierre finalizado y guardado correctamente.':'Borrador guardado. Puedes seguir editándolo.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el cierre.')}
    finally{setBusy(false)}
  }

  function view(item:Closing){
    setClosing(item);setDate(item.closing_date);setCashier(item.cashier_name);setCashCurrency(item.cash_currency)
    setOpeningFund(String(item.opening_fund??0));setWithdrawals(String(item.withdrawals??0))
    setRows((item.lines?.length?item.lines:[emptyLine()]).map(x=>({...x,id:x.id||crypto.randomUUID()})))
    setNotes(item.notes??'');setError('');setMessage('')
  }

  if(!ready)return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Verificando acceso…</main>
  return <main className="min-h-screen bg-slate-100 p-3 text-slate-900 sm:p-6">
    <style jsx global>{'@media print { body { background: white !important; } .no-print { display:none !important; } .print-sheet { box-shadow:none !important; border:0 !important; max-width:none !important; padding:0 !important; } input,textarea,select { border:0 !important; background:transparent !important; padding:2px !important; } }'}</style>
    <div className="mx-auto max-w-7xl">
      <header className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black tracking-[.24em] text-orange-600">PINTURAS JAM</p><h1 className="text-2xl font-black sm:text-3xl">Cierre diario de caja</h1><p className="mt-1 text-sm text-slate-500">La hoja de cierre digital, con la misma lógica del cuaderno.</p></div>
        <div className="flex gap-2"><button onClick={()=>window.print()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Imprimir reporte</button><button onClick={()=>router.push('/operaciones')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Volver</button></div>
      </header>
      {error&&<p role="alert" className="no-print mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message&&<p role="status" className="no-print mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <section className="print-sheet overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b-4 border-slate-900 px-4 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-black tracking-[.2em] text-orange-600">PINTURAS JAM · CONTROL DIARIO</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">CIERRE DE CAJA</h2><p className="mt-1 text-sm text-slate-500">Registro diario de ventas y arqueo por método de pago</p></div>
            <div className="rounded-xl bg-slate-900 px-5 py-3 text-right text-white"><p className="text-[10px] font-bold tracking-widest text-slate-300">NÚMERO DE CIERRE</p><p className="text-3xl font-black tabular-nums">#{String(closing?.closing_number??'---').padStart(3,'0')}</p><p className="text-xs text-slate-300">{closing?.status==='closed'?'FINALIZADO':closing?'BORRADOR':'PENDIENTE'}</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fecha del cierre<input type="date" value={date} disabled={!editable} onChange={e=>setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold text-slate-900 disabled:opacity-70"/></label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cajero / responsable<input value={cashier} disabled={!editable} onChange={e=>setCashier(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 disabled:opacity-70"/></label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Moneda del efectivo<select value={cashCurrency} disabled={!editable} onChange={e=>setCashCurrency(e.target.value as 'USD'|'VES')} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 disabled:opacity-70"><option value="USD">Efectivo en dólares ($)</option><option value="VES">Efectivo en bolívares (Bs.)</option></select></label>
          </div>
        </div>
        <div className="px-3 py-5 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-black">Detalle de ventas</h3><p className="text-xs text-slate-500">Registra cada producto y coloca el importe en la columna del método de pago correspondiente.</p></div>{editable&&<button onClick={()=>setRows(old=>[...old,emptyLine()])} className="no-print rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white">+ Agregar producto</button>}</div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead><tr className="bg-slate-900 text-white"><th className="w-20 border-r border-slate-700 p-3 text-center">Cant.</th><th className="min-w-64 border-r border-slate-700 p-3 text-left">Descripción del producto</th><th className="w-36 border-r border-slate-700 p-3 text-right">Pago móvil (Bs.)</th><th className="w-32 border-r border-slate-700 p-3 text-right">Punto (Bs.)</th><th className="w-36 border-r border-slate-700 p-3 text-right">Efectivo ({cashCurrency==='USD'?'$':'Bs.'})</th><th className="w-32 p-3 text-right">USDT</th>{editable&&<th className="no-print w-12 p-2"></th>}</tr></thead>
              <tbody>{rows.map((row,index)=><tr key={row.id} className="border-b border-slate-200 last:border-0">
                <td className="border-r border-slate-200 p-1"><input aria-label={'Cantidad fila '+(index+1)} value={row.quantity} disabled={!editable} onChange={e=>updateRow(row.id,'quantity',e.target.value)} inputMode="decimal" className="w-full rounded px-2 py-2 text-center font-semibold outline-none focus:bg-orange-50 disabled:opacity-70"/></td>
                <td className="border-r border-slate-200 p-1"><input aria-label={'Producto fila '+(index+1)} placeholder="Nombre del producto" value={row.description} disabled={!editable} onChange={e=>updateRow(row.id,'description',e.target.value)} className="w-full rounded px-2 py-2 font-medium outline-none focus:bg-orange-50 disabled:opacity-70"/></td>
                {(['mobile','pos','cash','usdt'] as const).map(field=><td key={field} className="border-r border-slate-200 p-1 last:border-0"><input aria-label={field+' fila '+(index+1)} placeholder="—" value={row[field]} disabled={!editable} onChange={e=>updateRow(row.id,field,e.target.value)} inputMode="decimal" className="w-full rounded px-2 py-2 text-right tabular-nums outline-none focus:bg-orange-50 disabled:opacity-70"/></td>)}
                {editable&&<td className="no-print p-1 text-center"><button aria-label="Eliminar fila" onClick={()=>setRows(old=>old.length>1?old.filter(x=>x.id!==row.id):[emptyLine()])} className="rounded px-2 py-1 text-lg font-bold text-red-500 hover:bg-red-50">×</button></td>}
              </tr>)}</tbody>
              <tfoot><tr className="bg-orange-50 font-black"><td colSpan={2} className="p-3 text-right uppercase tracking-wide">Totales automáticos</td><td className="p-3 text-right tabular-nums">{money(totals.mobile,'VES')}</td><td className="p-3 text-right tabular-nums">{money(totals.pos,'VES')}</td><td className="p-3 text-right tabular-nums">{money(totals.cash,cashCurrency)}</td><td className="p-3 text-right tabular-nums">{money(totals.usdt,'USDT')}</td>{editable&&<td className="no-print"></td>}</tr></tfoot>
            </table>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section><h3 className="text-lg font-black">Fondo, dinero en caja y retiros</h3><p className="mt-1 text-xs text-slate-500">Estos valores se registran aparte y no modifican los totales de ventas.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fondo inicial ({cashCurrency==='USD'?'$':'Bs.'})<input value={openingFund} disabled={!editable} onChange={e=>setOpeningFund(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-lg font-bold text-slate-900 disabled:opacity-70"/></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Retiros ({cashCurrency==='USD'?'$':'Bs.'})<input value={withdrawals} disabled={!editable} onChange={e=>setWithdrawals(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-lg font-bold text-slate-900 disabled:opacity-70"/></label>
            </div></section>
            <section className="rounded-xl border-2 border-slate-900 p-4"><h3 className="text-base font-black uppercase tracking-wide">Resumen / arqueo final</h3><div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="font-semibold text-slate-600">USDT</span><strong className="text-xl tabular-nums text-pink-600">{money(totals.usdt,'USD')}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="font-semibold text-slate-600">Efectivo {cashCurrency==='USD'?'$':'Bs.'}</span><strong className="text-xl tabular-nums">{money(totals.cash,cashCurrency)}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="font-semibold text-slate-600">Pago móvil</span><strong className="text-xl tabular-nums">{money(totals.mobile,'VES')}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-600">Punto</span><strong className="text-xl tabular-nums">{money(totals.pos,'VES')}</strong></div>
            </div></section>
          </div>
          <section className="mt-7"><h3 className="text-lg font-black">Notas y observaciones</h3><p className="mt-1 text-xs text-slate-500">Anota diferencias, dinero de terceros, retiros y cualquier aclaratoria del cierre.</p><textarea rows={4} value={notes} disabled={!editable} onChange={e=>setNotes(e.target.value)} placeholder="Ej.: Quedaron 131 $: 16 $ de caja, 65 $ de la venta de hoy y 50 $ de Rosa. Se retiraron 50 $." className="mt-3 block w-full resize-y rounded-xl border border-slate-300 p-4 text-sm leading-6 outline-none focus:border-orange-500 disabled:opacity-70"/></section>
          <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-500">{closing?.status==='closed'?'Este cierre está finalizado y protegido contra modificaciones.':'Guarda un borrador mientras trabajas o finaliza el cierre al terminar el día.'}</p>
            {editable&&<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void save(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">{busy?'Guardando…':'Guardar borrador'}</button><button disabled={busy} onClick={()=>void save(true)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy?'Procesando…':'Finalizar cierre del día'}</button></div>}
          </div>
        </div>
      </section>
      <section className="no-print mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">Historial de cierres</h2><p className="text-xs text-slate-500">Consulta e imprime reportes anteriores.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{history.length} registros</span></div>
        <div className="mt-3 divide-y divide-slate-100">{history.map(item=><button key={item.id} onClick={()=>view(item)} className={'flex w-full flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-50 '+(closing?.id===item.id?'bg-orange-50':'')}>
          <span><strong className="mr-3 text-slate-900">#{String(item.closing_number).padStart(3,'0')}</strong><span className="text-sm text-slate-600">{dateLabel(item.closing_date)} · {item.cashier_name}</span></span>
          <span className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500">{money(num(item.total_mobile),'VES')} móvil · {money(num(item.total_pos),'VES')} punto</span><span className={'rounded-full px-2.5 py-1 text-[10px] font-black uppercase '+(item.status==='closed'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800')}>{item.status==='closed'?'Cerrado':'Borrador'}</span></span>
        </button>)}</div>
        {!history.length&&<p className="py-6 text-center text-sm text-slate-500">Todavía no hay cierres guardados.</p>}
      </section>
    </div>
  </main>
}
:' Bs.')
const dateLabel = (v:string) => { const p=v.split('-'); return p[2]+'/'+p[1]+'/'+p[0] }

export default function CashPage() {
  const db=useMemo(()=>createClient(),[])
  const router=useRouter()
  const today=useMemo(()=>localDate(),[])
  const [ready,setReady]=useState(false)
  const [date,setDate]=useState(today)
  const [cashier,setCashier]=useState('')
  const [cashCurrency,setCashCurrency]=useState<'USD'|'VES'>('USD')
  const [openingFund,setOpeningFund]=useState('0')
  const [withdrawals,setWithdrawals]=useState('0')
  const [rows,setRows]=useState<Line[]>([emptyLine()])
  const [notes,setNotes]=useState('')
  const [closing,setClosing]=useState<Closing|null>(null)
  const [history,setHistory]=useState<Closing[]>([])
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')

  const load=useCallback(async()=>{
    const [{data:{user},error:userError},{data,error:listError}]=await Promise.all([db.auth.getUser(),db.rpc('jam_daily_closing_list',{p_limit:40})])
    if(userError||!user){router.replace('/');return}
    if(listError){setError(listError.message);setReady(true);return}
    const displayName=String(user.user_metadata?.full_name??user.user_metadata?.name??user.email??'Usuario')
    setCashier(displayName)
    const items=(data??[]) as Closing[]
    setHistory(items)
    const current=items.find(x=>x.closing_date===today)
    if(current){
      setClosing(current);setDate(current.closing_date);setCashier(current.cashier_name);setCashCurrency(current.cash_currency)
      setOpeningFund(String(current.opening_fund??0));setWithdrawals(String(current.withdrawals??0))
      setRows((current.lines?.length?current.lines:[emptyLine()]).map(x=>({...x,id:x.id||crypto.randomUUID()})))
      setNotes(current.notes??'')
    }
    setReady(true)
  },[db,router,today])
  useEffect(()=>{void load()},[load])

  const totals=useMemo(()=>rows.reduce((a,r)=>({mobile:a.mobile+num(r.mobile),pos:a.pos+num(r.pos),cash:a.cash+num(r.cash),usdt:a.usdt+num(r.usdt)}),{mobile:0,pos:0,cash:0,usdt:0}),[rows])
  const editable=!closing||(closing.status==='draft'&&closing.closing_date===today)
  const updateRow=(id:string,field:keyof Omit<Line,'id'>,value:string)=>setRows(old=>old.map(r=>r.id===id?{...r,[field]:value}:r))

  async function save(finalize:boolean){
    setBusy(true);setError('');setMessage('')
    try{
      const valid=rows.filter(r=>r.description.trim()||r.mobile||r.pos||r.cash||r.usdt)
      if(!valid.length)throw new Error('Agrega al menos un producto al detalle.')
      if(valid.some(r=>!r.description.trim()))throw new Error('Completa la descripción de cada fila que tenga importes.')
      if(valid.some(r=>num(r.quantity)<=0||[r.mobile,r.pos,r.cash,r.usdt].some(v=>num(v)<0)))throw new Error('Revisa las cantidades e importes. No pueden ser negativos ni tener cantidad cero.')
      if(!cashier.trim())throw new Error('Indica el cajero responsable.')
      if(num(openingFund)<0||num(withdrawals)<0)throw new Error('El fondo y los retiros no pueden ser negativos.')
      const payload=valid.map(({quantity,description,mobile,pos,cash,usdt})=>({quantity,description:description.trim(),mobile:mobile||'0',pos:pos||'0',cash:cash||'0',usdt:usdt||'0'}))
      const {data,error:rpcError}=await db.rpc('jam_daily_closing_save',{p_closing_date:date,p_cashier_name:cashier.trim(),p_cash_currency:cashCurrency,p_opening_fund:openingFund||'0',p_withdrawals:withdrawals||'0',p_lines:payload,p_notes:notes,p_finalize:finalize})
      if(rpcError)throw rpcError
      setClosing(data as Closing)
      setMessage(finalize?'Cierre finalizado y guardado correctamente.':'Borrador guardado. Puedes seguir editándolo.')
      await load()
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el cierre.')}
    finally{setBusy(false)}
  }

  function view(item:Closing){
    setClosing(item);setDate(item.closing_date);setCashier(item.cashier_name);setCashCurrency(item.cash_currency)
    setOpeningFund(String(item.opening_fund??0));setWithdrawals(String(item.withdrawals??0))
    setRows((item.lines?.length?item.lines:[emptyLine()]).map(x=>({...x,id:x.id||crypto.randomUUID()})))
    setNotes(item.notes??'');setError('');setMessage('')
  }

  if(!ready)return <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Verificando acceso…</main>
  return <main className="min-h-screen bg-slate-100 p-3 text-slate-900 sm:p-6">
    <style jsx global>{'@media print { body { background: white !important; } .no-print { display:none !important; } .print-sheet { box-shadow:none !important; border:0 !important; max-width:none !important; padding:0 !important; } input,textarea,select { border:0 !important; background:transparent !important; padding:2px !important; } }'}</style>
    <div className="mx-auto max-w-7xl">
      <header className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black tracking-[.24em] text-orange-600">PINTURAS JAM</p><h1 className="text-2xl font-black sm:text-3xl">Cierre diario de caja</h1><p className="mt-1 text-sm text-slate-500">La hoja de cierre digital, con la misma lógica del cuaderno.</p></div>
        <div className="flex gap-2"><button onClick={()=>window.print()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold">Imprimir reporte</button><button onClick={()=>router.push('/operaciones')} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Volver</button></div>
      </header>
      {error&&<p role="alert" className="no-print mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message&&<p role="status" className="no-print mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <section className="print-sheet overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b-4 border-slate-900 px-4 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-black tracking-[.2em] text-orange-600">PINTURAS JAM · CONTROL DIARIO</p><h2 className="mt-1 text-2xl font-black sm:text-3xl">CIERRE DE CAJA</h2><p className="mt-1 text-sm text-slate-500">Registro diario de ventas y arqueo por método de pago</p></div>
            <div className="rounded-xl bg-slate-900 px-5 py-3 text-right text-white"><p className="text-[10px] font-bold tracking-widest text-slate-300">NÚMERO DE CIERRE</p><p className="text-3xl font-black tabular-nums">#{String(closing?.closing_number??'---').padStart(3,'0')}</p><p className="text-xs text-slate-300">{closing?.status==='closed'?'FINALIZADO':closing?'BORRADOR':'PENDIENTE'}</p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fecha del cierre<input type="date" value={date} disabled={!editable} onChange={e=>setDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold text-slate-900 disabled:opacity-70"/></label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cajero / responsable<input value={cashier} disabled={!editable} onChange={e=>setCashier(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 disabled:opacity-70"/></label>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Moneda del efectivo<select value={cashCurrency} disabled={!editable} onChange={e=>setCashCurrency(e.target.value as 'USD'|'VES')} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-900 disabled:opacity-70"><option value="USD">Efectivo en dólares ($)</option><option value="VES">Efectivo en bolívares (Bs.)</option></select></label>
          </div>
        </div>
        <div className="px-3 py-5 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-lg font-black">Detalle de ventas</h3><p className="text-xs text-slate-500">Registra cada producto y coloca el importe en la columna del método de pago correspondiente.</p></div>{editable&&<button onClick={()=>setRows(old=>[...old,emptyLine()])} className="no-print rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white">+ Agregar producto</button>}</div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead><tr className="bg-slate-900 text-white"><th className="w-20 border-r border-slate-700 p-3 text-center">Cant.</th><th className="min-w-64 border-r border-slate-700 p-3 text-left">Descripción del producto</th><th className="w-36 border-r border-slate-700 p-3 text-right">Pago móvil (Bs.)</th><th className="w-32 border-r border-slate-700 p-3 text-right">Punto (Bs.)</th><th className="w-36 border-r border-slate-700 p-3 text-right">Efectivo ({cashCurrency==='USD'?'$':'Bs.'})</th><th className="w-32 p-3 text-right">USDT</th>{editable&&<th className="no-print w-12 p-2"></th>}</tr></thead>
              <tbody>{rows.map((row,index)=><tr key={row.id} className="border-b border-slate-200 last:border-0">
                <td className="border-r border-slate-200 p-1"><input aria-label={'Cantidad fila '+(index+1)} value={row.quantity} disabled={!editable} onChange={e=>updateRow(row.id,'quantity',e.target.value)} inputMode="decimal" className="w-full rounded px-2 py-2 text-center font-semibold outline-none focus:bg-orange-50 disabled:opacity-70"/></td>
                <td className="border-r border-slate-200 p-1"><input aria-label={'Producto fila '+(index+1)} placeholder="Nombre del producto" value={row.description} disabled={!editable} onChange={e=>updateRow(row.id,'description',e.target.value)} className="w-full rounded px-2 py-2 font-medium outline-none focus:bg-orange-50 disabled:opacity-70"/></td>
                {(['mobile','pos','cash','usdt'] as const).map(field=><td key={field} className="border-r border-slate-200 p-1 last:border-0"><input aria-label={field+' fila '+(index+1)} placeholder="—" value={row[field]} disabled={!editable} onChange={e=>updateRow(row.id,field,e.target.value)} inputMode="decimal" className="w-full rounded px-2 py-2 text-right tabular-nums outline-none focus:bg-orange-50 disabled:opacity-70"/></td>)}
                {editable&&<td className="no-print p-1 text-center"><button aria-label="Eliminar fila" onClick={()=>setRows(old=>old.length>1?old.filter(x=>x.id!==row.id):[emptyLine()])} className="rounded px-2 py-1 text-lg font-bold text-red-500 hover:bg-red-50">×</button></td>}
              </tr>)}</tbody>
              <tfoot><tr className="bg-orange-50 font-black"><td colSpan={2} className="p-3 text-right uppercase tracking-wide">Totales automáticos</td><td className="p-3 text-right tabular-nums">{money(totals.mobile,'VES')}</td><td className="p-3 text-right tabular-nums">{money(totals.pos,'VES')}</td><td className="p-3 text-right tabular-nums">{money(totals.cash,cashCurrency)}</td><td className="p-3 text-right tabular-nums">{money(totals.usdt,'USD')}</td>{editable&&<td className="no-print"></td>}</tr></tfoot>
            </table>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <section><h3 className="text-lg font-black">Fondo, dinero en caja y retiros</h3><p className="mt-1 text-xs text-slate-500">Estos valores se registran aparte y no modifican los totales de ventas.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fondo inicial ({cashCurrency==='USD'?'$':'Bs.'})<input value={openingFund} disabled={!editable} onChange={e=>setOpeningFund(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-lg font-bold text-slate-900 disabled:opacity-70"/></label>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Retiros ({cashCurrency==='USD'?'$':'Bs.'})<input value={withdrawals} disabled={!editable} onChange={e=>setWithdrawals(e.target.value)} inputMode="decimal" className="mt-1 block w-full rounded-lg border border-slate-300 p-3 text-lg font-bold text-slate-900 disabled:opacity-70"/></label>
            </div></section>
            <section className="rounded-xl border-2 border-slate-900 p-4"><h3 className="text-base font-black uppercase tracking-wide">Resumen / arqueo final</h3><div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="font-semibold text-slate-600">USDT</span><strong className="text-xl tabular-nums text-pink-600">{money(totals.usdt,'USD')}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="font-semibold text-slate-600">Efectivo {cashCurrency==='USD'?'$':'Bs.'}</span><strong className="text-xl tabular-nums">{money(totals.cash,cashCurrency)}</strong></div>
              <div className="flex items-center justify-between gap-3 border-b pb-2"><span className="font-semibold text-slate-600">Pago móvil</span><strong className="text-xl tabular-nums">{money(totals.mobile,'VES')}</strong></div>
              <div className="flex items-center justify-between gap-3"><span className="font-semibold text-slate-600">Punto</span><strong className="text-xl tabular-nums">{money(totals.pos,'VES')}</strong></div>
            </div></section>
          </div>
          <section className="mt-7"><h3 className="text-lg font-black">Notas y observaciones</h3><p className="mt-1 text-xs text-slate-500">Anota diferencias, dinero de terceros, retiros y cualquier aclaratoria del cierre.</p><textarea rows={4} value={notes} disabled={!editable} onChange={e=>setNotes(e.target.value)} placeholder="Ej.: Quedaron 131 $: 16 $ de caja, 65 $ de la venta de hoy y 50 $ de Rosa. Se retiraron 50 $." className="mt-3 block w-full resize-y rounded-xl border border-slate-300 p-4 text-sm leading-6 outline-none focus:border-orange-500 disabled:opacity-70"/></section>
          <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <p className="text-xs text-slate-500">{closing?.status==='closed'?'Este cierre está finalizado y protegido contra modificaciones.':'Guarda un borrador mientras trabajas o finaliza el cierre al terminar el día.'}</p>
            {editable&&<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void save(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">{busy?'Guardando…':'Guardar borrador'}</button><button disabled={busy} onClick={()=>void save(true)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy?'Procesando…':'Finalizar cierre del día'}</button></div>}
          </div>
        </div>
      </section>
      <section className="no-print mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">Historial de cierres</h2><p className="text-xs text-slate-500">Consulta e imprime reportes anteriores.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{history.length} registros</span></div>
        <div className="mt-3 divide-y divide-slate-100">{history.map(item=><button key={item.id} onClick={()=>view(item)} className={'flex w-full flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-slate-50 '+(closing?.id===item.id?'bg-orange-50':'')}>
          <span><strong className="mr-3 text-slate-900">#{String(item.closing_number).padStart(3,'0')}</strong><span className="text-sm text-slate-600">{dateLabel(item.closing_date)} · {item.cashier_name}</span></span>
          <span className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500">{money(num(item.total_mobile),'VES')} móvil · {money(num(item.total_pos),'VES')} punto</span><span className={'rounded-full px-2.5 py-1 text-[10px] font-black uppercase '+(item.status==='closed'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800')}>{item.status==='closed'?'Cerrado':'Borrador'}</span></span>
        </button>)}</div>
        {!history.length&&<p className="py-6 text-center text-sm text-slate-500">Todavía no hay cierres guardados.</p>}
      </section>
    </div>
  </main>
}
