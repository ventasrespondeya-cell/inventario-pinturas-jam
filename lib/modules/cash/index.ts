import type { SupabaseClient } from '@supabase/supabase-js'

export class CashService {
  constructor(private readonly db: SupabaseClient) {}
  private async rpc<T>(name: string, args: Record<string, unknown> = {}) {
    const { data, error } = await this.db.rpc(name, args)
    if (error) return { ok: false as const, error }
    return { ok: true as const, data: data as T }
  }
  open(amount: string, currency: 'VES'|'USD', notes = '') { return this.rpc('jam_cash_session_open', { p_amount: amount, p_currency: currency, p_notes: notes }) }
  addMovement(sessionId: string, type: 'income'|'expense', amount: string, description: string, reference = '') {
    return this.rpc('jam_cash_movement_add', { p_session: sessionId, p_type: type, p_amount: amount, p_description: description, p_reference: reference, p_key: crypto.randomUUID() })
  }
  summary(sessionId: string) { return this.rpc<Record<string, unknown>>('jam_cash_session_summary', { p_session: sessionId }) }
  close(sessionId: string, counted: string, notes = '') { return this.rpc('jam_cash_session_close', { p_session: sessionId, p_counted: counted, p_notes: notes }) }
  consume(sessionId: string) { return this.rpc('jam_cash_events_consume', { p_session: sessionId, p_limit: 500 }) }
  async listSessions() {
    const { data, error } = await this.db.from('jam_cash_sessions').select('*').order('opened_at', { ascending: false }).limit(50)
    return error ? { ok: false as const, error } : { ok: true as const, data: data ?? [] }
  }
  async listMovements(sessionId: string) {
    const { data, error } = await this.db.from('jam_cash_movements').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
    return error ? { ok: false as const, error } : { ok: true as const, data: data ?? [] }
  }
}
