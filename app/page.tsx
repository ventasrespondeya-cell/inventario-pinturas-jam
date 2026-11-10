'use client'

import { useMemo, useState } from 'react'
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

type Module = 'Resumen' | 'Inventario' | 'Ventas' | 'Compras' | 'Clientes' | 'Créditos' | 'Facturación' | 'Caja' | 'Cierres diarios' | 'Reportes' | 'Usuarios y permisos' | 'Configuración'

type Product = { name: string; presentation: string; stock: number; minimum: number; price: number; category: string }

const products: Product[] = [
  { name: 'FLEXIPACK · EXTERIOR TIPO A', presentation: 'FLEXIPACK', stock: 18, minimum: 10, price: 12, category: 'Pinturas' },
  { name: 'GALÓN · INTERIOR TIPO B', presentation: 'GALÓN', stock: 5, minimum: 8, price: 8.9, category: 'Pinturas' },
  { name: 'CUÑETE · EXTERIOR TIPO A', presentation: 'CUÑETE', stock: 12, minimum: 5, price: 55, category: 'Pinturas' },
  { name: 'RODILLO CON BANDEJA', presentation: 'UNIDAD', stock: 3, minimum: 6, price: 6, category: 'Accesorios' },
  { name: 'CROMATO NARANJA', presentation: 'UNIDAD', stock: 24, minimum: 8, price: 36, category: 'Complementos' },
]

const nav = [
  { label: 'Resumen', icon: LayoutDashboard },
  { label: 'Inventario', icon: Package },
  { label: 'Ventas', icon: ShoppingCart },
  { label: 'Compras', icon: ArrowDownToLine },
  { label: 'Clientes', icon: Users },
  { label: 'Créditos', icon: CreditCard },
  { label: 'Facturación', icon: FileText },
  { label: 'Caja', icon: WalletCards },
  { label: 'Cierres diarios', icon: ClipboardList },
  { label: 'Reportes', icon: BarChart3 },
  { label: 'Usuarios y permisos', icon: Users },
] as const

const money = (value: number) => `$${value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`

const moduleMeta: Record<Exclude<Module, 'Resumen'>, { eyebrow: string; description: string; action: string; fields: string[] }> = {
  Inventario: { eyebrow: 'CONTROL DE EXISTENCIAS', description: 'Consulta niveles, costos y alertas de reposición.', action: 'Nuevo producto', fields: ['Código', 'Producto', 'Presentación', 'Stock mínimo', 'Precio de venta'] },
  Ventas: { eyebrow: 'PUNTO DE VENTA', description: 'Espacio preparado para búsqueda rápida, carrito y cobro.', action: 'Nueva venta', fields: ['Cliente', 'Producto', 'Cantidad', 'Descuento', 'Método de pago'] },
  Compras: { eyebrow: 'ABASTECIMIENTO', description: 'Registra proveedores, recepción y costos de mercancía.', action: 'Nueva compra', fields: ['Proveedor', 'Producto', 'Cantidad', 'Costo unitario', 'Fecha'] },
  Clientes: { eyebrow: 'RELACIÓN COMERCIAL', description: 'Fichas de clientes, datos fiscales y contacto.', action: 'Nuevo cliente', fields: ['Nombre completo', 'Documento', 'Teléfono', 'Correo', 'Dirección'] },
  Créditos: { eyebrow: 'CUENTAS POR COBRAR', description: 'Seguimiento de límites, saldos y abonos pendientes.', action: 'Registrar abono', fields: ['Cliente', 'Saldo pendiente', 'Vencimiento', 'Estado'] },
  Facturación: { eyebrow: 'DOCUMENTOS COMERCIALES', description: 'Diseño listo para documentos, impresión y revisión previa.', action: 'Nueva factura', fields: ['Cliente', 'Datos fiscales', 'Base imponible', 'Impuestos', 'Total'] },
  Caja: { eyebrow: 'CONTROL DE CAJA', description: 'Movimientos, métodos de pago y saldo esperado.', action: 'Movimiento de caja', fields: ['Tipo de movimiento', 'Método', 'Moneda', 'Monto', 'Referencia'] },
  'Cierres diarios': { eyebrow: 'CIERRE OPERATIVO', description: 'Resumen del día, conteo físico y diferencias de caja.', action: 'Nuevo cierre', fields: ['Fecha', 'Saldo inicial', 'Total esperado', 'Total contado', 'Diferencia'] },
  Reportes: { eyebrow: 'ANÁLISIS DEL NEGOCIO', description: 'Reportes preparados para ventas, inventario y rentabilidad.', action: 'Exportar reporte', fields: ['Rango de fechas', 'Módulo', 'Formato'] },
  'Usuarios y permisos': { eyebrow: 'CONTROL DE ACCESO', description: 'Roles, permisos y usuarios del equipo de trabajo.', action: 'Nuevo usuario', fields: ['Nombre', 'Correo', 'Rol', 'Estado'] },
  Configuración: { eyebrow: 'PREFERENCIAS DEL SISTEMA', description: 'Datos del establecimiento y preferencias operativas.', action: 'Guardar cambios', fields: ['Nombre comercial', 'RIF / documento', 'Teléfono', 'Dirección'] },
}

