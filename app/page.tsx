'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [today, setToday] = useState('')

  useEffect(() => {
    const updateDate = () => {
      setToday(new Intl.DateTimeFormat('es-VE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date()))
    }
    updateDate()
    const interval = window.setInterval(updateDate, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f7fb] px-5 py-12 text-slate-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[38rem] w-[38rem] rounded-full bg-orange-200/50 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[min(82vw,52rem)] w-[min(82vw,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-900/10" />
        <div className="absolute left-1/2 top-1/2 h-[min(68vw,43rem)] w-[min(68vw,43rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-500/10" />
      </div>

      <section className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sistema de gestión comercial
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[min(76vw,470px)] overflow-hidden rounded-full bg-white shadow-[0_28px_90px_-35px_rgba(15,35,80,0.42)] ring-8 ring-white/80">
          <Image
            src="/pinturas-jam-logo.jpg"
            alt="Pinturas JAM — Excelencia en pinturas"
            fill
            priority
            sizes="(max-width: 640px) 76vw, 470px"
            className="object-contain"
          />
        </div>

        <p className="mt-8 text-sm font-medium capitalize tracking-wide text-slate-500">
          {today || 'Bienvenido'}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#142b59] sm:text-4xl">
          Bienvenido a Pinturas JAM
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-slate-600">
          Excelencia en pinturas. Tu espacio de trabajo, inventario y operaciones en un solo lugar.
        </p>

        <Link
          href="/operaciones"
          className="group mt-8 inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-[#142b59] px-8 py-4 text-sm font-bold tracking-[0.12em] text-white shadow-[0_16px_35px_-14px_rgba(20,43,89,0.75)] transition duration-200 hover:-translate-y-1 hover:bg-[#1d3b77] hover:shadow-[0_22px_40px_-14px_rgba(20,43,89,0.65)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
        >
          ENTRAR A OPERACIONES
          <span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-1">→</span>
        </Link>

        <p className="mt-8 text-xs font-medium tracking-wide text-slate-400">
          PINTURAS JAM · EXCELENCIA EN PINTURAS
        </p>
      </section>
    </main>
  )
}
