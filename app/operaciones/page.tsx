'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommercialService } from '@/lib/modules/commercial'
import { CatalogService, InventoryService } from '@/lib/modules/inventory/supabase'
import type { ProductInput } from '@/lib/modules/inventory/types'
import { calculateDocument } from '@/lib/modules/commercial/calculations'
import type { CommercialLineInput, Currency } from '@/lib/modules/commercial/types'
import { PurchasesService } from '@/lib/modules/purchases'
import type { User } from '@supabase/supabase-js'

type Section = 'Inventario' | 'Clientes' | 'Proveedores' | 'Compras' | 'Ventas' | 'Cotizaciones' | 'Cuentas por cobrar' | 'Cuentas por pagar' | 'Reportes'
type Row = Record<string, unknown>
const sections: Section[] = ['Inventario', 'Clientes', 'Proveedores', 'Compras', 'Ventas', 'Cotizaciones', 'Cuentas por cobrar', 'Cuentas por pagar', 'Reportes']
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error inesperado.'
const pretty = (v: unknown) => v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)

export default function OperationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [section, setSection] = useState<Section>('Inventario')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [categories, setCategories] = useState<Row[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [productName, setProductName] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productBrand, setProductBrand] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productPresentation, setProductPresentation] = useState('')
  const [productUnit, setProductUnit] = useState('unidad')
  const [productColor, setProductColor] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [saleProducts, setSaleProducts] = useState<Row[]>([])
  const [warehouses, setWarehouses] = useState<Row[]>([])
  const [paymentMethods, setPaymentMethods] = useState<Row[]>([])
  const [saleWarehouse, setSaleWarehouse] = useState('')
  const [saleCustomer, setSaleCustomer] = useState('')
  const [saleCurrency, setSaleCurrency] = useState<Currency>('VES')
  const [salePaymentMethod, setSalePaymentMethod] = useState('')
  const [salePaymentAmount, setSalePaymentAmount] = useState('')
  const [saleNotes, setSaleNotes] = useState('')
  const [cartProduct, setCartProduct] = useState('')
  const [cartQuantity, setCartQuantity] = useState('1')
  const [cartPrice, setCartPrice] = useState('')
  const [cart, setCart] = useState<CommercialLineInput[]>([])
  const [customerRows, setCustomerRows] = useState<Row[]>([])
  const [supplierName, setSupplierName] = useState('')
  const [supplierTaxId, setSupplierTaxId] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [purchaseSuppliers, setPurchaseSuppliers] = useState<Row[]>([])
  const [purchaseProducts, setPurchaseProducts] = useState<Row[]>([])
  const [purchaseWarehouses, setPurchaseWarehouses] = useState<Row[]>([])
  const [purchaseSupplier, setPurchaseSupplier] = useState('')
  const [purchaseDocument, setPurchaseDocument] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [purchaseCurrency, setPurchaseCurrency] = useState<Currency>('VES')
  const [purchaseNotes, setPurchaseNotes] = useState('')
  const [purchaseProduct, setPurchaseProduct] = useState('')
  const [purchaseQuantity, setPurchaseQuantity] = useState('1')
  const [purchaseUnitCost, setPurchaseUnitCost] = useState('')
  const [purchaseDiscount, setPurchaseDiscount] = useState('0')
  const [purchaseExpense, setPurchaseExpense] = useState('0')
  const [purchaseLines, setPurchaseLines] = useState<Array<{ productId: string; description: string; quantity: string; unitCost: string; discountAmount: string; attributableExpenses: string }>>([])
  const [purchaseDetail, setPurchaseDetail] = useState<Row | null>(null)
  const [receiptWarehouse, setReceiptWarehouse] = useState('')
  const [payableRows, setPayableRows] = useState<Row[]>([])
  const [selectedPayable, setSelectedPayable] = useState('')
  const [supplierPayAmount, setSupplierPayAmount] = useState('')
  const [supplierPayMethod, setSupplierPayMethod] = useState('')
  const [supplierPayReference, setSupplierPayReference] = useState('')
  const [supplierPaymentMethods, setSupplierPaymentMethods] = useState<Row[]>([])
  const [reportSales, setReportSales] = useState<Row[]>([])
  const [reportPurchases, setReportPurchases] = useState<Row[]>([])
  const [reportReceivables, setReportReceivables] = useState<Row[]>([])
  const [reportPayables, setReportPayables] = useState<Row[]>([])
  const [reportCashPending, setReportCashPending] = useState(0)
  const [reportFrom, setReportFrom] = useState(new Date().toISOString().slice(0,10))
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0,10))
  const db = useMemo(() => createClient(), [])
  const commercial = useMemo(() => new CommercialService(db), [db])
  const catalog = useMemo(() => new CatalogService(db), [db])
  const inventory = useMemo(() => new InventoryService(db), [db])
  const purchases = useMemo(() => new PurchasesService(db), [db])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('section')
    if (sections.includes(requested as Section)) setSection(requested as Section)
    if (params.get('notice') === 'cash-pending') {
      setNotice('Hay eventos comerciales pendientes de sincronizar con una caja abierta de la misma moneda.')
    }
  }, [])

  useEffect(() => {
    let mounted = true
    db.auth.getSession().then(({ data, error }: { data: { session: { user: User } | null }; error: { message: string } | null }) => {
      if (!mounted) return
      if (error) setMessage(error.message)
      setUser(data.session?.user ?? null)
      setReady(true)
    }).catch((e: unknown) => { if (mounted) { setMessage(errorText(e)); setReady(true) } })
    const { data: listener } = db.auth.onAuthStateChange((_: string, session: { user: User | null } | null) => setUser(session?.user ?? null))
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [db])

  useEffect(() => {
    if (!user) return
    let mounted = true
    catalog.listCategories().then((result) => {
      if (mounted && result.ok) setCategories(result.data as Row[])
    })
    return () => { mounted = false }
  }, [user, catalog])

  useEffect(() => {
    if (!user || (section !== 'Compras' && section !== 'Proveedores' && section !== 'Cuentas por pagar')) return
    let mounted = true
    Promise.all([purchases.listSuppliers(), catalog.listProducts(), inventory.warehouses(), purchases.listPayables(), commercial.listPaymentMethods()]).then(([suppliers, products, stockrooms, payables, methods]) => {
      if (!mounted) return
      if (suppliers.ok) { setPurchaseSuppliers(suppliers.data as unknown as Row[]); if (!purchaseSupplier && suppliers.data[0]) setPurchaseSupplier(String((suppliers.data[0] as unknown as Row).id)) }
      if (products.ok) setPurchaseProducts(products.data as Row[])
      if (stockrooms.ok) { setPurchaseWarehouses(stockrooms.data as Row[]); if (!receiptWarehouse && stockrooms.data[0]) setReceiptWarehouse(String((stockrooms.data[0] as Row).id)) }
      if (payables.ok) { setPayableRows(payables.data as unknown as Row[]); if (!selectedPayable && payables.data[0]) setSelectedPayable(String((payables.data[0] as unknown as Row).id)) }
      if (methods.ok) { setSupplierPaymentMethods((methods.data as Row[]).filter(x => x.active !== false)); if (!supplierPayMethod && methods.data[0]) setSupplierPayMethod(String((methods.data[0] as Row).name)) }
    }).catch(e => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, purchases, catalog, inventory])

  useEffect(() => {
    if (!user || (section !== 'Ventas' && section !== 'Cotizaciones')) return
    let mounted = true
    Promise.all([catalog.listProducts(), inventory.warehouses(), commercial.listCustomers(), commercial.listPaymentMethods()]).then(([p, w, c, m]) => {
      if (!mounted) return
      if (p.ok) setSaleProducts(p.data as Row[])
      if (w.ok) { setWarehouses(w.data as Row[]); if (!saleWarehouse && w.data[0]) setSaleWarehouse(String((w.data[0] as Row).id)) }
      if (c.ok) setCustomerRows(c.data as Row[])
      if (m.ok) { setPaymentMethods((m.data as Row[]).filter(x => x.active !== false)); if (!salePaymentMethod && m.data[0]) setSalePaymentMethod(String((m.data[0] as Row).name)) }
    }).catch(e => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, catalog, inventory, commercial])

  const load = useCallback(async () => {
    if (!user) return
    setBusy(true); setMessage('')
    try {
      if (section === 'Reportes') {
        const [sales, buys, recv, pay, events] = await Promise.all([commercial.listSales(reportFrom, reportTo), purchases.listPurchases({ from: reportFrom, to: reportTo }), commercial.listReceivables(), purchases.listPayables(), commercial.listCashEventsPending(500)])
        if (!sales.ok) throw new Error(sales.error.message)
        if (!buys.ok) throw new Error(buys.error.message)
        if (!recv.ok) throw new Error(recv.error.message)
        if (!pay.ok) throw new Error(pay.error.message)
        if (!events.ok) throw new Error(events.error.message)
        setReportSales(sales.data as Row[]); setReportPurchases(buys.data as unknown as Row[]); setReportReceivables(recv.data as Row[]); setReportPayables(pay.data as unknown as Row[]); setReportCashPending((events.data as Row[]).length)
        setRows([]); return
      }
      let result
      if (section === 'Inventario') {
        const [products, stock] = await Promise.all([catalog.listProducts(search), inventory.stock(search)])
        if (!products.ok) throw new Error(products.error.message)
        if (!stock.ok) throw new Error(stock.error.message)
        const stockByProduct = new Map((stock.data as Row[]).map((r) => [String(r.product_id ?? r.productId), r]))
        setRows((products.data as Row[]).map((p) => ({ ...p, ...(stockByProduct.get(String(p.id)) ?? {}) })))
      } else {
        switch (section) {
          case 'Clientes': result = await commercial.listCustomers(search); break
          case 'Proveedores': result = await purchases.listSuppliers(search); break
          case 'Compras': result = await purchases.listPurchases({}); break
          case 'Ventas': result = await commercial.listSales(); break
          case 'Cotizaciones': result = await commercial.listQuotes(); break
          case 'Cuentas por cobrar': result = await commercial.listReceivables(); break
          case 'Cuentas por pagar': result = await purchases.listPayables(); break
        }
        if (!result) throw new Error('No se pudo preparar la consulta.')
        if (!result.ok) throw new Error(result.error.message)
        setRows(Array.isArray(result.data) ? result.data as Row[] : result.data ? [result.data as Row] : [])
      }
    } catch (e) { setRows([]); setMessage(errorText(e)) }
    finally { setBusy(false) }
  }, [user, section, search, catalog, inventory, commercial, purchases, reportFrom, reportTo])

  useEffect(() => { void load() }, [load])

  async function signIn(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage(error.message)
    else setPassword('')
  }

  async function signOut() { await db.auth.signOut(); setRows([]); setMessage('Sesión cerrada.') }

  async function createCustomer(e: FormEvent) {
    e.preventDefault()
    const name = customerName.trim()
    if (!name) { setMessage('El nombre del cliente es obligatorio.'); return }
    setBusy(true); setMessage('')
    const result = await commercial.saveCustomer({ name, identificationNumber: customerDocument.trim() || null, phone: customerPhone.trim() || null })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCustomerName(''); setCustomerDocument(''); setCustomerPhone('')
    setMessage('Cliente guardado correctamente.'); await load()
  }

  async function createCategory(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true); setMessage('')
    const result = await catalog.saveCategory(categoryName, { userId: user.id })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCategoryName('')
    const refreshed = await catalog.listCategories()
    if (refreshed.ok) setCategories(refreshed.data as Row[])
    setMessage('Categoría guardada correctamente.')
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    const input: ProductInput = {
      name: productName.trim(),
      sku: productSku.trim() || null,
      brand: productBrand.trim() || null,
      categoryId: productCategory || null,
      presentation: productPresentation.trim() || null,
      unit: productUnit,
      color: productColor.trim() || null,
      salePrice: productPrice.trim() || null,
    }
    setBusy(true); setMessage('')
    const result = await catalog.saveProduct(input, { userId: user.id })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setProductName(''); setProductSku(''); setProductBrand(''); setProductPresentation('')
    setProductColor(''); setProductPrice('')
    setMessage('Producto guardado correctamente.')
    await load()
  }

  function addCartLine(e: FormEvent) {
    e.preventDefault()
    const product = saleProducts.find(p => String(p.id) === cartProduct)
    if (!product) { setMessage('Selecciona un producto válido.'); return }
    if (!/^\d+(?:\.\d{1,6})?$/.test(cartQuantity) || Number(cartQuantity) <= 0 || !/^\d+(?:\.\d{1,6})?$/.test(cartPrice) || Number(cartPrice) < 0) { setMessage('Cantidad o precio inválido.'); return }
    setCart(current => [...current, { productId: String(product.id), description: String(product.name), quantity: cartQuantity, unitPrice: cartPrice }])
    setCartProduct(''); setCartQuantity('1'); setCartPrice(''); setMessage('Producto agregado a la operación.')
  }

  function documentTotal() {
    try { return calculateDocument(cart.map(x => ({ quantity: x.quantity, unitPrice: x.unitPrice, discountAmount: x.discountAmount ?? '0', taxAmount: x.taxAmount ?? '0' }))).total }
    catch { return '0' }
  }

  async function saveQuote() {
    if (!cart.length) { setMessage('Agrega productos antes de guardar la cotización.'); return }
    setBusy(true); setMessage('')
    const result = await commercial.saveQuote({ customerId: saleCustomer || null, currency: saleCurrency, lines: cart, notes: saleNotes || null })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCart([]); setSaleNotes(''); setMessage('Cotización guardada correctamente.'); await load()
  }

  async function confirmSale() {
    if (!cart.length || !saleWarehouse) { setMessage('Agrega productos y selecciona un depósito.'); return }
    const total = documentTotal()
    const payments = salePaymentAmount.trim() && salePaymentMethod ? [{ amount: salePaymentAmount.trim(), currency: saleCurrency, method: salePaymentMethod, paymentDate: new Date().toISOString().slice(0,10) }] : []
    if (payments.length && Number(salePaymentAmount) > Number(total)) { setMessage('El pago no puede superar el total de la venta.'); return }
    if (!payments.length && !saleCustomer) { setMessage('Una venta a crédito requiere seleccionar un cliente con crédito autorizado.'); return }
    setBusy(true); setMessage('')
    const result = await commercial.confirmSale({ idempotencyKey: crypto.randomUUID(), customerId: saleCustomer || null, warehouseId: saleWarehouse, currency: saleCurrency, lines: cart, payments, notes: saleNotes || null })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCart([]); setSaleNotes(''); setSalePaymentAmount(''); setMessage('Venta confirmada. Se registró el movimiento de inventario y los cobros informados.'); await load()
  }

  async function createSupplier(e: FormEvent) {
    e.preventDefault()
    if (!supplierName.trim()) { setMessage('El nombre del proveedor es obligatorio.'); return }
    setBusy(true); setMessage('')
    const result = await purchases.saveSupplier({ name: supplierName.trim(), taxId: supplierTaxId.trim() || null, phone: supplierPhone.trim() || null, active: true })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setSupplierName(''); setSupplierTaxId(''); setSupplierPhone('')
    setMessage('Proveedor guardado correctamente.')
    const refreshed = await purchases.listSuppliers()
    if (refreshed.ok) { setPurchaseSuppliers(refreshed.data as unknown as Row[]); await load() }
  }

  function addPurchaseLine(e: FormEvent) {
    e.preventDefault()
    const product = purchaseProducts.find(x => String(x.id) === purchaseProduct)
    const valid = (v: string) => /^\d{1,12}(?:\.\d{1,6})?$/.test(v) && Number(v) >= 0
    if (!product || !valid(purchaseQuantity) || Number(purchaseQuantity) <= 0 || !valid(purchaseUnitCost) || !valid(purchaseDiscount) || !valid(purchaseExpense)) {
      setMessage('Revisa producto, cantidad, costo, descuento y gastos.'); return
    }
    setPurchaseLines(current => [...current, { productId: String(product.id), description: String(product.name), quantity: purchaseQuantity, unitCost: purchaseUnitCost, discountAmount: purchaseDiscount, attributableExpenses: purchaseExpense }])
    setPurchaseProduct(''); setPurchaseQuantity('1'); setPurchaseUnitCost(''); setPurchaseDiscount('0'); setPurchaseExpense('0')
    setMessage('Producto agregado a la compra.')
  }

  async function createPurchase() {
    if (!purchaseSupplier || !purchaseDocument.trim() || !purchaseDate || !purchaseLines.length) { setMessage('Completa proveedor, documento, fecha y al menos un producto.'); return }
    setBusy(true); setMessage('')
    const result = await purchases.createPurchase({ supplierId: purchaseSupplier, documentNumber: purchaseDocument.trim(), documentDate: purchaseDate, currency: purchaseCurrency, notes: purchaseNotes || null, lines: purchaseLines.map(({ productId, description, quantity, unitCost, discountAmount, attributableExpenses }) => ({ productId, description, quantity, unitCost, discountAmount, attributableExpenses })) })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setPurchaseLines([]); setPurchaseDocument(''); setPurchaseNotes(''); setMessage('Compra creada en borrador. Debe aprobarse antes de recibir mercancía.'); await load()
  }

  async function openPurchase(id: string) {
    setBusy(true); setMessage('')
    const result = await purchases.getPurchase(id)
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setPurchaseDetail(result.data as unknown as Row)
  }

  async function approveSelectedPurchase() {
    if (!purchaseDetail?.id) return
    setBusy(true); setMessage('')
    const result = await purchases.approvePurchase(String(purchaseDetail.id))
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage('Compra aprobada. Ya puede recibirse en un depósito.'); await openPurchase(String(purchaseDetail.id)); await load()
  }

  async function receiveSelectedPurchase() {
    if (!purchaseDetail?.id || !receiptWarehouse) { setMessage('Selecciona un depósito para recibir.'); return }
    const lines = (Array.isArray(purchaseDetail.lines) ? purchaseDetail.lines as Row[] : []).map(line => ({
      purchaseLineId: String(line.id),
      quantityReceived: String(Math.max(0, Number(line.quantity ?? 0) - Number(line.received_quantity ?? line.receivedQuantity ?? 0))),
    })).filter(line => Number(line.quantityReceived) > 0)
    if (!lines.length) { setMessage('No hay cantidades pendientes por recibir.'); return }
    setBusy(true); setMessage('')
    const result = await purchases.receiveAndPost({ purchaseId: String(purchaseDetail.id), warehouseId: receiptWarehouse, idempotencyKey: crypto.randomUUID(), receivedAt: new Date().toISOString(), lines })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage('Recepción registrada: las cantidades recibidas entraron al inventario y se actualizó la cuenta por pagar.')
    await openPurchase(String(purchaseDetail.id)); await load()
  }

  async function registerSupplierPayment() {
    const payable = payableRows.find(row => String(row.id) === selectedPayable)
    if (!payable || !supplierPayAmount.trim() || !supplierPayMethod) { setMessage('Selecciona una cuenta por pagar, método e importe.'); return }
    setBusy(true); setMessage('')
    const result = await purchases.registerPayment({ payableId: String(payable.id), amount: supplierPayAmount.trim(), currency: String(payable.currency) as Currency, paymentDate: new Date().toISOString().slice(0, 10), method: supplierPayMethod, reference: supplierPayReference.trim() || null, idempotencyKey: crypto.randomUUID() })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setSupplierPayAmount(''); setSupplierPayReference(''); setMessage('Pago al proveedor registrado. Se generó el evento para su integración con caja.');
    const refreshed = await purchases.listPayables()
    if (refreshed.ok) setPayableRows(refreshed.data as unknown as Row[])
    await load()
  }

  const columns = useMemo(() => {
    const preferred: Record<Section, string[]> = {
      Inventario: ['sku','name','presentation','unit','quantity','average_cost_ves','minimum_stock','sale_price','active'],
      Clientes: ['name','identification_type','identification_number','tax_id','phone','email','credit_enabled','active'],
      Proveedores: ['name','tax_id','phone','email','active'],
      Compras: ['document_number','document_date','currency','status','total','created_at'],
      Ventas: ['sale_number','sale_date','currency','status','total','created_at'],
      Cotizaciones: ['quote_number','quote_date','currency','status','total','valid_until'],
      'Cuentas por cobrar': ['customer_name','currency','original_amount','balance','status','due_date'],
      'Cuentas por pagar': ['supplier_id','currency','original_amount','paidAmount','balance','status','created_at'],
      Reportes: [],
    }
    const keys = new Set(rows.flatMap((r) => Object.keys(r)))
    const selected = preferred[section].filter((k) => keys.has(k))
    return selected.length ? selected : [...keys].slice(0, 7)
  }, [rows, section])

  const visibleRows = useMemo(() => section === 'Inventario' && selectedCategory
    ? rows.filter((r) => String(r.category_id ?? '') === selectedCategory)
    : rows, [rows, section, selectedCategory])

  if (!ready) return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Cargando sesión segura…</main>

  if (!user) return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900"><div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-xs font-semibold tracking-[.2em] text-orange-600">PINTURAS JAM</p><h1 className="mt-2 text-2xl font-bold">Acceso al sistema</h1><p className="mt-2 text-sm text-slate-600">Inicia sesión con un usuario ya creado y autorizado en Supabase. No se crean usuarios ni permisos desde esta pantalla.</p><form onSubmit={signIn} className="mt-6 space-y-4"><label className="block text-sm font-medium">Correo<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="block text-sm font-medium">Contraseña<input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label><button disabled={busy} className="w-full rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? 'Ingresando…' : 'Iniciar sesión'}</button></form>{message && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}<p className="mt-6 text-xs text-slate-500">Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local. Nunca uses service_role en el navegador.</p><a className="mt-4 inline-block text-sm text-orange-700 underline" href="/">Volver al panel visual</a></div></main>

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 md:px-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-[.2em] text-orange-600">PINTURAS JAM · OPERACIONES</p><h1 className="mt-1 text-2xl font-bold">Centro de datos comerciales</h1><p className="mt-1 text-sm text-slate-600">Sesión: {user.email ?? user.id}</p></div><div className="flex gap-2"><button onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Actualizar</button><button onClick={() => void signOut()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Cerrar sesión</button></div></header>
    {notice && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}\n    <div className="mt-6 flex flex-wrap gap-2">{sections.map((s) => <button key={s} onClick={() => { setSection(s); setSearch(''); setSelectedCategory('') }} className={`rounded-full px-4 py-2 text-sm font-semibold ${section === s ? 'bg-orange-600 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>{s}</button>)}</div>
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{section}</h2><p className="text-sm text-slate-500">Datos leídos desde las tablas/RPC del proyecto Supabase autenticado.</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar ${section.toLowerCase()}…`} className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
    {section === 'Inventario' && <>
      <form onSubmit={createCategory} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
        <label className="min-w-0 flex-1 text-sm font-medium">Nueva categoría
          <input required maxLength={80} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Ej. Pinturas interiores" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50">Guardar categoría</button>
      </form>
      <form onSubmit={createProduct} className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-4">
        <label className="text-sm">Nombre del producto *<input required value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Código / SKU<input value={productSku} onChange={(e) => setProductSku(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Marca<input value={productBrand} onChange={(e) => setProductBrand(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Categoría<select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Sin categoría</option>{categories.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
        <label className="text-sm">Presentación<input value={productPresentation} onChange={(e) => setProductPresentation(e.target.value)} placeholder="Galón, cuñete…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Unidad<select value={productUnit} onChange={(e) => setProductUnit(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="unidad">Unidad</option><option value="galón">Galón</option><option value="cuñete">Cuñete</option><option value="litro">Litro</option><option value="kilogramo">Kilogramo</option></select></label>
        <label className="text-sm">Color<input value={productColor} onChange={(e) => setProductColor(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Precio de venta<input inputMode="decimal" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Ej. 12.50" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-4">Guardar producto en catálogo</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSelectedCategory('')} className="rounded-full border px-3 py-1 text-xs">Todas las categorías</button>{categories.map((c) => <button key={String(c.id)} onClick={() => setSelectedCategory(String(c.id))} className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-800">{String(c.name)}</button>)}</div>
    </>}
    {(section === 'Ventas' || section === 'Cotizaciones') && <div className="mt-5 space-y-4">
      <form onSubmit={addCartLine} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
        <label className="text-sm md:col-span-2">Producto<select required value={cartProduct} onChange={e => { setCartProduct(e.target.value); const p=saleProducts.find(x=>String(x.id)===e.target.value); setCartPrice(p ? String(p.sale_price ?? '') : '') }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar producto…</option>{saleProducts.map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.name)} · {String(p.sku ?? 'Sin código')}</option>)}</select></label>
        <label className="text-sm">Cantidad<input required inputMode="decimal" value={cartQuantity} onChange={e=>setCartQuantity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm">Precio unitario (VES)<input required inputMode="decimal" value={cartPrice} onChange={e=>setCartPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold md:col-span-4">Agregar producto</button>
      </form>
      {cart.length>0 && <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Producto</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Precio</th><th className="p-3 text-right">Importe</th><th className="p-3"></th></tr></thead><tbody>{cart.map((line,i)=><tr key={`${line.productId}-${i}`} className="border-t"><td className="p-3">{line.description}</td><td className="p-3 text-right">{line.quantity}</td><td className="p-3 text-right">{line.unitPrice}</td><td className="p-3 text-right">{calculateDocument([{quantity:line.quantity,unitPrice:line.unitPrice}]).total}</td><td className="p-3 text-center"><button type="button" onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))} className="text-red-700 underline">Quitar</button></td></tr>)}</tbody></table><div className="border-t bg-slate-50 p-4 text-right text-lg font-bold">Total: {documentTotal()} VES</div></div>}
      <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3">
        <label className="text-sm">Cliente<select value={saleCustomer} onChange={e=>setSaleCustomer(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Consumidor final</option>{customerRows.map(c=><option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
        <label className="text-sm">Moneda<select value={saleCurrency} onChange={e=>setSaleCurrency(e.target.value as Currency)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="VES">Bolívares (VES)</option><option value="USD" disabled>USD (requiere tasa BCV vinculada)</option></select></label>
        {section === 'Ventas' && <label className="text-sm">Depósito<select value={saleWarehouse} onChange={e=>setSaleWarehouse(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar depósito…</option>{warehouses.map(w=><option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>}
        <label className="text-sm md:col-span-3">Notas<input value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        {section === 'Ventas' && <><label className="text-sm">Método de pago<select value={salePaymentMethod} onChange={e=>setSalePaymentMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Venta a crédito / sin abono</option>{paymentMethods.map(m=><option key={String(m.id)} value={String(m.name)}>{String(m.name)}</option>)}</select></label><label className="text-sm">Monto recibido<input inputMode="decimal" placeholder={`Total ${documentTotal()}`} value={salePaymentAmount} onChange={e=>setSalePaymentAmount(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label></>}
      </div>
      <div className="flex flex-wrap gap-2">{section === 'Cotizaciones' ? <button onClick={saveQuote} disabled={busy || !cart.length} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Guardar cotización</button> : <button onClick={confirmSale} disabled={busy || !cart.length} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Confirmar venta y descontar inventario</button>}<button type="button" onClick={()=>setCart([])} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold">Vaciar operación</button></div>
      <p className="text-xs text-slate-500">Los documentos se guardan en Supabase. La venta confirmada valida existencias y registra la salida de inventario en una transacción. Los descuentos y la emisión fiscal requieren sus permisos y configuración correspondientes.</p>
    </div>}
    {section === 'Proveedores' && <form onSubmit={createSupplier} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"><label className="text-sm">Razón social / nombre *<input required value={supplierName} onChange={e=>setSupplierName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">RIF / identificación<input value={supplierTaxId} onChange={e=>setSupplierTaxId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Teléfono<input value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><button disabled={busy} className="self-end rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Guardar proveedor</button></form>}
    {section === 'Compras' && <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Registrar compra / orden de mercancía</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><label className="text-sm">Proveedor<select value={purchaseSupplier} onChange={e=>setPurchaseSupplier(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{purchaseSuppliers.map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.name)}</option>)}</select></label><label className="text-sm">N.º documento<input value={purchaseDocument} onChange={e=>setPurchaseDocument(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Fecha<input type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Moneda<select value={purchaseCurrency} onChange={e=>setPurchaseCurrency(e.target.value as Currency)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="VES">VES</option><option value="USD">USD</option></select></label></div>
      <form onSubmit={addPurchaseLine} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-6"><label className="text-sm md:col-span-2">Producto<select required value={purchaseProduct} onChange={e=>setPurchaseProduct(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{purchaseProducts.map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.name)} · {String(x.sku ?? 'Sin código')}</option>)}</select></label><label className="text-sm">Cantidad<input value={purchaseQuantity} onChange={e=>setPurchaseQuantity(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Costo unitario<input value={purchaseUnitCost} onChange={e=>setPurchaseUnitCost(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Descuento total<input value={purchaseDiscount} onChange={e=>setPurchaseDiscount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Gastos atribuibles<input value={purchaseExpense} onChange={e=>setPurchaseExpense(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><button className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold md:col-span-6">Agregar línea</button></form>
      {purchaseLines.length>0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Producto</th><th className="p-2">Cantidad</th><th className="p-2">Costo</th><th className="p-2">Descuento</th><th className="p-2">Gastos</th><th></th></tr></thead><tbody>{purchaseLines.map((line,i)=><tr key={`${line.productId}-${i}`} className="border-b"><td className="p-2">{line.description}</td><td className="p-2">{line.quantity}</td><td className="p-2">{line.unitCost}</td><td className="p-2">{line.discountAmount}</td><td className="p-2">{line.attributableExpenses}</td><td><button type="button" onClick={()=>setPurchaseLines(current=>current.filter((_,j)=>j!==i))} className="text-red-700 underline">Quitar</button></td></tr>)}</tbody></table></div>}
      <label className="block text-sm">Notas<input value={purchaseNotes} onChange={e=>setPurchaseNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={createPurchase} disabled={busy || !purchaseLines.length} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Crear compra en borrador</button></div>
      {purchaseDetail && <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Detalle de compra {String(purchaseDetail.document_number ?? purchaseDetail.documentNumber ?? '')}</h3><p className="text-sm text-slate-600">Estado: {String(purchaseDetail.status)} · Total: {String(purchaseDetail.total)} {String(purchaseDetail.currency)}</p></div><button onClick={()=>setPurchaseDetail(null)} className="text-sm underline">Cerrar detalle</button></div><div className="mt-3 space-y-1 text-sm">{(Array.isArray(purchaseDetail.lines)?purchaseDetail.lines as Row[]:[]).map(line=><p key={String(line.id)}>{String(line.description ?? line.product_id)} — pedido {String(line.quantity)} — recibido {String(line.received_quantity ?? 0)}</p>)}</div><div className="mt-4 flex flex-wrap items-end gap-3">{purchaseDetail.status === 'draft' && <button onClick={approveSelectedPurchase} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Aprobar compra</button>}{['approved','partially_received'].includes(String(purchaseDetail.status)) && <><label className="text-sm">Recibir en depósito<select value={receiptWarehouse} onChange={e=>setReceiptWarehouse(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{purchaseWarehouses.map(w=><option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label><button onClick={receiveSelectedPurchase} disabled={busy || !receiptWarehouse} className="rounded-lg bg-orange-600 px-4 py-2 text-white">Recibir cantidades pendientes y actualizar stock</button></>}</div></div>}
      <p className="text-xs text-slate-500">La compra se crea como borrador. Tras aprobarla, la recepción registra entradas de inventario y la cuenta por pagar dentro de una transacción; en compras USD se exige una tasa BCV previamente registrada para la fecha del documento.</p>
    </div>}
    {section === 'Cuentas por pagar' && <div className="mt-5 rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Registrar pago a proveedor</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><label className="text-sm md:col-span-2">Cuenta pendiente<select value={selectedPayable} onChange={e=>{setSelectedPayable(e.target.value);setSupplierPayAmount('')}} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar cuenta…</option>{payableRows.filter(x=>String(x.status)!=='paid').map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.supplier_id)} · {String(x.balance ?? x.original_amount)} {String(x.currency)} · {String(x.status)}</option>)}</select></label><label className="text-sm">Importe<input value={supplierPayAmount} onChange={e=>setSupplierPayAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Método<select value={supplierPayMethod} onChange={e=>setSupplierPayMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{supplierPaymentMethods.map(m=><option key={String(m.id)} value={String(m.name)}>{String(m.name)}</option>)}</select></label><label className="text-sm md:col-span-3">Referencia<input value={supplierPayReference} onChange={e=>setSupplierPayReference(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={registerSupplierPayment} disabled={busy || !selectedPayable} className="self-end rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Registrar pago</button></div><p className="mt-3 text-xs text-slate-500">El pago respeta moneda, saldo y método autorizado. En cuentas USD, la base exige tasa BCV para la fecha del pago. El movimiento de caja queda en cola para el consumidor de Chat 4.</p></div>}
    {section === 'Reportes' && <div className="mt-5 space-y-5"><div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-4"><label className="text-sm">Desde<input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Hasta<input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={()=>void load()} disabled={busy || reportFrom>reportTo} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Generar reporte</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Ventas registradas',value:String(reportSales.length)},{label:'Compras registradas',value:String(reportPurchases.length)},{label:'Cuentas por cobrar',value:String(reportReceivables.length)},{label:'Cuentas por pagar',value:String(reportPayables.length)}].map(x=><div key={x.label} className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{x.label}</p><p className="mt-2 text-3xl font-bold">{x.value}</p></div>)}</div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Eventos comerciales pendientes de sincronizar: {reportCashPending}.</strong><p className="mt-1">Son cobros y pagos aún no importados a un turno de caja de la misma moneda. Abre caja y ejecuta la sincronización para incorporarlos al arqueo.</p></div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Ventas del período</h2><p className="mt-1 text-xs text-slate-500">Listado real desde Supabase; importes separados por moneda.</p><div className="mt-3 space-y-2">{reportSales.length?reportSales.map((r,i)=><div key={String(r.id??i)} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"><span>{String(r.sale_number??r.id??'Venta')} · {String(r.sale_date??'')}</span><strong>{String(r.total??'—')} {String(r.currency??'')}</strong></div>):<p className="text-sm text-slate-500">Sin ventas en el período.</p>}</div></div><div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Compras del período</h2><p className="mt-1 text-xs text-slate-500">Listado real desde Supabase; importes separados por moneda.</p><div className="mt-3 space-y-2">{reportPurchases.length?reportPurchases.map((r,i)=><div key={String(r.id??i)} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"><span>{String(r.document_number??r.id??'Compra')} · {String(r.document_date??'')}</span><strong>{String(r.total??'—')} {String(r.currency??'')}</strong></div>):<p className="text-sm text-slate-500">Sin compras en el período.</p>}</div></div></div></div>}
    {section === 'Clientes' && <form onSubmit={createCustomer} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4"><label className="text-sm">Nombre *<input required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Documento<input value={customerDocument} onChange={(e) => setCustomerDocument(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Teléfono<input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><button disabled={busy} className="self-end rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Guardar cliente</button></form>}
    {message && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    <div className="mt-5 overflow-x-auto">{busy ? <p className="p-8 text-center text-sm text-slate-500">Consultando…</p> : visibleRows.length === 0 ? <div className="p-10 text-center"><p className="font-semibold">No hay registros para mostrar</p><p className="mt-1 text-sm text-slate-500">Puede que aún no existan datos, que falte aplicar la migración correspondiente o que tu usuario no tenga acceso al negocio.</p></div> : <table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr>{columns.map((c) => <th key={c} className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">{c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{visibleRows.map((r,i) => <tr key={String(r.id ?? i)} onClick={section === 'Compras' ? () => void openPurchase(String(r.id)) : undefined} className={`odd:bg-slate-50 ${section === 'Compras' ? 'cursor-pointer hover:bg-orange-50' : ''}`}>{columns.map((c) => <td key={c} className="max-w-xs border-b border-slate-100 px-3 py-3 text-slate-700">{c === 'category_id' ? String(categories.find((cat) => String(cat.id) === String(r[c]))?.name ?? 'Sin categoría') : pretty(r[c])}</td>)}</tr>)}</tbody></table>}</div>
    </section><p className="mt-4 text-xs text-slate-500">Reportes consultan ventas, compras y saldos directamente desde Supabase. Ventas y cotizaciones cuentan con formularios conectados a los RPC comerciales; la confirmación de venta descuenta inventario de forma transaccional. Caja y cierres cuentan con su módulo transaccional; la factura fiscal requiere emisor autorizado y validación legal.</p><div className="mt-4 flex flex-wrap gap-4"><a href="/caja" className="inline-block text-sm font-semibold text-orange-700 underline">Abrir caja y cierres</a><a href="/administracion" className="inline-block text-sm font-semibold text-orange-700 underline">Administración y auditoría</a><a href="/" className="inline-block text-sm text-orange-700 underline">Volver al panel visual</a></div></div></main>
}