export default function Page() {
  const [activeModule, setActiveModule] = useState<Module>('Resumen')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showQuick, setShowQuick] = useState(false)

  const filteredProducts = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase())), [search])
  const lowStock = products.filter((product) => product.stock <= product.minimum)

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="mobile-overlay" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Boxes size={24} aria-hidden="true" /></div>
          <div><strong>PINTURAS <span>JAM</span></strong><small>GESTIÓN COMERCIAL</small></div>
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <div className="business-selector"><div className="store-dot"><Store size={16} /></div><div><small>ESTABLECIMIENTO</small><strong>Tienda principal</strong></div><ChevronDown size={15} /></div>
        <nav className="main-nav" aria-label="Navegación principal">
          <small className="nav-label">OPERACIONES</small>
          {nav.slice(0, 4).map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeModule === label ? 'active' : ''}`} onClick={() => { setActiveModule(label); setSidebarOpen(false) }}><Icon size={18} /><span>{label}</span>{label === 'Inventario' && <em>5</em>}</button>)}
          <small className="nav-label secondary-label">GESTIÓN</small>
          {nav.slice(4).map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeModule === label ? 'active' : ''}`} onClick={() => { setActiveModule(label); setSidebarOpen(false) }}><Icon size={18} /><span>{label}</span></button>)}
        </nav>
        <div className="sidebar-footer"><button className={`nav-item ${activeModule === 'Configuración' ? 'active' : ''}`} onClick={() => { setActiveModule('Configuración'); setSidebarOpen(false) }}><Settings size={18} /><span>Configuración</span></button><div className="user-mini"><div className="avatar">MC</div><div><strong>María C.</strong><small>Administradora</small></div><ChevronDown size={15} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button><div className="breadcrumb"><span>Panel</span><span>/</span><strong>{activeModule}</strong></div><div className="topbar-actions"><a href="/operaciones" className="primary-button" style={{ textDecoration: "none", padding: "9px 13px" }}>Abrir operaciones reales</a><div className="demo-status"><span className="status-dot" /> Entorno de demostración</div><span className="icon-button" aria-label="Notificaciones no disponibles" title="Notificaciones: integración pendiente"><Bell size={19} /><i /></span><div className="top-user"><div className="avatar small">MC</div><div><strong>María Carolina</strong><small>Administradora</small></div></div></div></header>

        <div className="page-body">
          <div className="page-heading"><div><p className="eyebrow">{new Date().toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h1>{activeModule === 'Resumen' ? 'Buenos días, María' : activeModule}</h1><p className="heading-copy">{activeModule === 'Resumen' ? 'Aquí tienes el estado de tu negocio hoy.' : `Administra y consulta la información de ${activeModule.toLowerCase()}.`}</p></div><button className="primary-button" onClick={() => setShowQuick(true)}><Plus size={17} /> Nueva operación</button></div>

          {activeModule === 'Resumen' ? <>
            <section className="metric-grid" aria-label="Indicadores principales"><MetricCard icon={<CircleDollarSign />} label="Ventas de hoy" value={money(1284.5)} meta="12 operaciones" trend="+8.2%" color="orange" /><MetricCard icon={<Package />} label="Productos" value="20" meta="5 con stock bajo" trend="Revisar" color="blue" alert /><MetricCard icon={<ArrowDownToLine />} label="Compras de hoy" value={money(560)} meta="3 entradas" trend="+2.4%" color="green" /><MetricCard icon={<CreditCard />} label="Por cobrar" value={money(3240)} meta="8 clientes" trend="Ver cuentas" color="purple" /></section>
            <section className="dashboard-grid"><div className="card sales-card"><div className="card-header"><div><h2>Ventas de la semana</h2><p>Comportamiento de ventas en USD</p></div><span className="select-button">Esta semana <ChevronDown size={14} /></span></div><div className="chart-legend"><span><i className="legend-dot orange" /> Ventas</span><strong>$4,286.20 <small><ArrowUpRight size={13} /> 12.6%</small></strong></div><MiniChart /></div><div className="card quick-card"><div className="card-header"><div><h2>Acciones rápidas</h2><p>Accesos frecuentes</p></div><Gauge size={20} className="muted-icon" /></div><div className="quick-actions"><QuickAction icon={<ShoppingCart />} label="Consultar ventas" href="/operaciones?section=Ventas" /><QuickAction icon={<ArrowDownToLine />} label="Consultar compras" href="/operaciones?section=Compras" /><QuickAction icon={<Package />} label="Consultar inventario" href="/operaciones?section=Inventario" /><QuickAction icon={<FileText />} label="Consultar cotizaciones" href="/operaciones?section=Cotizaciones" /></div></div></section>
            <section className="bottom-grid"><div className="card inventory-card"><div className="card-header"><div><h2>Inventario por revisar</h2><p>Productos que alcanzaron su stock mínimo</p></div><button className="text-button" onClick={() => setActiveModule('Inventario')}>Ver inventario <ArrowUpRight size={14} /></button></div><div className="table-wrap"><table><thead><tr><th>PRODUCTO</th><th>CATEGORÍA</th><th>DISPONIBLE</th><th>ESTADO</th></tr></thead><tbody>{lowStock.map((p) => <tr key={p.name}><td><div className="product-name"><div className="product-icon"><Package size={15} /></div><strong>{p.name}</strong></div></td><td>{p.category}</td><td><strong>{p.stock} uds.</strong><small className="table-sub">Mínimo: {p.minimum}</small></td><td><span className="badge warning"><AlertTriangle size={12} /> Stock bajo</span></td></tr>)}</tbody></table></div></div><div className="card activity-card"><div className="card-header"><div><h2>Actividad reciente</h2><p>Últimos movimientos registrados</p></div><ClipboardList size={20} className="muted-icon" /></div><div className="activity-list"><Activity icon={<ShoppingCart />} title="Venta registrada" detail="Venta #000128 · 3 productos" time="Hace 12 min" color="orange" /><Activity icon={<ArrowDownToLine />} title="Entrada de mercancía" detail="Compra #000042 · Proveedor local" time="Hace 1 h" color="blue" /><Activity icon={<CreditCard />} title="Abono recibido" detail="Carlos Rodríguez · $150.00" time="Hace 2 h" color="green" /></div></div></section>
          </> : <ModulePlaceholder module={activeModule} productRows={filteredProducts} search={search} onSearch={setSearch} />}
        </div>
      </main>
      {showQuick && <QuickModal onClose={() => setShowQuick(false)} />}
    </div>
  )
}

