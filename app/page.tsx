'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { CommercialService } from '@/lib/modules/commercial'
import { CatalogService, InventoryService } from '@/lib/modules/inventory/supabase'
import { PurchasesService } from '@/lib/modules/purchases'

type Module = 'Resumen' | 'Inventario' | 'Ventas' | 'Compras' | 'Clientes' | 'Créditos' | 'Facturación' | 'Caja' | 'Cierres diarios' | 'Reportes' | 'Usuarios y permisos' | 'Configuración'

type ProductLike = { id?: string; name?: string; sku?: string; presentation?: string; stock?: number; quantity?: number; minimum?: number; minimum_stock?: number; sale_price?: number | string; price?: number | string; category?: string; category_id?: string; product_name?: string; product_id?: string }

const toNumber = (value: unknown) => {
  const numeric = Number(value ?? 0)
  return Number.isFinite(numeric) ? numeric : 0
}

const nav = [
  { label: 'Resumen', icon: LayoutDashboard, href: '/' },
  { label: 'Inventario', icon: Package, href: '/operaciones?section=Inventario' },
  { label: 'Ventas', icon: ShoppingCart, href: '/operaciones?section=Ventas' },
  { label: 'Compras', icon: ArrowDownToLine, href: '/operaciones?section=Compras' },
  { label: 'Clientes', icon: Users, href: '/operaciones?section=Clientes' },
  { label: 'Créditos', icon: CreditCard, href: '/operaciones?section=Cuentas%20por%20cobrar' },
  { label: 'Facturación', icon: FileText, href: '/operaciones?section=Ventas' },
  { label: 'Caja', icon: WalletCards, href: '/caja' },
  { label: 'Cierres diarios', icon: ClipboardList, href: '/caja' },
  { label: 'Reportes', icon: BarChart3, href: '/operaciones?section=Reportes' },
  { label: 'Usuarios y permisos', icon: Users, href: '/administracion' },
] as const

