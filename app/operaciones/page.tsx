'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CommercialService } from '@/lib/modules/commercial'
import { CatalogService, InventoryService } from '@/lib/modules/inventory/supabase'
import type { MovementInput, ProductInput } from '@/lib/modules/inventory/types'
import { calculateDocument } from '@/lib/modules/commercial/calculations'
import type { CommercialLineInput, Currency } from '@/lib/modules/commercial/types'
import { PurchasesService } from '@/lib/modules/purchases'
import type { User } from '@supabase/supabase-js'

type Section = 'Inventario' | 'Compras' | 'Cotizaciones' | 'Cuentas' | 'Resumen del negocio'
type Row = Record<string, unknown>
const sections: Section[] = ['Inventario', 'Compras', 'Cotizaciones', 'Cuentas', 'Resumen del negocio']
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Ocurrió un error inesperado.'
const pretty = (v: unknown) => v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)

export default function OperationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [section, setSection] = useState<Section>('Inventario')
  const [accountView, setAccountView] = useState<'receivable' | 'payable'>('receivable')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [categories, setCategories] = useState<Row[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Row | null>(null)
  const [productName, setProductName] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productPresentation, setProductPresentation] = useState('')
  const [productUnit, setProductUnit] = useState('unidad')
  const [productColor, setProductColor] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [inventoryWarehouses, setInventoryWarehouses] = useState<Row[]>([])
  const [minimumWarehouse, setMinimumWarehouse] = useState('')
  const [minimumProduct, setMinimumProduct] = useState('')
  const [minimumValue, setMinimumValue] = useState('0')
  const [inventoryView, setInventoryView] = useState<'products' | 'categories' | 'minimum' | 'movements' | 'alerts'>('products')
  const [movementRows, setMovementRows] = useState<Row[]>([])
  const [movementType, setMovementType] = useState<'entry' | 'exit' | 'adjustment'>('entry')
  const [movementProduct, setMovementProduct] = useState('')
  const [movementWarehouse, setMovementWarehouse] = useState('')
  const [movementQuantity, setMovementQuantity] = useState('1')
  const [movementDelta, setMovementDelta] = useState('')
  const [movementReason, setMovementReason] = useState('')
  const [saleProducts, setSaleProducts] = useState<Row[]>([])
  const [warehouses, setWarehouses] = useState<Row[]>([])
  const [paymentMethods, setPaymentMethods] = useState<Row[]>([])
  const [saleWarehouse, setSaleWarehouse] = useState('')
  const [saleCustomer, setSaleCustomer] = useState('')
  const [saleCurrency, setSaleCurrency] = useState<Currency>('USD')
  const [saleNotes, setSaleNotes] = useState('')
  const [cartProduct, setCartProduct] = useState('')
  const [cartQuantity, setCartQuantity] = useState('1')
  const [cartPrice, setCartPrice] = useState('')
  const [cart, setCart] = useState<CommercialLineInput[]>([])
  const [customerRows, setCustomerRows] = useState<Row[]>([])
  const [purchaseSuppliers, setPurchaseSuppliers] = useState<Row[]>([])
  const [purchaseProducts, setPurchaseProducts] = useState<Row[]>([])
  const [purchaseWarehouses, setPurchaseWarehouses] = useState<Row[]>([])
  const [purchaseSupplier, setPurchaseSupplier] = useState('')
  const [purchaseDocument, setPurchaseDocument] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
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
  const [selectedReceivable, setSelectedReceivable] = useState('')
  const [customerPayAmount, setCustomerPayAmount] = useState('')
  const [customerPayMethod, setCustomerPayMethod] = useState('')
  const [customerPayReference, setCustomerPayReference] = useState('')
  const [bcvRate, setBcvRate] = useState<number | null>(null)
  const [bcvRateId, setBcvRateId] = useState('')
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
    catalog.listCategories(true).then((result) => {
      if (mounted && result.ok) setCategories(result.data as Row[])
    })
    return () => { mounted = false }
  }, [user, catalog])

  useEffect(() => {
    if (!user || (section !== 'Compras' && section !== 'Cuentas')) return
    let mounted = true
    Promise.all([purchases.listSuppliers(), catalog.listProducts(), inventory.warehouses(), purchases.listPayables(), commercial.listPaymentMethods(), commercial.listReceivables(), commercial.listCustomers()]).then(([suppliers, products, stockrooms, payables, methods, receivables, customers]) => {
      if (!mounted) return
      if (suppliers.ok) { setPurchaseSuppliers(suppliers.data as unknown as Row[]); if (!purchaseSupplier && suppliers.data[0]) setPurchaseSupplier(String((suppliers.data[0] as unknown as Row).id)) }
      if (products.ok) setPurchaseProducts(products.data as Row[])
      if (stockrooms.ok) { setPurchaseWarehouses(stockrooms.data as Row[]); if (!receiptWarehouse && stockrooms.data[0]) setReceiptWarehouse(String((stockrooms.data[0] as Row).id)) }
      if (payables.ok) { setPayableRows(payables.data as unknown as Row[]); if (!selectedPayable && payables.data[0]) setSelectedPayable(String((payables.data[0] as unknown as Row).id)) }
      if (methods.ok) { const activeMethods = (methods.data as Row[]).filter(x => x.active !== false); setPaymentMethods(activeMethods); setSupplierPaymentMethods(activeMethods); if (!supplierPayMethod && activeMethods[0]) setSupplierPayMethod(String(activeMethods[0].name)); if (!customerPayMethod && activeMethods[0]) setCustomerPayMethod(String(activeMethods[0].name)) }
      if (receivables.ok) { const items = receivables.data as Row[]; setReportReceivables(items); if (!selectedReceivable && items[0]) setSelectedReceivable(String(items[0].id)) }
      if (customers.ok) setCustomerRows(customers.data as Row[])
    }).catch(e => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, purchases, catalog, inventory, commercial])

  useEffect(() => {
    if (!user || section !== 'Inventario') return
    let mounted = true
    purchases.getExchangeRate(new Date().toISOString().slice(0,10)).then(rate => { if (mounted && rate.ok) { setBcvRate(Number(rate.data.rate)); setBcvRateId(String(rate.data.id)) } })
    inventory.warehouses().then((result) => {
      if (!mounted) return
      if (result.ok) {
        const list = result.data as Row[]
        setInventoryWarehouses(list)
        if (!minimumWarehouse && list[0]) setMinimumWarehouse(String(list[0].id))
      } else setMessage(result.error.message)
    }).catch((e: unknown) => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, inventory, purchases])

  useEffect(() => {
    if (!user || section !== 'Inventario' || inventoryView !== 'movements') return
    let mounted = true
    inventory.movements(undefined, 200).then((result) => {
      if (!mounted) return
      if (result.ok) setMovementRows(result.data as Row[])
      else setMessage(result.error.message)
    }).catch((e: unknown) => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, inventoryView, inventory])

  useEffect(() => {
    if (!user || section !== 'Cotizaciones') return
    let mounted = true
    Promise.all([catalog.listProducts(), inventory.warehouses(), commercial.listCustomers(), commercial.listPaymentMethods()]).then(async ([p, w, c, m]) => {
      if (!mounted) return
      if (p.ok) setSaleProducts(p.data as Row[])
      if (w.ok) { setWarehouses(w.data as Row[]); if (!saleWarehouse && w.data[0]) setSaleWarehouse(String((w.data[0] as Row).id)) }
      if (c.ok) setCustomerRows(c.data as Row[])
      if (m.ok) setPaymentMethods((m.data as Row[]).filter(x => x.active !== false))
      const rate = await purchases.getExchangeRate(new Date().toISOString().slice(0,10));
      if (rate.ok) { setBcvRate(Number(rate.data.rate)); setBcvRateId(String(rate.data.id)) }
    }).catch(e => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, catalog, inventory, commercial, purchases])

  const load = useCallback(async () => {
    if (!user) return
    setBusy(true); setMessage('')
    try {
      if (section === 'Resumen del negocio') {
        const [sales, buys, recv, pay, events] = await Promise.all([commercial.listSales(reportFrom, reportTo), purchases.listPurchases({ from: reportFrom, to: reportTo }), commercial.listReceivables(), purchases.listPayables(), commercial.listCashEventsPending(500)])
        if (!sales.ok) throw new Error(sales.error.message)
        if (!buys.ok) throw new Error(buys.error.message)
        if (!recv.ok) throw new Error(recv.error.message)
        if (!pay.ok) throw new Error(pay.error.message)
        if (!events.ok) throw new Error(events.error.message)
        setReportSales(sales.data as Row[]); setReportPurchases(buys.data as unknown as Row[]); setReportReceivables(recv.data as Row[]); setReportPayables(pay.data as unknown as Row[]); setReportCashPending((events.data as Row[]).length)
        setRows([]); return
      }
      if (section === 'Cuentas') {
        const [receivables, payables] = await Promise.all([commercial.listReceivables(), purchases.listPayables()])
        if (!receivables.ok) throw new Error(receivables.error.message)
        if (!payables.ok) throw new Error(payables.error.message)
        setReportReceivables(receivables.data as Row[]); setPayableRows(payables.data as unknown as Row[])
        setRows((accountView === 'receivable' ? receivables.data : payables.data) as Row[])
        return
      }
      let result
      if (section === 'Inventario') {
        const [products, stock] = await Promise.all([catalog.listProducts(search, true), inventory.stock(search)])
        if (!products.ok) throw new Error(products.error.message)
        if (!stock.ok) throw new Error(stock.error.message)
        const stockByProduct = new Map<string, Row>()
        for (const item of stock.data as Row[]) {
          const id = String(item.product_id ?? item.productId)
          const current = stockByProduct.get(id) ?? { quantity: 0, minimum_stock: 0, warehouse_count: 0 }
          current.quantity = Number(current.quantity ?? 0) + Number(item.quantity ?? 0)
          current.value_ves = Number(current.value_ves ?? 0) + Number(item.quantity ?? 0) * Number(item.average_cost_ves ?? 0)
          current.minimum_stock = Number(current.minimum_stock ?? 0) + Number(item.minimum_stock ?? 0)
          current.warehouse_count = Number(current.warehouse_count ?? 0) + 1
          stockByProduct.set(id, current)
        }
        setRows((products.data as Row[]).map((p) => ({ ...p, ...(stockByProduct.get(String(p.id)) ?? { quantity: 0, minimum_stock: 0, warehouse_count: 0, value_ves: 0 }) })))
      } else {
        switch (section) {
          case 'Compras': result = await purchases.listPurchases({}); break
          case 'Cotizaciones': result = await commercial.listQuotes(); break
        }
        if (!result) throw new Error('No se pudo preparar la consulta.')
        if (!result.ok) throw new Error(result.error.message)
        setRows(Array.isArray(result.data) ? result.data as Row[] : result.data ? [result.data as Row] : [])
      }
    } catch (e) { setRows([]); setMessage(errorText(e)) }
    finally { setBusy(false) }
  }, [user, section, search, catalog, inventory, commercial, purchases, reportFrom, reportTo, accountView])

  useEffect(() => { void load() }, [load])

  async function signIn(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setMessage(error.message)
    else setPassword('')
  }

  async function signOut() { await db.auth.signOut(); setRows([]); setMessage('Sesión cerrada.') }

  async function createCategory(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true); setMessage('')
    const result = await catalog.saveCategory(categoryName, { userId: user.id }, editingCategoryId || undefined)
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCategoryName(''); setEditingCategoryId('')
    const refreshed = await catalog.listCategories(true)
    if (refreshed.ok) setCategories(refreshed.data as Row[])
    setMessage('Categoría guardada correctamente.')
  }

  async function saveMinimumStock(e: FormEvent) {
    e.preventDefault()
    if (!user || !minimumProduct || !minimumWarehouse) {
      setMessage('Selecciona un producto y un depósito para configurar su stock mínimo.')
      return
    }
    setBusy(true); setMessage('')
    const result = await inventory.setMinimumStock(minimumProduct, minimumWarehouse, minimumValue, { userId: user.id })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage('Stock mínimo actualizado correctamente.')
    await load()
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    const input: ProductInput = {
      ...(editingProduct?.id ? { id: String(editingProduct.id) } : {}),
      name: productName.trim(),
      sku: null,
      brand: null,
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
    setProductName(''); setProductPresentation(''); setProductCategory(''); setProductUnit('unidad')
    setProductColor(''); setProductPrice(''); setEditingProduct(null)
    setMessage('Producto guardado correctamente.')
    await load()
  }

  async function saveInventoryMovement(e: FormEvent) {
    e.preventDefault()
    if (!user || !movementProduct || !movementWarehouse) {
      setMessage('Selecciona el producto y el depósito.')
      return
    }
    const input: MovementInput = {
      productId: movementProduct,
      warehouseId: movementWarehouse,
      type: movementType,
      quantity: movementQuantity,
      ...(movementType === 'adjustment' ? { quantityDelta: movementDelta } : {}),
      reason: movementReason.trim() || undefined,
      idempotencyKey: crypto.randomUUID(),
    }
    setBusy(true); setMessage('')
    const result = await inventory.recordMovement(input, { userId: user.id })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMovementQuantity('1'); setMovementDelta(''); setMovementReason('')
    setMessage('Movimiento de inventario registrado correctamente.')
    const [history] = await Promise.all([inventory.movements(undefined, 200), load()])
    if (history.ok) setMovementRows(history.data as Row[])
  }

  function beginEditProduct(product: Row) {
    setEditingProduct(product)
    setProductName(String(product.name ?? ''))
    setProductCategory(String(product.category_id ?? ''))
    setProductPresentation(String(product.presentation ?? ''))
    setProductUnit(String(product.unit ?? 'unidad'))
    setProductColor(String(product.color ?? ''))
    setProductPrice(String(product.sale_price ?? ''))
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function toggleProductActive(product: Row) {
    if (!user) return
    const active = product.active !== false
    const prompt = active
      ? '¿Desactivar este producto? Se conservarán sus documentos y movimientos históricos. No podrá desactivarse si tiene existencias.'
      : '¿Reactivar este producto?'
    if (!window.confirm(prompt)) return
    setBusy(true); setMessage('')
    const result = await catalog.setProductActive(String(product.id), !active, { userId: user.id })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage(active ? 'Producto desactivado; el historial se conservó.' : 'Producto reactivado.')
    await load()
  }

  async function toggleCategoryActive(category: Row) {
    if (!user) return
    const active = category.active !== false
    if (!window.confirm(active
      ? '¿Desactivar esta categoría? Primero reasigna o desactiva sus productos activos.'
      : '¿Reactivar esta categoría?')) return
    setBusy(true); setMessage('')
    const result = await catalog.setCategoryActive(String(category.id), !active, { userId: user.id })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    const refreshed = await catalog.listCategories(true)
    if (refreshed.ok) setCategories(refreshed.data as Row[])
    setMessage(active ? 'Categoría desactivada.' : 'Categoría reactivada.')
  }

  async function confirmQuote(quote: Row) {
    const quoteCustomer = String(quote.customer_id ?? quote.customerId ?? '')
    if (!quoteCustomer) { setMessage('Esta cotización necesita un cliente para crear su cuenta por cobrar. Vuelve a crearla indicando el cliente.'); return }
    if (!saleWarehouse) { setMessage('No hay un depósito activo para registrar la salida de mercancía.'); return }
    const lines = (Array.isArray(quote.lines) ? quote.lines as Row[] : []).map(line => ({ productId: String(line.product_id ?? line.productId), description: String(line.description ?? ''), quantity: String(line.quantity), unitPrice: String(line.unit_price ?? line.unitPrice), discountAmount: String(line.discount_amount ?? line.discountAmount ?? 0) }))
    if (!lines.length) { setMessage('La cotización no tiene productos para confirmar.'); return }
    if (String(quote.currency) === 'USD' && (!bcvRate || !bcvRateId)) { setMessage('Para confirmar una cotización en USD se necesita la tasa BCV del día.'); return }
    setBusy(true); setMessage('')
    const result = await commercial.confirmSale({ idempotencyKey: `quote:${String(quote.id)}`, quoteId: String(quote.id), customerId: quoteCustomer, warehouseId: saleWarehouse, currency: String(quote.currency) as Currency, ...(String(quote.currency) === 'USD' ? { exchangeRate: String(bcvRate), exchangeRateId: bcvRateId } : {}), lines, payments: [], notes: String(quote.notes ?? '') || null })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setMessage('Operación confirmada: se descontó el inventario y se creó la cuenta por cobrar. Los pagos se registran desde Cuentas.')
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
    if (!saleCustomer) { setMessage('Selecciona el cliente de la cotización.'); return }
    if (!cart.length) { setMessage('Agrega productos antes de guardar la cotización.'); return }
    setBusy(true); setMessage('')
    const result = await commercial.saveQuote({ customerId: saleCustomer || null, currency: saleCurrency, lines: cart, notes: saleNotes || null })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCart([]); setSaleNotes(''); setMessage('Cotización guardada correctamente.'); await load()
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
    const documentNumber = purchaseDocument.trim() || `COMP-${Date.now()}`
    if (!purchaseSupplier || !purchaseDate || !purchaseLines.length) { setMessage('Selecciona proveedor y agrega al menos un producto.'); return }
    setBusy(true); setMessage('')
    const result = await purchases.createPurchase({ supplierId: purchaseSupplier, documentNumber, documentDate: purchaseDate, currency: 'USD', notes: purchaseNotes || null, lines: purchaseLines.map(({ productId, description, quantity, unitCost, discountAmount, attributableExpenses }) => ({ productId, description, quantity, unitCost, discountAmount, attributableExpenses })) })
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

  async function registerCustomerPayment() {
    const receivable = reportReceivables.find(row => String(row.id) === selectedReceivable)
    if (!receivable || !customerPayAmount.trim() || !customerPayMethod) { setMessage('Selecciona una cuenta, método e importe.'); return }
    setBusy(true); setMessage('')
    const result = await commercial.registerCustomerPayment({ receivableId: String(receivable.id), amount: customerPayAmount.trim(), currency: String(receivable.currency) as Currency, paymentDate: new Date().toISOString().slice(0,10), method: customerPayMethod, reference: customerPayReference.trim() || null, idempotencyKey: crypto.randomUUID() })
    setBusy(false)
    if (!result.ok) { setMessage(result.error.message); return }
    setCustomerPayAmount(''); setCustomerPayReference(''); setMessage('Abono registrado. La cuenta y el movimiento pendiente de caja se actualizaron automáticamente.')
    const refreshed = await commercial.listReceivables()
    if (refreshed.ok) setReportReceivables(refreshed.data as Row[])
    await load()
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
    if (section === 'Cuentas') return (accountView === 'receivable' ? ['customer_id','currency','original_amount','paidAmount','balance','status','due_date'] : ['supplier_id','currency','original_amount','paidAmount','balance','status','created_at']).filter(k => keys.has(k))
    const preferred: Record<Section, string[]> = {
      Inventario: ['name','category_id','presentation','color','sale_price','quantity','minimum_stock','stock_status','inventory_value','actions'],
      Compras: ['document_number','document_date','currency','status','total','created_at'],
      Cotizaciones: ['quote_number','quote_date','currency','status','total','valid_until','actions'],
      Cuentas: [],
      'Resumen del negocio': [],
    }
    const keys = new Set(rows.flatMap((r) => Object.keys(r)))
    const selected = preferred[section].filter((k) => k === 'stock_status' || k === 'actions' || keys.has(k))
    return selected.length ? selected : [...keys].slice(0, 7)
  }, [rows, section, accountView])

  const inventoryRows = useMemo(() => rows.filter((r) => showInactive || r.active !== false), [rows, showInactive])
  const inventoryStats = useMemo(() => ({ total: inventoryRows.length, units: inventoryRows.reduce((sum, r) => sum + Number(r.quantity ?? 0), 0), valueUsd: bcvRate && bcvRate > 0 ? inventoryRows.reduce((sum, r) => sum + Number(r.value_ves ?? 0), 0) / bcvRate : null, low: inventoryRows.filter((r) => r.active !== false && Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) > 0 && Number(r.quantity ?? 0) <= Number(r.minimum_stock ?? 0)).length, out: inventoryRows.filter((r) => r.active !== false && Number(r.quantity ?? 0) <= 0).length }), [inventoryRows, bcvRate])

  const topSellingProducts = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number }>()
    for (const sale of reportSales) for (const line of (Array.isArray(sale.lines) ? sale.lines as Row[] : [])) {
      const key = String(line.product_id ?? line.description ?? 'Producto')
      const current = totals.get(key) ?? { name: String(line.description ?? 'Producto'), quantity: 0 }
      current.quantity += Number(line.quantity ?? 0)
      totals.set(key, current)
    }
    return [...totals.values()].sort((a,b) => b.quantity - a.quantity).slice(0,5)
  }, [reportSales])
  const sumCurrency = (items: Row[], field: string, currency: string) => items.filter(x => String(x.currency ?? '') === currency).reduce((sum,x) => sum + Number(x[field] ?? 0),0)

  const visibleRows = useMemo(() => section === 'Inventario' && selectedCategory
    ? inventoryRows.filter((r) => String(r.category_id ?? '') === selectedCategory)
    : section === 'Inventario' && inventoryView === 'alerts' ? inventoryRows.filter((r) => r.active !== false && (Number(r.quantity ?? 0) <= 0 || (Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) <= Number(r.minimum_stock ?? 0))))
    : section === 'Inventario' ? inventoryRows : rows, [rows, section, selectedCategory, inventoryRows, inventoryView])

  if (!ready) return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Cargando sesión segura…</main>

  if (!user) return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <Image src="/pinturas-jam-logo.jpg" alt="Pinturas JAM" width={56} height={56} className="h-14 w-14 rounded-full object-contain" priority />
          <div><p className="text-lg font-bold tracking-tight text-[#172b4d]">Pinturas JAM</p><p className="text-xs text-slate-500">Sistema de gestión</p></div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Ingresa con tu usuario autorizado para continuar.</p>
        <form onSubmit={signIn} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Correo electrónico
            <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#244477] focus:ring-2 focus:ring-blue-100" type="email" autoComplete="username" placeholder="nombre@empresa.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Contraseña
            <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#244477] focus:ring-2 focus:ring-blue-100" type="password" autoComplete="current-password" placeholder="Tu contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button disabled={busy} className="flex w-full items-center justify-center rounded-lg bg-[#172b4d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#213d67] disabled:opacity-60">{busy ? 'Verificando…' : 'Entrar al sistema'}</button>
        </form>
        {message && <p role="alert" className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">{message}</p>}
        <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">Acceso protegido. Solo pueden ingresar usuarios previamente autorizados.</p>
      </section>
    </main>
  )

  return <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
    <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col md:flex-row">
      <aside className="w-full shrink-0 bg-[#172b4d] px-4 py-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:px-5 md:py-6">
        <div className="flex items-center gap-3 px-2 pb-4 md:pb-8">
          <Image src="/pinturas-jam-logo.jpg" alt="" width={42} height={42} className="h-10 w-10 rounded-full bg-white object-contain" />
          <div><p className="text-base font-bold">Pinturas JAM</p><p className="mt-0.5 text-[11px] text-blue-200">Gestión comercial</p></div>
        </div>
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-blue-200">Menú principal</p>
        <nav aria-label="Navegación principal" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {sections.map((item) => <button key={item} type="button" onClick={() => { setSection(item); setSearch(''); setSelectedCategory('') }} aria-current={section === item ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition md:w-full ${section === item ? 'bg-white text-[#172b4d]' : 'text-blue-100 hover:bg-white/10'}`}>{item}</button>)}
        </nav>
        <div className="mt-6 hidden border-t border-white/10 px-2 pt-4 text-xs text-blue-200 md:block">Pinturas JAM · Sistema interno</div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 md:px-8">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pinturas JAM</p><h1 className="mt-0.5 text-xl font-bold text-[#172b4d] sm:text-2xl">{section}</h1></div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-xs text-slate-500 sm:block">{user.email ?? user.id}</span>
            <button onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Actualizar</button>
            <button onClick={() => void signOut()} className="rounded-lg bg-[#172b4d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#213d67]">Salir</button>
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8">
      {notice && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-end gap-3">{(section !== 'Inventario' || inventoryView === 'products' || inventoryView === 'alerts') && <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar ${section.toLowerCase()}…`} aria-label={`Buscar ${section.toLowerCase()}`} className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#244477] focus:ring-2 focus:ring-blue-100" />}</div>
     {section === 'Inventario' && ['products', 'alerts'].includes(inventoryView) && <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
       <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Total de productos</p><p className="mt-2 text-2xl font-bold">{inventoryStats.total}</p><p className="mt-1 text-[11px] text-slate-400">Productos registrados</p></div>
       <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Unidades disponibles</p><p className="mt-2 text-2xl font-bold">{inventoryStats.units.toLocaleString('es-VE')}</p><p className="mt-1 text-[11px] text-slate-400">Existencia total</p></div>
       <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"><p className="text-xs text-amber-800">Stock bajo</p><p className="mt-2 text-2xl font-bold text-amber-700">{inventoryStats.low}</p><p className="mt-1 text-[11px] text-amber-700">En el mínimo o por debajo</p></div>
       <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm"><p className="text-xs text-red-800">Agotados</p><p className="mt-2 text-2xl font-bold text-red-700">{inventoryStats.out}</p><p className="mt-1 text-[11px] text-red-700">Sin existencias</p></div>
       <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Valor de mercancía</p><p className="mt-2 text-2xl font-bold">{inventoryStats.valueUsd === null ? '—' : `${inventoryStats.valueUsd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`}</p><p className="mt-1 text-[11px] text-slate-400">Costo promedio convertido a USD</p></div>
     </div>}
    {section === 'Inventario' && <nav aria-label="Apartados de inventario" className="mb-5 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
      {([{id:'products',label:'Productos'},{id:'categories',label:'Categorías'},{id:'minimum',label:'Stock mínimo'},{id:'movements',label:'Movimientos'},{id:'alerts',label:'Alertas'}] as const).map((tab) => <button key={tab.id} type="button" onClick={() => { setInventoryView(tab.id); setSelectedCategory('') }} aria-current={inventoryView === tab.id ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${inventoryView === tab.id ? 'bg-[#172b4d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tab.label}</button>)}
    </nav>}
    {section === 'Inventario' && ['products', 'categories', 'minimum'].includes(inventoryView) && <>
      {inventoryView === 'minimum' && <div className="max-w-3xl"><form onSubmit={saveMinimumStock} className="mt-5 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 md:grid-cols-4">
         <div className="md:col-span-4"><h3 className="font-semibold text-slate-800">Configurar stock mínimo</h3><p className="mt-1 text-xs text-slate-600">Se mostrará una alerta cuando la existencia llegue al mínimo o quede por debajo.</p></div>
         <label className="text-sm">Producto<select required value={minimumProduct} onChange={(e) => setMinimumProduct(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar producto…</option>{rows.map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.name)}</option>)}</select></label>
         <label className="text-sm">Depósito<select required value={minimumWarehouse} onChange={(e) => setMinimumWarehouse(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar depósito…</option>{inventoryWarehouses.map((w) => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>
         <label className="text-sm">Cantidad mínima<input required min="0" step="0.000001" type="number" value={minimumValue} onChange={(e) => setMinimumValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
         <button disabled={busy} className="self-end rounded-lg bg-[#172b4d] px-4 py-2 font-semibold text-white disabled:opacity-50">Guardar mínimo</button>
       </form></div>}
      {inventoryView === 'categories' && <div className="max-w-3xl space-y-4"><form onSubmit={createCategory} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
         <div className="w-full text-sm font-semibold">{editingCategoryId ? "Editar categoría" : "Administrar categorías"}</div>
        <label className="min-w-0 flex-1 text-sm font-medium">Nueva categoría
          <input required maxLength={80} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Ej. Pinturas interiores" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50">{editingCategoryId ? "Guardar cambios" : "Crear categoría"}</button>{editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(""); setCategoryName("") }} className="rounded-lg border border-slate-300 bg-white px-4 py-2">Cancelar</button>}
      </form>
        <div className="mt-3 rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Editar o desactivar categorías</p><div className="flex flex-wrap gap-2">{categories.map((c) => <div key={String(c.id)} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="font-semibold">{String(c.name)}</span>{c.active === false && <span className="text-amber-700">Inactiva</span>}<button type="button" onClick={() => { setEditingCategoryId(String(c.id)); setCategoryName(String(c.name)) }} className="font-semibold text-blue-700 underline">Editar</button><button type="button" onClick={() => void toggleCategoryActive(c)} disabled={busy} className="font-semibold text-red-700 underline">{c.active === false ? "Reactivar" : "Desactivar"}</button></div>)}</div></div>
      </div>}
      {inventoryView === 'products' && <div className="space-y-4"><form onSubmit={createProduct} className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-4">
         <div className="md:col-span-4 text-sm font-semibold">{editingProduct ? "Editar producto" : "Agregar producto"}</div>
        <label className="text-sm">Nombre del producto *<input required value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Categoría<select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Sin categoría</option>{categories.filter((c) => c.active !== false).map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
        <label className="text-sm">Presentación<input value={productPresentation} onChange={(e) => setProductPresentation(e.target.value)} placeholder="Galón, cuñete…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Unidad<select value={productUnit} onChange={(e) => setProductUnit(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="unidad">Unidad</option><option value="galón">Galón</option><option value="cuñete">Cuñete</option><option value="litro">Litro</option><option value="kilogramo">Kilogramo</option></select></label>
        <label className="text-sm">Color<input value={productColor} onChange={(e) => setProductColor(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Precio de venta (USD)<input inputMode="decimal" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Ej. 12.50" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <div className="flex flex-wrap gap-2 md:col-span-4"><button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{editingProduct ? "Guardar cambios" : "Guardar producto"}</button>{editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setProductName(""); setProductCategory(""); setProductPresentation(""); setProductColor(""); setProductPrice("") }} className="rounded-lg border border-slate-300 px-4 py-2">Cancelar edición</button>}</div>
      </form>
        <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSelectedCategory('')} className="rounded-full border px-3 py-1 text-xs">Todas las categorías</button>{categories.filter((c) => c.active !== false).map((c) => <button key={String(c.id)} onClick={() => setSelectedCategory(String(c.id))} className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === String(c.id) ? 'border-orange-400 bg-orange-100 text-orange-900' : 'border-slate-200 bg-white text-slate-700'}`}>{String(c.name)}</button>)}</div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar productos desactivados</label>
      </div>}
    </>}
    {section === 'Inventario' && inventoryView === 'movements' && <div className="mt-4 space-y-4">
       <form onSubmit={saveInventoryMovement} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-5">
         <div className="md:col-span-5"><h3 className="font-semibold">Registrar movimiento</h3><p className="text-xs text-slate-500">Cada entrada, salida o ajuste queda guardado en el historial.</p></div>
         <label className="text-sm">Tipo<select value={movementType} onChange={(e) => setMovementType(e.target.value as 'entry' | 'exit' | 'adjustment')} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="entry">Entrada</option><option value="exit">Salida</option><option value="adjustment">Ajuste</option></select></label>
         <label className="text-sm md:col-span-2">Producto<select required value={movementProduct} onChange={(e) => setMovementProduct(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{rows.filter((r) => r.active !== false).map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.name)}</option>)}</select></label>
         <label className="text-sm md:col-span-2">Depósito<select required value={movementWarehouse} onChange={(e) => setMovementWarehouse(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{inventoryWarehouses.map((w) => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>
         <label className="text-sm">Cantidad<input required type="number" min="0.000001" step="0.000001" value={movementQuantity} onChange={(e) => setMovementQuantity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
         {movementType === 'adjustment' && <label className="text-sm">Diferencia (+/-)<input required type="number" step="0.000001" value={movementDelta} onChange={(e) => setMovementDelta(e.target.value)} placeholder="Ej. -2 o 5" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>}
         <label className="text-sm md:col-span-2">Motivo / referencia<input required={movementType === 'adjustment'} value={movementReason} onChange={(e) => setMovementReason(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
         <button disabled={busy} className="self-end rounded-lg bg-[#172b4d] px-4 py-2 font-semibold text-white disabled:opacity-50">Guardar movimiento</button>
       </form>
       <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50"><tr>{['Fecha','Producto','Depósito','Tipo','Cantidad','Saldo','Motivo'].map((h) => <th key={h} className="p-3 text-left text-xs font-bold uppercase text-slate-500">{h}</th>)}</tr></thead><tbody>{movementRows.map((m) => <tr key={String(m.id)} className="border-t border-slate-100"><td className="p-3">{m.created_at ? new Date(String(m.created_at)).toLocaleString('es-VE') : '—'}</td><td className="p-3">{String(rows.find((r) => String(r.id) === String(m.product_id))?.name ?? m.product_id)}</td><td className="p-3">{String(inventoryWarehouses.find((w) => String(w.id) === String(m.warehouse_id))?.name ?? m.warehouse_id)}</td><td className="p-3">{m.movement_type === 'entry' ? 'Entrada' : m.movement_type === 'exit' ? 'Salida' : m.movement_type === 'adjustment' ? 'Ajuste' : String(m.movement_type)}</td><td className="p-3">{String(m.quantity_delta)}</td><td className="p-3">{String(m.balance_after)}</td><td className="p-3">{String(m.reason ?? '—')}</td></tr>)}</tbody></table>{movementRows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Todavía no hay movimientos registrados.</p>}</div>
     </div>}
    {section === 'Cotizaciones' && <div className="mt-5 space-y-4">
      <form onSubmit={addCartLine} className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-4">
        <label className="text-sm md:col-span-2">Producto<select required value={cartProduct} onChange={e => { setCartProduct(e.target.value); const p=saleProducts.find(x=>String(x.id)===e.target.value); setCartPrice(p ? String(p.sale_price ?? '') : '') }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar producto…</option>{saleProducts.map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>)}</select></label>
        <label className="text-sm">Cantidad<input required inputMode="decimal" value={cartQuantity} onChange={e=>setCartQuantity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <label className="text-sm">Precio unitario (USD)<input required inputMode="decimal" value={cartPrice} onChange={e=>setCartPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold md:col-span-4">Agregar producto</button>
      </form>
      {cart.length>0 && <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Producto</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Precio USD</th><th className="p-3 text-right">Importe USD</th><th className="p-3"></th></tr></thead><tbody>{cart.map((line,i)=><tr key={`${line.productId}-${i}`} className="border-t"><td className="p-3">{line.description}</td><td className="p-3 text-right">{line.quantity}</td><td className="p-3 text-right">{line.unitPrice}</td><td className="p-3 text-right">{calculateDocument([{quantity:line.quantity,unitPrice:line.unitPrice}]).total}</td><td className="p-3 text-center"><button type="button" onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))} className="text-red-700 underline">Quitar</button></td></tr>)}</tbody></table><div className="border-t bg-slate-50 p-4 text-right text-lg font-bold">Total: $ {documentTotal()} USD</div></div>}
      <div className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-3">
        <label className="text-sm md:col-span-2">Cliente<select required value={saleCustomer} onChange={e=>setSaleCustomer(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar cliente…</option>{customerRows.map(c=><option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
        <div className="self-end rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">Moneda: <strong>USD</strong></div>
        <label className="text-sm md:col-span-3">Notas (opcional)<input value={saleNotes} onChange={e=>setSaleNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-600">Métodos de pago disponibles</p><div className="mt-2 flex flex-wrap gap-2">{paymentMethods.filter(m => !Array.isArray(m.currencies) || (m.currencies as string[]).includes('USD')).map(m=><span key={String(m.id)} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{String(m.name)}</span>)}</div><p className="mt-2 text-[11px] text-slate-500">Son sólo informativos. Los pagos se registran después en Cuentas.</p></div>
      </div>
      <div className="flex flex-wrap gap-2"><button onClick={saveQuote} disabled={busy || !cart.length || !saleCustomer} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Guardar cotización</button><button type="button" onClick={()=>setCart([])} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold">Vaciar cotización</button></div>
      <p className="text-xs text-slate-500">La cotización no descuenta inventario ni registra cobros. Al confirmarla desde el listado, se registra la operación y se crea la cuenta por cobrar.</p>
    </div>}
    {section === 'Compras' && <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Registrar compra / orden de mercancía</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><label className="text-sm">Proveedor<select value={purchaseSupplier} onChange={e=>setPurchaseSupplier(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{purchaseSuppliers.map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.name)}</option>)}</select></label><p className="self-end text-xs text-slate-500">Documento y fecha automáticos · USD</p></div>
      <form onSubmit={addPurchaseLine} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-6"><label className="text-sm md:col-span-2">Producto<select required value={purchaseProduct} onChange={e=>setPurchaseProduct(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{purchaseProducts.map(x=><option key={String(x.id)} value={String(x.id)}>{String(x.name)} · {String(x.sku ?? 'Sin código')}</option>)}</select></label><label className="text-sm">Cantidad<input value={purchaseQuantity} onChange={e=>setPurchaseQuantity(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm">Costo unitario<input value={purchaseUnitCost} onChange={e=>setPurchaseUnitCost(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm"><button className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold md:col-span-6">Agregar línea</button></form>
      {purchaseLines.length>0 && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Producto</th><th className="p-2">Cantidad</th><th className="p-2">Costo unitario USD</th><th></th></tr></thead><tbody>{purchaseLines.map((line,i)=><tr key={`${line.productId}-${i}`} className="border-b"><td className="p-2">{line.description}</td><td className="p-2">{line.quantity}</td><td className="p-2">${line.unitCost}</td><td><button type="button" onClick={()=>setPurchaseLines(current=>current.filter((_,j)=>j!==i))} className="text-red-700 underline">Quitar</button></td></tr>)}</tbody></table></div>}
      <label className="block text-sm">Notas<input value={purchaseNotes} onChange={e=>setPurchaseNotes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={createPurchase} disabled={busy || !purchaseLines.length} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Crear compra en borrador</button></div>
      {purchaseDetail && <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Detalle de compra {String(purchaseDetail.document_number ?? purchaseDetail.documentNumber ?? '')}</h3><p className="text-sm text-slate-600">Estado: {String(purchaseDetail.status)} · Total: {String(purchaseDetail.total)} {String(purchaseDetail.currency)}</p></div><button onClick={()=>setPurchaseDetail(null)} className="text-sm underline">Cerrar detalle</button></div><div className="mt-3 space-y-1 text-sm">{(Array.isArray(purchaseDetail.lines)?purchaseDetail.lines as Row[]:[]).map(line=><p key={String(line.id)}>{String(line.description ?? line.product_id)} — pedido {String(line.quantity)} — recibido {String(line.received_quantity ?? 0)}</p>)}</div><div className="mt-4 flex flex-wrap items-end gap-3">{purchaseDetail.status === 'draft' && <button onClick={approveSelectedPurchase} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Aprobar compra</button>}{['approved','partially_received'].includes(String(purchaseDetail.status)) && <><label className="text-sm">Recibir en depósito<select value={receiptWarehouse} onChange={e=>setReceiptWarehouse(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{purchaseWarehouses.map(w=><option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label><button onClick={receiveSelectedPurchase} disabled={busy || !receiptWarehouse} className="rounded-lg bg-orange-600 px-4 py-2 text-white">Recibir cantidades pendientes y actualizar stock</button></>}</div></div>}
      <p className="text-xs text-slate-500">La compra se crea como borrador. Tras aprobarla, la recepción registra entradas de inventario y la cuenta por pagar dentro de una transacción; en compras USD se exige una tasa BCV previamente registrada para la fecha del documento.</p>
    </div>}
    {section === 'Cuentas' && <div className="mt-5 space-y-4"><nav aria-label="Tipo de cuenta" className="flex gap-2 border-b border-slate-200 pb-2"><button type="button" onClick={() => setAccountView('receivable')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${accountView === 'receivable' ? 'bg-[#172b4d] text-white' : 'bg-slate-100 text-slate-600'}`}>Por cobrar</button><button type="button" onClick={() => setAccountView('payable')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${accountView === 'payable' ? 'bg-[#172b4d] text-white' : 'bg-slate-100 text-slate-600'}`}>Por pagar</button></nav>{accountView === 'receivable' ? <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Registrar abono de cliente</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><label className="text-sm md:col-span-2">Cuenta pendiente<select value={selectedReceivable} onChange={e=>{setSelectedReceivable(e.target.value);setCustomerPayAmount('')}} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar cuenta…</option>{reportReceivables.filter(x=>Number(x.balance ?? x.original_amount ?? 0)>0).map(x=><option key={String(x.id)} value={String(x.id)}>{String(customerRows.find(c=>String(c.id)===String(x.customer_id))?.name ?? 'Cliente')} · {String(x.balance ?? x.original_amount)} {String(x.currency)}</option>)}</select></label><label className="text-sm">Importe recibido<input value={customerPayAmount} onChange={e=>setCustomerPayAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Método de pago<select value={customerPayMethod} onChange={e=>setCustomerPayMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{paymentMethods.map(m=><option key={String(m.id)} value={String(m.name)}>{String(m.name)}</option>)}</select></label><label className="text-sm md:col-span-3">Referencia (opcional)<input value={customerPayReference} onChange={e=>setCustomerPayReference(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={registerCustomerPayment} disabled={busy || !selectedReceivable} className="self-end rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Registrar abono</button></div></div> : <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Registrar pago a proveedor</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><label className="text-sm md:col-span-2">Cuenta pendiente<select value={selectedPayable} onChange={e=>{setSelectedPayable(e.target.value);setSupplierPayAmount('')}} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar cuenta…</option>{payableRows.filter(x=>String(x.status)!=='paid').map(x=><option key={String(x.id)} value={String(x.id)}>{String(purchaseSuppliers.find(v=>String(v.id)===String(x.supplier_id))?.name ?? 'Proveedor')} · {String(x.balance ?? x.original_amount)} {String(x.currency)}</option>)}</select></label><label className="text-sm">Importe pagado<input value={supplierPayAmount} onChange={e=>setSupplierPayAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Método<select value={supplierPayMethod} onChange={e=>setSupplierPayMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar…</option>{supplierPaymentMethods.map(m=><option key={String(m.id)} value={String(m.name)}>{String(m.name)}</option>)}</select></label><label className="text-sm md:col-span-3">Referencia (opcional)<input value={supplierPayReference} onChange={e=>setSupplierPayReference(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={registerSupplierPayment} disabled={busy || !selectedPayable} className="self-end rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white">Registrar pago</button></div></div>}</div>}
    {section === 'Resumen del negocio' && <div className="mt-5 space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-4"><label className="text-sm">Desde<input type="date" value={reportFrom} onChange={e=>setReportFrom(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm">Hasta<input type="date" value={reportTo} onChange={e=>setReportTo(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button onClick={()=>void load()} disabled={busy || reportFrom>reportTo} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Actualizar resumen</button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{label:'Ventas confirmadas',usd:sumCurrency(reportSales,'total','USD'),ves:sumCurrency(reportSales,'total','VES')},{label:'Compras registradas',usd:sumCurrency(reportPurchases,'total','USD'),ves:sumCurrency(reportPurchases,'total','VES')},{label:'Por cobrar',usd:sumCurrency(reportReceivables,'balance','USD'),ves:sumCurrency(reportReceivables,'balance','VES')},{label:'Por pagar',usd:sumCurrency(reportPayables,'balance','USD'),ves:sumCurrency(reportPayables,'balance','VES')}].map(x=><div key={x.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{x.label}</p><p className="mt-2 text-lg font-bold tabular-nums">USD $ {x.usd.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><p className="mt-1 text-sm text-slate-500 tabular-nums">VES {x.ves.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Productos más vendidos</h2><p className="mt-1 text-xs text-slate-500">Ordenados por unidades confirmadas en el período seleccionado.</p>{topSellingProducts.length ? <div className="mt-3 space-y-3">{topSellingProducts.map((p,i)=><div key={p.name} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm"><span><strong className="mr-2 text-slate-400">{i+1}.</strong>{p.name}</span><strong>{p.quantity.toLocaleString('es-VE')} uds.</strong></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Todavía no hay ventas confirmadas en este período.</p>}</div>
        <div className="rounded-xl border border-slate-200 p-4"><h2 className="font-semibold">Balance comercial del período</h2><p className="mt-1 text-xs text-slate-500">Ventas menos compras registradas; no representa utilidad neta ni incluye gastos operativos.</p><div className="mt-4 space-y-3"><div className="flex justify-between text-sm"><span>USD</span><strong>$ {(sumCurrency(reportSales,'total','USD')-sumCurrency(reportPurchases,'total','USD')).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div><div className="flex justify-between text-sm"><span>VES</span><strong>{(sumCurrency(reportSales,'total','VES')-sumCurrency(reportPurchases,'total','VES')).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div><div className="border-t border-slate-100 pt-3 text-xs text-slate-500">Eventos pendientes de sincronizar con caja: {reportCashPending}</div></div></div>
      </div>
    </div>}    {message && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    {!(section === 'Inventario' && ['movements', 'categories', 'minimum'].includes(inventoryView)) && <div className="mt-5 overflow-x-auto">{busy ? <p className="p-8 text-center text-sm text-slate-500">Consultando…</p> : visibleRows.length === 0 ? <div className="p-10 text-center"><p className="font-semibold">No hay registros para mostrar</p><p className="mt-1 text-sm text-slate-500">Puede que aún no existan datos, que falte aplicar la migración correspondiente o que tu usuario no tenga acceso al negocio.</p></div> : <table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr>{columns.map((c) => <th key={c} className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">{({name:'Producto',category_id:'Categoría',presentation:'Presentación',color:'Color',sale_price:'Precio USD',quantity:'Existencia',minimum_stock:'Stock mínimo',stock_status:'Estado',inventory_value:'Valor USD',customer_id:'Cliente',supplier_id:'Proveedor',original_amount:'Monto original',paidAmount:'Abonado',balance:'Saldo',due_date:'Vencimiento',actions:'Acciones'} as Record<string,string>)[c] ?? c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{visibleRows.map((r,i) => <tr key={String(r.id ?? i)} onClick={section === 'Compras' ? () => void openPurchase(String(r.id)) : undefined} className={`odd:bg-slate-50 ${section === 'Compras' ? 'cursor-pointer hover:bg-orange-50' : ''}`}>{columns.map((c) => <td key={c} className="max-w-xs border-b border-slate-100 px-3 py-3 text-slate-700">{c === 'actions' && section === 'Inventario' ? <div className="flex min-w-36 flex-wrap gap-2"><button type="button" onClick={(e) => { e.stopPropagation(); beginEditProduct(r) }} className="font-semibold text-blue-700 underline">Editar</button><button type="button" onClick={(e) => { e.stopPropagation(); void toggleProductActive(r) }} disabled={busy} className="font-semibold text-red-700 underline">{r.active === false ? "Reactivar" : "Desactivar"}</button></div> : c === 'actions' && section === 'Cotizaciones' ? <button type="button" disabled={busy || !['pending','draft'].includes(String(r.status))} onClick={(e) => { e.stopPropagation(); void confirmQuote(r) }} className="rounded-lg bg-[#172b4d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Confirmar operación</button> : c === 'customer_id' ? String(customerRows.find(cu => String(cu.id) === String(r[c]))?.name ?? r[c]) : c === 'supplier_id' ? String(purchaseSuppliers.find(su => String(su.id) === String(r[c]))?.name ?? r[c]) : c === 'inventory_value' ? ' : c === 'category_id' ? String(categories.find((cat) => String(cat.id) === String(r[c]))?.name ?? 'Sin categoría') : c === 'stock_status' ? Number(r.quantity ?? 0) <= 0 ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Agotado</span> : Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) < Number(r.minimum_stock ?? 0) ? <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">Reponer</span> : Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) === Number(r.minimum_stock ?? 0) ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Stock bajo</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Disponible</span> : pretty(r[c])}</td>)}</tr>)}</tbody></table>}</div>}
    </section><p className="mt-4 text-xs text-slate-500">El resumen presenta cifras reales de ventas, compras y saldos. Las cotizaciones sólo afectan inventario y cuentas cuando se confirman. Caja y cierres cuentan con su módulo transaccional; la factura fiscal requiere emisor autorizado y validación legal.</p><div className="mt-4 flex flex-wrap gap-4"><a href="/caja" className="inline-block text-sm font-semibold text-orange-700 underline">Abrir caja y cierres</a><a href="/administracion" className="inline-block text-sm font-semibold text-orange-700 underline">Administración y auditoría</a></div></div></div></div></main>
}
 + (Number(r.value_ves ?? 0) / (bcvRate || 1)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : c === 'category_id' ? String(categories.find((cat) => String(cat.id) === String(r[c]))?.name ?? 'Sin categoría') : c === 'stock_status' ? Number(r.quantity ?? 0) <= 0 ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Agotado</span> : Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) < Number(r.minimum_stock ?? 0) ? <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">Reponer</span> : Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) === Number(r.minimum_stock ?? 0) ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Stock bajo</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Disponible</span> : pretty(r[c])}</td>)}</tr>)}</tbody></table>}</div>}
    </section><p className="mt-4 text-xs text-slate-500">El resumen presenta cifras reales de ventas, compras y saldos. Las cotizaciones sólo afectan inventario y cuentas cuando se confirman. Caja y cierres cuentan con su módulo transaccional; la factura fiscal requiere emisor autorizado y validación legal.</p><div className="mt-4 flex flex-wrap gap-4"><a href="/caja" className="inline-block text-sm font-semibold text-orange-700 underline">Abrir caja y cierres</a><a href="/administracion" className="inline-block text-sm font-semibold text-orange-700 underline">Administración y auditoría</a></div></div></div></div></main>
}
