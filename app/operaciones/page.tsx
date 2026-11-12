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

type Section = 'Inventario' | 'Compras' | 'Ventas' | 'Cotizaciones' | 'Cuentas por cobrar' | 'Cuentas por pagar' | 'Reportes'
type Row = Record<string, unknown>
const sections: Section[] = ['Inventario', 'Compras', 'Ventas', 'Cotizaciones', 'Cuentas por cobrar', 'Cuentas por pagar', 'Reportes']
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
  const [inventoryView, setInventoryView] = useState<'products' | 'movements' | 'alerts'>('products')
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
  const [saleCurrency, setSaleCurrency] = useState<Currency>('VES')
  const [salePaymentMethod, setSalePaymentMethod] = useState('')
  const [salePaymentAmount, setSalePaymentAmount] = useState('')
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
    catalog.listCategories(true).then((result) => {
      if (mounted && result.ok) setCategories(result.data as Row[])
    })
    return () => { mounted = false }
  }, [user, catalog])

  useEffect(() => {
    if (!user || (section !== 'Compras' && section !== 'Cuentas por pagar')) return
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
    if (!user || section !== 'Inventario') return
    let mounted = true
    inventory.warehouses().then((result) => {
      if (!mounted) return
      if (result.ok) {
        const list = result.data as Row[]
        setInventoryWarehouses(list)
        if (!minimumWarehouse && list[0]) setMinimumWarehouse(String(list[0].id))
      } else setMessage(result.error.message)
    }).catch((e: unknown) => setMessage(errorText(e)))
    return () => { mounted = false }
  }, [user, section, inventory])

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
        const [products, stock] = await Promise.all([catalog.listProducts(search, true), inventory.stock(search)])
        if (!products.ok) throw new Error(products.error.message)
        if (!stock.ok) throw new Error(stock.error.message)
        const stockByProduct = new Map<string, Row>()
        for (const item of stock.data as Row[]) {
          const id = String(item.product_id ?? item.productId)
          const current = stockByProduct.get(id) ?? { quantity: 0, minimum_stock: 0, warehouse_count: 0 }
          current.quantity = Number(current.quantity ?? 0) + Number(item.quantity ?? 0)
          current.minimum_stock = Number(current.minimum_stock ?? 0) + Number(item.minimum_stock ?? 0)
          current.warehouse_count = Number(current.warehouse_count ?? 0) + 1
          stockByProduct.set(id, current)
        }
        setRows((products.data as Row[]).map((p) => ({ ...p, ...(stockByProduct.get(String(p.id)) ?? { quantity: 0, minimum_stock: 0, warehouse_count: 0 }) })))
      } else {
        switch (section) {
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
      Inventario: ['name','category_id','presentation','color','sale_price','quantity','minimum_stock','stock_status','actions'],
      Compras: ['document_number','document_date','currency','status','total','created_at'],
      Ventas: ['sale_number','sale_date','currency','status','total','created_at'],
      Cotizaciones: ['quote_number','quote_date','currency','status','total','valid_until'],
      'Cuentas por cobrar': ['customer_name','currency','original_amount','balance','status','due_date'],
      'Cuentas por pagar': ['supplier_id','currency','original_amount','paidAmount','balance','status','created_at'],
      Reportes: [],
    }
    const keys = new Set(rows.flatMap((r) => Object.keys(r)))
    const selected = preferred[section].filter((k) => k === 'stock_status' || k === 'actions' || keys.has(k))
    return selected.length ? selected : [...keys].slice(0, 7)
  }, [rows, section])

  const inventoryRows = useMemo(() => rows.filter((r) => showInactive || r.active !== false), [rows, showInactive])
  const inventoryStats = useMemo(() => ({ total: inventoryRows.length, units: inventoryRows.reduce((sum, r) => sum + Number(r.quantity ?? 0), 0), low: inventoryRows.filter((r) => r.active !== false && Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) > 0 && Number(r.quantity ?? 0) <= Number(r.minimum_stock ?? 0)).length, out: inventoryRows.filter((r) => r.active !== false && Number(r.quantity ?? 0) <= 0).length }), [inventoryRows])

  const visibleRows = useMemo(() => section === 'Inventario' && selectedCategory
    ? inventoryRows.filter((r) => String(r.category_id ?? '') === selectedCategory)
    : section === 'Inventario' && inventoryView === 'alerts' ? inventoryRows.filter((r) => r.active !== false && (Number(r.quantity ?? 0) <= 0 || (Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) <= Number(r.minimum_stock ?? 0))))
    : section === 'Inventario' ? inventoryRows : rows, [rows, section, selectedCategory, inventoryRows, inventoryView])

  if (!ready) return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Cargando sesión segura…</main>

  if (!user) return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f5fa] px-4 py-10 text-slate-900 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-48 -right-40 h-[38rem] w-[38rem] rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.22]" style={{ backgroundImage: 'radial-gradient(#64748b 0.7px, transparent 0.7px)', backgroundSize: '22px 22px' }} />
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_30px_100px_-35px_rgba(15,35,80,0.38)] lg:min-h-[610px] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-[#142b59] px-7 py-10 text-center text-white sm:px-12 lg:px-14">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute right-0 top-0 h-2 w-full bg-gradient-to-r from-orange-400 via-pink-500 to-cyan-400" />
          <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
            <div className="mb-7 rounded-full bg-white p-2 shadow-2xl ring-1 ring-white/30">
              <Image src="/pinturas-jam-logo.jpg" alt="Logo oficial de Pinturas JAM" width={220} height={220} priority className="h-40 w-40 rounded-full object-contain sm:h-48 sm:w-48" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-blue-200">Excelencia en pinturas</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">PINTURAS JAM</h1>
            <p className="mt-4 max-w-xs text-sm leading-7 text-blue-100/85">
              Tu espacio de trabajo para administrar inventario, ventas y operaciones de forma segura.
            </p>
            <div className="mt-9 flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-blue-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              Plataforma de gestión comercial
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">Acceso autorizado</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#142b59] sm:text-4xl">Iniciar sesión</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Ingresa con tu correo y contraseña de usuario autorizado para continuar.
              </p>
            </div>

            <form onSubmit={signIn} className="space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                Correo electrónico
                <span className="relative mt-2 block">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
                  </span>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" type="email" autoComplete="username" placeholder="nombre@empresa.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </span>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Contraseña
                <span className="relative mt-2 block">
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></svg>
                  </span>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100" type="password" autoComplete="current-password" placeholder="Tu contraseña" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </span>
              </label>

              <button disabled={busy} className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#142b59] px-5 py-4 text-sm font-bold tracking-wide text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-[#1d3b77] hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? 'Verificando acceso…' : 'ENTRAR AL SISTEMA'}
                {!busy && <span aria-hidden="true" className="text-lg transition-transform group-hover:translate-x-1">→</span>}
              </button>
            </form>

            {message && <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-700">{message}</p>}

            <div className="mt-7 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs leading-5 text-slate-500">
                <span className="font-semibold text-slate-700">Acceso protegido.</span> Solo pueden ingresar usuarios previamente creados y autorizados en Supabase. Esta pantalla no crea cuentas ni permisos.
              </p>
            </div>

            <a className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#244477] transition hover:text-orange-600" href="/">
              <span aria-hidden="true">←</span> Volver al panel visual
            </a>
            <p className="mt-8 border-t border-slate-100 pt-5 text-[11px] leading-5 text-slate-400">
              Configuración técnica: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Nunca exponer service_role en el navegador.
            </p>
          </div>
        </section>
      </div>
    </main>
  )

  return <main className="min-h-screen bg-[#f4f6fa] text-slate-900"><div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
    <aside className="w-full shrink-0 bg-[#172b4d] px-4 py-4 text-white md:w-60 md:px-5 md:py-7">
      <div className="px-2 pb-4 md:pb-9"><p className="text-2xl font-black tracking-wide">JAM</p><p className="mt-1 text-[10px] font-semibold tracking-[0.32em] text-blue-200">PINTURAS</p></div>
      <p className="mb-2 hidden px-2 text-[10px] font-bold tracking-[0.18em] text-blue-200 md:block">MENÚ PRINCIPAL</p>
      <nav className="flex flex-wrap gap-1 md:flex-col">{sections.map((s) => <button key={s} onClick={() => { setSection(s); setSearch(''); setSelectedCategory('') }} className={`rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${section === s ? 'bg-[#2e4770] text-white shadow-inner' : 'text-blue-100 hover:bg-white/10'}`}>{s === 'Inventario' ? '▦  ' : s === 'Compras' ? '＋  ' : s === 'Ventas' ? '↗  ' : s === 'Cotizaciones' ? '▤  ' : s === 'Reportes' ? '▥  ' : '$  '}{s}</button>)}</nav>
      <div className="mt-8 hidden border-t border-white/10 px-2 pt-4 text-xs text-blue-200 md:block">Gestión comercial JAM</div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div><p className="text-xs font-bold tracking-[.18em] text-orange-600">PINTURAS JAM · OPERACIONES</p><h1 className="mt-1 text-2xl font-bold">{section}</h1><p className="mt-1 text-xs text-slate-500">Sesión: {user.email ?? user.id}</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">Actualizar</button><button onClick={() => void signOut()} className="rounded-lg bg-[#172b4d] px-4 py-2 text-sm font-semibold text-white">Cerrar sesión</button></div>
      </header>
      <div className="p-4 md:p-8">
      {notice && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{section}</h2><p className="text-sm text-slate-500">Datos leídos desde las tablas/RPC del proyecto Supabase autenticado.</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Buscar ${section.toLowerCase()}…`} className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
     {section === 'Inventario' && <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
       <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Total de productos</p><p className="mt-2 text-2xl font-bold">{inventoryStats.total}</p><p className="mt-1 text-[11px] text-slate-400">Productos registrados</p></div>
       <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">Unidades disponibles</p><p className="mt-2 text-2xl font-bold">{inventoryStats.units.toLocaleString('es-VE')}</p><p className="mt-1 text-[11px] text-slate-400">Existencia total</p></div>
       <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"><p className="text-xs text-amber-800">Stock bajo</p><p className="mt-2 text-2xl font-bold text-amber-700">{inventoryStats.low}</p><p className="mt-1 text-[11px] text-amber-700">En el mínimo o por debajo</p></div>
       <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm"><p className="text-xs text-red-800">Agotados</p><p className="mt-2 text-2xl font-bold text-red-700">{inventoryStats.out}</p><p className="mt-1 text-[11px] text-red-700">Sin existencias</p></div>
     </div>}
    {section === 'Inventario' && <div className="mb-4 flex flex-wrap gap-2">
       <button type="button" onClick={() => setInventoryView('products')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${inventoryView === 'products' ? 'bg-[#172b4d] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Productos</button>
       <button type="button" onClick={() => setInventoryView('movements')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${inventoryView === 'movements' ? 'bg-[#172b4d] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Movimientos</button>
       <button type="button" onClick={() => setInventoryView('alerts')} className={`rounded-lg px-4 py-2 text-sm font-semibold ${inventoryView === 'alerts' ? 'bg-[#172b4d] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Alertas de stock</button>
     </div>}
    {section === 'Inventario' && inventoryView === 'products' && <>
       <form onSubmit={saveMinimumStock} className="mt-5 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 md:grid-cols-4">
         <div className="md:col-span-4"><h3 className="font-semibold text-slate-800">Configurar stock mínimo</h3><p className="mt-1 text-xs text-slate-600">Se mostrará una alerta cuando la existencia llegue al mínimo o quede por debajo.</p></div>
         <label className="text-sm">Producto<select required value={minimumProduct} onChange={(e) => setMinimumProduct(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar producto…</option>{rows.map((r) => <option key={String(r.id)} value={String(r.id)}>{String(r.name)}</option>)}</select></label>
         <label className="text-sm">Depósito<select required value={minimumWarehouse} onChange={(e) => setMinimumWarehouse(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Seleccionar depósito…</option>{inventoryWarehouses.map((w) => <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>)}</select></label>
         <label className="text-sm">Cantidad mínima<input required min="0" step="0.000001" type="number" value={minimumValue} onChange={(e) => setMinimumValue(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
         <button disabled={busy} className="self-end rounded-lg bg-[#172b4d] px-4 py-2 font-semibold text-white disabled:opacity-50">Guardar mínimo</button>
       </form>
      <form onSubmit={createCategory} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-4">
         <div className="w-full text-sm font-semibold">{editingCategoryId ? "Editar categoría" : "Administrar categorías"}</div>
        <label className="min-w-0 flex-1 text-sm font-medium">Nueva categoría
          <input required maxLength={80} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Ej. Pinturas interiores" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
        </label>
        <button disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold disabled:opacity-50">{editingCategoryId ? "Guardar cambios" : "Crear categoría"}</button>{editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(""); setCategoryName("") }} className="rounded-lg border border-slate-300 bg-white px-4 py-2">Cancelar</button>}
      </form>
      <form onSubmit={createProduct} className="mt-3 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-4">
         <div className="md:col-span-4 text-sm font-semibold">{editingProduct ? "Editar producto" : "Agregar producto"}</div>
        <label className="text-sm">Nombre del producto *<input required value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Categoría<select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Sin categoría</option>{categories.filter((c) => c.active !== false).map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}</select></label>
        <label className="text-sm">Presentación<input value={productPresentation} onChange={(e) => setProductPresentation(e.target.value)} placeholder="Galón, cuñete…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Unidad<select value={productUnit} onChange={(e) => setProductUnit(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="unidad">Unidad</option><option value="galón">Galón</option><option value="cuñete">Cuñete</option><option value="litro">Litro</option><option value="kilogramo">Kilogramo</option></select></label>
        <label className="text-sm">Color<input value={productColor} onChange={(e) => setProductColor(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label className="text-sm">Precio de venta<input inputMode="decimal" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="Ej. 12.50" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        <div className="flex flex-wrap gap-2 md:col-span-4"><button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{editingProduct ? "Guardar cambios" : "Guardar producto"}</button>{editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setProductName(""); setProductCategory(""); setProductPresentation(""); setProductColor(""); setProductPrice("") }} className="rounded-lg border border-slate-300 px-4 py-2">Cancelar edición</button>}</div>
      </form>
      <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => setSelectedCategory('')} className="rounded-full border px-3 py-1 text-xs">Todas las categorías</button>{categories.filter((c) => c.active !== false).map((c) => <button key={String(c.id)} onClick={() => setSelectedCategory(String(c.id))} className={`rounded-full border px-3 py-1 text-xs ${selectedCategory === String(c.id) ? 'border-orange-400 bg-orange-100 text-orange-900' : 'border-slate-200 bg-white text-slate-700'}`}>{String(c.name)}</button>)}</div>
       <div className="mt-3 rounded-xl border border-slate-200 p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Editar o desactivar categorías</p><div className="flex flex-wrap gap-2">{categories.map((c) => <div key={String(c.id)} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><span className="font-semibold">{String(c.name)}</span>{c.active === false && <span className="text-amber-700">Inactiva</span>}<button type="button" onClick={() => { setEditingCategoryId(String(c.id)); setCategoryName(String(c.name)) }} className="font-semibold text-blue-700 underline">Editar</button><button type="button" onClick={() => void toggleCategoryActive(c)} disabled={busy} className="font-semibold text-red-700 underline">{c.active === false ? "Reactivar" : "Desactivar"}</button></div>)}</div></div>
       <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Mostrar productos desactivados</label>
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
    {message && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    {!(section === 'Inventario' && inventoryView === 'movements') && <div className="mt-5 overflow-x-auto">{busy ? <p className="p-8 text-center text-sm text-slate-500">Consultando…</p> : visibleRows.length === 0 ? <div className="p-10 text-center"><p className="font-semibold">No hay registros para mostrar</p><p className="mt-1 text-sm text-slate-500">Puede que aún no existan datos, que falte aplicar la migración correspondiente o que tu usuario no tenga acceso al negocio.</p></div> : <table className="w-full min-w-[640px] border-collapse text-left text-sm"><thead><tr>{columns.map((c) => <th key={c} className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">{({name:'Producto',category_id:'Categoría',presentation:'Presentación',color:'Color',sale_price:'Precio',quantity:'Existencia',minimum_stock:'Stock mínimo',stock_status:'Estado',actions:'Acciones'} as Record<string,string>)[c] ?? c.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{visibleRows.map((r,i) => <tr key={String(r.id ?? i)} onClick={section === 'Compras' ? () => void openPurchase(String(r.id)) : undefined} className={`odd:bg-slate-50 ${section === 'Compras' ? 'cursor-pointer hover:bg-orange-50' : ''}`}>{columns.map((c) => <td key={c} className="max-w-xs border-b border-slate-100 px-3 py-3 text-slate-700">{c === 'actions' && section === 'Inventario' ? <div className="flex min-w-36 flex-wrap gap-2"><button type="button" onClick={(e) => { e.stopPropagation(); beginEditProduct(r) }} className="font-semibold text-blue-700 underline">Editar</button><button type="button" onClick={(e) => { e.stopPropagation(); void toggleProductActive(r) }} disabled={busy} className="font-semibold text-red-700 underline">{r.active === false ? "Reactivar" : "Desactivar"}</button></div> : c === 'category_id' ? String(categories.find((cat) => String(cat.id) === String(r[c]))?.name ?? 'Sin categoría') : c === 'stock_status' ? Number(r.quantity ?? 0) <= 0 ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Agotado</span> : Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) < Number(r.minimum_stock ?? 0) ? <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">Reponer</span> : Number(r.minimum_stock ?? 0) > 0 && Number(r.quantity ?? 0) === Number(r.minimum_stock ?? 0) ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">Stock bajo</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Disponible</span> : pretty(r[c])}</td>)}</tr>)}</tbody></table>}</div>}
    </section><p className="mt-4 text-xs text-slate-500">Reportes consultan ventas, compras y saldos directamente desde Supabase. Ventas y cotizaciones cuentan con formularios conectados a los RPC comerciales; la confirmación de venta descuenta inventario de forma transaccional. Caja y cierres cuentan con su módulo transaccional; la factura fiscal requiere emisor autorizado y validación legal.</p><div className="mt-4 flex flex-wrap gap-4"><a href="/caja" className="inline-block text-sm font-semibold text-orange-700 underline">Abrir caja y cierres</a><a href="/administracion" className="inline-block text-sm font-semibold text-orange-700 underline">Administración y auditoría</a><a href="/" className="inline-block text-sm text-orange-700 underline">Volver al panel visual</a></div></div></div></div></main>
}