const money = (value: number, currency = 'VES') => {
  const normalizedCurrency = String(currency ?? 'VES').toUpperCase()
  const prefix = normalizedCurrency === 'USD' ? 'US$' : 'Bs.'
  return `${prefix}${Number(value || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const moduleMeta: Record<Exclude<Module, 'Resumen'>, { eyebrow: string; description: string; action: string }> = {
  Inventario: { eyebrow: 'CONTROL DE EXISTENCIAS', description: 'Consulta niveles, costos y alertas de reposición.', action: 'Nuevo producto' },
  Ventas: { eyebrow: 'PUNTO DE VENTA', description: 'Espacio preparado para búsqueda rápida, carrito y cobro.', action: 'Nueva venta' },
  Compras: { eyebrow: 'ABASTECIMIENTO', description: 'Registra proveedores, recepción y costos de mercancía.', action: 'Nueva compra' },
  Clientes: { eyebrow: 'RELACIÓN COMERCIAL', description: 'Fichas de clientes, datos fiscales y contacto.', action: 'Nuevo cliente' },
  Créditos: { eyebrow: 'CUENTAS POR COBRAR', description: 'Seguimiento de límites, saldos y abonos pendientes.', action: 'Registrar abono' },
  Facturación: { eyebrow: 'DOCUMENTOS COMERCIALES', description: 'Diseño listo para documentos, impresión y revisión previa.', action: 'Nueva factura' },
  Caja: { eyebrow: 'CONTROL DE CAJA', description: 'Movimientos, métodos de pago y saldo esperado.', action: 'Movimiento de caja' },
  'Cierres diarios': { eyebrow: 'CIERRE OPERATIVO', description: 'Resumen del día, conteo físico y diferencias de caja.', action: 'Nuevo cierre' },
  Reportes: { eyebrow: 'ANÁLISIS DEL NEGOCIO', description: 'Reportes preparados para ventas, inventario y rentabilidad.', action: 'Exportar reporte' },
  'Usuarios y permisos': { eyebrow: 'CONTROL DE ACCESO', description: 'Roles, permisos y usuarios del equipo de trabajo.', action: 'Nuevo usuario' },
  Configuración: { eyebrow: 'PREFERENCIAS DEL SISTEMA', description: 'Datos del establecimiento y preferencias operativas.', action: 'Guardar cambios' },
}

export default function Page() {
  const db = useMemo(() => createClient(), [])
  const commercial = useMemo(() => new CommercialService(db), [db])
  const catalog = useMemo(() => new CatalogService(db), [db])
  const inventory = useMemo(() => new InventoryService(db), [db])
  const purchases = useMemo(() => new PurchasesService(db), [db])

  const [activeModule, setActiveModule] = useState<Module>('Resumen')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showQuick, setShowQuick] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sales, setSales] = useState<any[]>([])
  const [purchasesRows, setPurchasesRows] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [stock, setStock] = useState<any[]>([])
  const [receivables, setReceivables] = useState<any[]>([])
  const [payables, setPayables] = useState<any[]>([])

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      const { data } = await db.auth.getSession()
      if (!mounted) return

      const currentUser = data.session?.user ?? null
      setUser(currentUser)

      if (!currentUser) {
        setLoading(false)
        return
      }

      const [productsRes, stockRes, salesRes, purchaseRes, receivableRes, payableRes] = await Promise.all([
        catalog.listProducts(),
        inventory.stock(),
        commercial.listSales(),
        purchases.listPurchases(),
        commercial.listReceivables(),
        purchases.listPayables(),
      ])

      if (!mounted) return

      if (productsRes.ok) setProducts(productsRes.data as any[])
      if (stockRes.ok) setStock(stockRes.data as any[])
      if (salesRes.ok) setSales(salesRes.data as any[])
      if (purchaseRes.ok) setPurchasesRows(purchaseRes.data as any[])
      if (receivableRes.ok) setReceivables(receivableRes.data as any[])
      if (payableRes.ok) setPayables(payableRes.data as any[])
      setLoading(false)
    }

    void loadDashboard().catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: listener } = db.auth.onAuthStateChange((_: string, session: { user: User | null } | null) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [catalog, commercial, db, inventory, purchases])

  const filteredProducts = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return products
    return products.filter((product) => `${product.name ?? ''} ${product.sku ?? ''} ${product.presentation ?? ''}`.toLowerCase().includes(normalized))
  }, [products, search])

  const lowStock = useMemo(
    () =>
      stock.filter((row) => {
        const available = Number(row.quantity ?? row.stock ?? row.available ?? 0)
        const minimum = Number(row.minimum_stock ?? row.minimum ?? row.min_stock ?? 0)
        return available <= minimum
      }),
    [stock],
  )

  const salesByCurrency = useMemo(() => {
    const result = { VES: 0, USD: 0 }
    for (const row of sales) {
      const currency = String(row.currency ?? 'VES').toUpperCase()
      const amount = toNumber(row.total ?? row.amount ?? row.net_total ?? row.grand_total)
      if (currency === 'USD') result.USD += amount
      else if (currency === 'VES') result.VES += amount
    }
    return result
  }, [sales])

  const purchasesByCurrency = useMemo(() => {
    const result = { VES: 0, USD: 0 }
    for (const row of purchasesRows) {
      const currency = String(row.currency ?? 'VES').toUpperCase()
      const amount = toNumber(row.total ?? row.amount ?? row.net_total)
      if (currency === 'USD') result.USD += amount
      else if (currency === 'VES') result.VES += amount
    }
    return result
  }, [purchasesRows])

  const receivablesByCurrency = useMemo(() => {
    const result = { VES: 0, USD: 0 }
    for (const row of receivables) {
      const currency = String(row.currency ?? 'VES').toUpperCase()
      const amount = toNumber(row.balance ?? row.original_amount ?? row.amount ?? row.total)
      if (currency === 'USD') result.USD += amount
      else if (currency === 'VES') result.VES += amount
    }
    return result
  }, [receivables])

  const salesTotal = salesByCurrency.VES + salesByCurrency.USD
  const purchasesTotal = purchasesByCurrency.VES + purchasesByCurrency.USD
  const receivablesTotal = receivablesByCurrency.VES + receivablesByCurrency.USD
  const router = useRouter()

  if (loading) {
    return <main className="min-h-screen bg-slate-50 p-8 text-slate-700">Cargando datos reales del negocio…</main>
  }

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-overlay" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Boxes size={24} aria-hidden="true" /></div>
          <div><strong>PINTURAS <span>JAM</span></strong><small>GESTIÓN COMERCIAL</small></div>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <div className="business-selector"><div className="store-dot"><Store size={16} /></div><div><small>ESTABLECIMIENTO</small><strong>Negocio activo</strong></div><ChevronDown size={15} /></div>
        <nav className="main-nav" aria-label="Navegación principal">
          <small className="nav-label">OPERACIONES</small>
          {nav.slice(0, 4).map(({ label, icon: Icon, href }) => (
            <button key={label} className={`nav-item ${activeModule === label ? 'active' : ''}`} onClick={() => { setActiveModule(label as Module); setSidebarOpen(false); router.push(href) }}><Icon size={18} /><span>{label}</span>{label === 'Inventario' && <em>{lowStock.length}</em>}</button>
          ))}
          <small className="nav-label secondary-label">GESTIÓN</small>
          {nav.slice(4).map(({ label, icon: Icon, href }) => (
            <button key={label} className={`nav-item ${activeModule === label ? 'active' : ''}`} onClick={() => { setActiveModule(label as Module); setSidebarOpen(false); router.push(href) }}><Icon size={18} /><span>{label}</span></button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className={`nav-item ${activeModule === 'Configuración' ? 'active' : ''}`} onClick={() => { setActiveModule('Configuración'); setSidebarOpen(false); router.push('/administracion') }}><Settings size={18} /><span>Configuración</span></button>
          <div className="user-mini">
            <div className="avatar">{user?.email?.slice(0, 2).toUpperCase() ?? 'SU'}</div>
            <div><strong>{user?.email ? user.email.split('@')[0] : 'Invitado'}</strong><small>{user ? 'Sesión activa' : 'Sin acceso'}</small></div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Panel</span><span>/</span><strong>{activeModule}</strong></div>
          <div className="topbar-actions">
            <button type="button" className="primary-button" style={{ textDecoration: 'none', padding: '9px 13px' }} onClick={() => router.push('/operaciones')}>{user ? 'Abrir operaciones reales' : 'Acceder a operaciones'}</button>
            <div className="demo-status"><span className="status-dot" /> {user ? 'Sistema autenticado' : 'Sin sesión de Supabase'}</div>
            <span className="icon-button" aria-label="Notificaciones" title="Notificaciones del negocio"><Bell size={19} /><i /></span>
            <div className="top-user">
              <div className="avatar small">{user?.email?.slice(0, 2).toUpperCase() ?? 'SU'}</div>
              <div><strong>{user?.email ? user.email.split('@')[0] : 'Sin sesión'}</strong><small>{user ? 'Operador' : 'Acceso requerido'}</small></div>
            </div>
          </div>
        </header>

        <div className="page-body">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <h1>{activeModule === 'Resumen' ? (user ? 'Buenos días' : 'Panel comercial') : activeModule}</h1>
              <p className="heading-copy">{activeModule === 'Resumen' ? (user ? 'Aquí está el estado real del negocio desde Supabase.' : 'Inicia sesión para consultar ventas, inventario, compras y movimiento de caja.') : `Administra y consulta la información de ${activeModule.toLowerCase()}.`}</p>
            </div>
            <button className="primary-button" onClick={() => setShowQuick(true)}><Plus size={17} /> Nueva operación</button>
          </div>

          {activeModule === 'Resumen' ? (
            <>
              <section className="metric-grid" aria-label="Indicadores principales">
                <MetricCard icon={<CircleDollarSign />} label="Ventas del período" value={money(salesTotal)} meta={`${sales.length} registros`} trend={sales.length ? '+ tasa real' : 'Sin ventas'} color="orange" />
                <MetricCard icon={<Package />} label="Productos" value={String(products.length)} meta={`${lowStock.length} con stock bajo`} trend="Revisar" color="blue" alert={lowStock.length > 0} />
                <MetricCard icon={<ArrowDownToLine />} label="Compras" value={money(purchasesTotal)} meta={`${purchasesRows.length} compras`} trend={purchasesRows.length ? 'Operaciones' : 'Sin compras'} color="green" />
                <MetricCard icon={<CreditCard />} label="Por cobrar" value={money(receivablesTotal)} meta={`${receivables.length} clientes`} trend={receivables.length ? 'Pendientes' : 'Sin deuda'} color="purple" />
              </section>

              <section className="dashboard-grid">
                <div className="card sales-card">
                  <div className="card-header">
                    <div><h2>Ventas y flujo</h2><p>Resumen operativo del negocio</p></div>
                    <span className="select-button">Supabase <ChevronDown size={14} /></span>
                  </div>
                  <div className="chart-legend">
                    <span><i className="legend-dot orange" /> Operaciones</span>
                    <strong>{money(salesByCurrency.VES, 'VES')} <small><ArrowUpRight size={13} /> {sales.length || 0}</small></strong>
                  </div>
                  <MiniChart data={buildSalesChart(sales)} />
                </div>

                <div className="card quick-card">
                  <div className="card-header">
                    <div><h2>Acciones rápidas</h2><p>Accesos frecuentes</p></div>
                    <Gauge size={20} className="muted-icon" />
                  </div>
                  <div className="quick-actions">
                    <QuickAction icon={<ShoppingCart />} label="Consultar ventas" href="/operaciones?section=Ventas" />
                    <QuickAction icon={<ArrowDownToLine />} label="Consultar compras" href="/operaciones?section=Compras" />
                    <QuickAction icon={<Package />} label="Consultar inventario" href="/operaciones?section=Inventario" />
                    <QuickAction icon={<FileText />} label="Consultar cotizaciones" href="/operaciones?section=Cotizaciones" />
                  </div>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="card inventory-card">
                  <div className="card-header">
                    <div><h2>Inventario por revisar</h2><p>Productos con stock mínimo o pendiente</p></div>
                    <button className="text-button" onClick={() => setActiveModule('Inventario')}>Ver inventario <ArrowUpRight size={14} /></button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>DISPONIBLE</th><th>ESTADO</th></tr></thead>
                      <tbody>
                        {lowStock.length ? lowStock.slice(0, 5).map((row, idx) => {
                          const productName = row.product_name ?? row.name ?? `Producto ${idx + 1}`
                          const available = Number(row.quantity ?? row.stock ?? row.available ?? 0)
                          const minimum = Number(row.minimum_stock ?? row.minimum ?? row.min_stock ?? 0)
                          return (
                            <tr key={`${productName}-${idx}`}>
                              <td><div className="product-name"><div className="product-icon"><Package size={15} /></div><strong>{productName}</strong></div></td>
                              <td>{row.category ?? 'Sin categoría'}</td>
                              <td><strong>{available} uds.</strong><small className="table-sub">Mínimo: {minimum}</small></td>
                              <td><span className="badge warning"><AlertTriangle size={12} /> Stock bajo</span></td>
                            </tr>
                          )
                        }) : (
                          <tr><td colSpan={4} className="p-4 text-sm text-slate-500">Sin productos bajo mínimo.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card activity-card">
                  <div className="card-header">
                    <div><h2>Actividad reciente</h2><p>Movimientos del negocio</p></div>
                    <ClipboardList size={20} className="muted-icon" />
                  </div>
                  <div className="activity-list">
                    {buildRecentActivity(sales, purchasesRows, receivables).slice(0, 5).map((item) => (
                      <Activity key={item.id} icon={item.icon} title={item.title} detail={item.detail} time={item.time} color={item.color} />
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <ModulePlaceholder module={activeModule} productRows={filteredProducts} search={search} onSearch={setSearch} />
          )}
        </div>
      </main>
      {showQuick && <QuickModal onClose={() => setShowQuick(false)} />}
    </div>
  )
}

function MetricCard({ icon, label, value, meta, trend, color, alert }: { icon: React.ReactNode; label: string; value: string; meta: string; trend: string; color: string; alert?: boolean }) {
  return <div className="metric-card"><div className={`metric-icon ${color}`}>{icon}</div><div className="metric-text"><span>{label}</span><strong>{value}</strong><small>{meta}</small></div><span className={`metric-trend ${alert ? 'trend-alert' : ''}`}>{trend}</span></div>
}

function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return <a className="quick-action" href={href}><span>{icon}</span><strong>{label}</strong><ArrowUpRight size={15} /></a>
}

function Activity({ icon, title, detail, time, color }: { icon: React.ReactNode; title: string; detail: string; time: string; color: string }) {
  return <div className="activity-item"><span className={`activity-icon ${color}`}>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div>
}

function ModulePlaceholder({ module, productRows, search, onSearch }: { module: Exclude<Module, 'Resumen'>; productRows: ProductLike[]; search: string; onSearch: (value: string) => void }) {
  const meta = moduleMeta[module]
  const sectionMap: Partial<Record<Module, string>> = {
    Inventario: 'Inventario',
    Ventas: 'Ventas',
    Compras: 'Compras',
    Clientes: 'Clientes',
    Créditos: 'Cuentas por cobrar',
    Facturación: 'Ventas',
  }
  const target = sectionMap[module]

  return <div className="module-view">
    <div className="card module-banner">
      <div className="module-banner-icon"><Boxes size={24} /></div>
      <div><span className="eyebrow">{meta.eyebrow}</span><h2>{module}</h2><p>{meta.description}</p></div>
      <span className="coming-badge">{target ? 'Consulta disponible' : 'Integración pendiente'}</span>
    </div>
    <div className="card">
      <div className="module-toolbar">
        <div className="search-box"><Search size={17} /><input aria-label={`Buscar en ${module.toLowerCase()}`} value={search} onChange={(e) => onSearch(e.target.value)} placeholder={`Buscar en ${module.toLowerCase()}...`} /></div>
        {target ? <a className="primary-button" href={`/operaciones?section=${encodeURIComponent(target)}`}><ArrowUpRight size={17} /> Abrir módulo operativo</a> : <button className="primary-button" type="button" disabled title="Este módulo aún no tiene integración operativa"><Plus size={17} /> {meta.action}</button>}
      </div>
      <div className="empty-state">
        <div className="empty-icon"><ClipboardList size={25} /></div>
        <h3>{target ? 'Datos reales en la consola operativa' : 'Este módulo aún no está conectado'}</h3>
        <p>{target ? `Abre ${module.toLowerCase()} para consultar los registros de Supabase. Las altas y transacciones no disponibles no se simulan.` : `La función ${module.toLowerCase()} requiere completar su integración y permisos. No se guardarán datos ficticios.`}</p>
        {target && <a className="primary-button" href={`/operaciones?section=${encodeURIComponent(target)}`}>Abrir {module.toLowerCase()}</a>}
        <small className="implementation-note">Los botones de operaciones no implementadas se mantienen deshabilitados deliberadamente para evitar registros falsos.</small>
      </div>
    </div>
  </div>
}

function QuickModal({ onClose }: { onClose: () => void }) {
  const options = [
    { href: '/operaciones?section=Ventas', icon: <ShoppingCart size={20} />, title: 'Consultar ventas', detail: 'Ver operaciones registradas' },
    { href: '/operaciones?section=Compras', icon: <ArrowDownToLine size={20} />, title: 'Consultar compras', detail: 'Ver compras registradas' },
    { href: '/operaciones?section=Clientes', icon: <Users size={20} />, title: 'Gestionar clientes', detail: 'Consultar y registrar clientes' },
    { href: '/caja', icon: <CircleDollarSign size={20} />, title: 'Caja y cierres', detail: 'Abrir, mover y cerrar caja' },
  ]
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nueva operación"><div className="modal"><div className="modal-head"><div><span className="eyebrow">OPERACIÓN RÁPIDA</span><h2>Selecciona un módulo</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><div className="modal-options">{options.map((item) => <a key={item.title} href={item.href} onClick={onClose}>{item.icon}<strong>{item.title}</strong><span>{item.detail}</span></a>)}</div></div></div>
}

function MiniChart({ data }: { data: Array<{ label: string; value: number; height: number }> }) {
  const max = Math.max(1, ...data.map((item) => item.value))
  return <div className="chart" role="img" aria-label="Gráfico de ventas del negocio"><div className="chart-y"><span>{money(Math.round(max * 0.75), 'VES')}</span><span>{money(Math.round(max * 0.5), 'VES')}</span><span>{money(Math.round(max * 0.25), 'VES')}</span><span>{money(0, 'VES')}</span></div><div className="chart-area"><div className="chart-bars" aria-hidden="true">{data.map((item, index) => <span key={`${item.label}-${index}`} style={{ height: `${item.height}%` }} />)}</div><div className="chart-x">{data.map((item) => <span key={item.label}>{item.label}</span>)}</div></div></div>
}

function buildSalesChart(sales: any[]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    return {
      label: date.toLocaleDateString('es-VE', { weekday: 'short' }).slice(0, 3),
      value: 0,
    }
  })

  sales.forEach((sale) => {
    const rawDate = sale.sale_date ?? sale.created_at ?? sale.document_date ?? sale.date
    if (!rawDate) return
    const parsed = new Date(rawDate)
    if (Number.isNaN(parsed.getTime())) return

    const expectedLabel = parsed.toLocaleDateString('es-VE', { weekday: 'short' }).slice(0, 3)
    const match = days.find((day) => day.label.toLowerCase() === expectedLabel.toLowerCase())
    if (!match) return
    match.value += toNumber(sale.total ?? sale.amount ?? sale.grand_total ?? sale.net_total)
  })

  const max = Math.max(1, ...days.map((day) => day.value))
  return days.map((day) => ({ ...day, height: Math.max(12, Math.round((day.value / max) * 100)) }))
}

function buildRecentActivity(sales: any[], purchasesRows: any[], receivables: any[]) {
  const records: Array<{ id: string; icon: React.ReactNode; title: string; detail: string; time: string; color: string }> = []

  sales.forEach((sale, index) => {
    records.push({
      id: `sale-${sale.id ?? index}`,
      icon: <ShoppingCart size={14} />,
      title: 'Venta registrada',
      detail: sale.customer_name ? `Cliente: ${sale.customer_name}` : 'Venta comercial',
      time: sale.created_at ? new Date(sale.created_at).toLocaleDateString('es-VE') : 'Reciente',
      color: 'orange',
    })
  })

  purchasesRows.forEach((purchase, index) => {
    records.push({
      id: `purchase-${purchase.id ?? index}`,
      icon: <ArrowDownToLine size={14} />,
      title: 'Compra registrada',
      detail: purchase.document_number ?? 'Compra',
      time: purchase.document_date ? new Date(purchase.document_date).toLocaleDateString('es-VE') : 'Reciente',
      color: 'blue',
    })
  })

  receivables.forEach((row, index) => {
    records.push({
      id: `receivable-${row.id ?? index}`,
      icon: <CreditCard size={14} />,
      title: 'Cuenta por cobrar',
      detail: `${row.customer_name ?? 'Cliente'} · ${money(toNumber(row.balance ?? row.original_amount ?? row.amount ?? row.total), String(row.currency ?? 'VES'))}`,
      time: 'Pendiente',
      color: 'green',
    })
  })

  return records.sort((left, right) => {
    const leftTime = left.time === 'Pendiente' ? 0 : new Date(left.time).getTime()
    const rightTime = right.time === 'Pendiente' ? 0 : new Date(right.time).getTime()
    return rightTime - leftTime
  })
}