function MetricCard({ icon, label, value, meta, trend, color, alert }: { icon: React.ReactNode; label: string; value: string; meta: string; trend: string; color: string; alert?: boolean }) { return <div className="metric-card"><div className={`metric-icon ${color}`}>{icon}</div><div className="metric-text"><span>{label}</span><strong>{value}</strong><small>{meta}</small></div><span className={`metric-trend ${alert ? 'trend-alert' : ''}`}>{trend}</span></div> }
function QuickAction({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) { return <a className="quick-action" href={href}><span>{icon}</span><strong>{label}</strong><ArrowUpRight size={15} /></a> }
function Activity({ icon, title, detail, time, color }: { icon: React.ReactNode; title: string; detail: string; time: string; color: string }) { return <div className="activity-item"><span className={`activity-icon ${color}`}>{icon}</span><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div> }
function ModulePlaceholder({ module, productRows, search, onSearch }: { module: Exclude<Module, 'Resumen'>; productRows: Product[]; search: string; onSearch: (value: string) => void }) {
  const meta = moduleMeta[module]
  const sectionMap: Partial<Record<Module, string>> = {
    Inventario: 'Inventario', Ventas: 'Ventas', Compras: 'Compras', Clientes: 'Clientes',
    Créditos: 'Cuentas por cobrar', Facturación: 'Ventas',
  }
  const target = sectionMap[module]
  return <div className="module-view">
    <div className="card module-banner"><div className="module-banner-icon"><Boxes size={24} /></div><div><span className="eyebrow">{meta.eyebrow}</span><h2>{module}</h2><p>{meta.description}</p></div><span className="coming-badge">{target ? 'Consulta disponible' : 'Integración pendiente'}</span></div>
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
    { href: '/operaciones?notice=cash-pending', icon: <CircleDollarSign size={20} />, title: 'Movimiento de caja', detail: 'Ver estado de integración de caja' },
  ]
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nueva operación"><div className="modal"><div className="modal-head"><div><span className="eyebrow">OPERACIÓN RÁPIDA</span><h2>Selecciona un módulo</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><div className="modal-options">{options.map((item) => <a key={item.title} href={item.href} onClick={onClose}>{item.icon}<strong>{item.title}</strong><span>{item.detail}</span></a>)}</div></div></div>
}
function MiniChart() { const bars = [42, 58, 48, 76, 62, 88, 96]; return <div className="chart" role="img" aria-label="Gráfico de ventas de la semana"><div className="chart-y"><span>$1k</span><span>$750</span><span>$500</span><span>$250</span><span>$0</span></div><div className="chart-area"><div className="chart-bars" aria-hidden="true">{bars.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-x"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div></div></div> }
