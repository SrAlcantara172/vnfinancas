import { useSyncExternalStore } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Income = { id: string; desc: string; amount: number; month: string };
export type Bill = { id: string; desc: string; amount: number; category: string; due: string; paid: boolean };
export type Transfer = { id: string; person: string; amount: number; date: string; done: boolean };
export type Card = { id: string; name: string; limit: number; dueDay: number; last4?: string };
export type Purchase = { id: string; cardId: string; desc: string; amount: number; installments: number; month: string; category: string };
export type Data = { incomes: Income[]; bills: Bill[]; transfers: Transfer[]; cards: Card[]; purchases: Purchase[] };
type User = { id: string; email: string; name: string };
type State = { user: User | null; authReady: boolean; month: string; hide: boolean; data: Data; error: string };

const empty: Data = { incomes: [], bills: [], transfers: [], cards: [], purchases: [] };
const today = new Date();
export const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const initial: State = { user: null, authReady: false, month: ym(today), hide: false, data: empty, error: "" };

let state: State = initial;
let started = false;
let channel: RealtimeChannel | null = null;
const subs = new Set<() => void>();
const HIDE_KEY = "vnfinancas:hide"; // só preferência de interface; os dados ficam no Supabase

function set(next: Partial<State>) {
  state = { ...state, ...next };
  subs.forEach((f) => f());
}

// ---------- mapeamento banco <-> app ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const COL: Record<string, string> = { desc: "description", limit: "credit_limit", dueDay: "due_day", cardId: "card_id" };
const toDb = (o: object) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [COL[k] ?? k, v]));

const fromIncome = (r: Row): Income => ({ id: r.id, desc: r.description, amount: Number(r.amount), month: r.month });
const fromBill = (r: Row): Bill => ({ id: r.id, desc: r.description, amount: Number(r.amount), category: r.category, due: r.due, paid: r.paid });
const fromTransfer = (r: Row): Transfer => ({ id: r.id, person: r.person, amount: Number(r.amount), date: r.date, done: r.done });
const fromCard = (r: Row): Card => ({ id: r.id, name: r.name, limit: Number(r.credit_limit), dueDay: r.due_day, last4: r.last4 ?? undefined });
const fromPurchase = (r: Row): Purchase => ({ id: r.id, cardId: r.card_id, desc: r.description, amount: Number(r.amount), installments: r.installments, month: r.month, category: r.category });

async function loadData() {
  const userId = state.user?.id;
  if (!userId) return;
  const sel = (t: string) => supabase.from(t).select("*");
  try {
    const [i, b, t, c, p] = await Promise.all([
      sel("incomes"), sel("bills"), sel("transfers"), sel("cards").order("created_at"), sel("purchases"),
    ]);
    if (state.user?.id !== userId) return; // trocou de usuário durante a carga
    const fail = [i, b, t, c, p].find((r) => r.error)?.error;
    if (fail) return set({ error: `Não foi possível carregar seus dados: ${fail.message}` });
    set({
      data: {
        incomes: (i.data ?? []).map(fromIncome),
        bills: (b.data ?? []).map(fromBill),
        transfers: (t.data ?? []).map(fromTransfer),
        cards: (c.data ?? []).map(fromCard),
        purchases: (p.data ?? []).map(fromPurchase),
      },
    });
  } catch (e) {
    set({ error: `Falha de conexão: ${(e as Error).message}` });
  }
}

function subscribeRealtime(userId: string) {
  if (channel) void supabase.removeChannel(channel);
  channel = supabase
    .channel(`purchases:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "purchases", filter: `user_id=eq.${userId}` }, () => { void loadData(); })
    .subscribe();
}

async function applySession(session: Session | null) {
  const u = session?.user;
  if (!u) {
    if (channel) void supabase.removeChannel(channel);
    channel = null;
    set({ user: null, data: empty, authReady: true, error: "" });
    return;
  }
  if (state.user?.id === u.id) return; // renovação de token, nada a fazer
  const meta = u.user_metadata as { name?: string } | undefined;
  const email = u.email ?? "";
  set({ user: { id: u.id, email, name: meta?.name?.trim() || email.split("@")[0]! }, data: empty, authReady: false, error: "" });
  await loadData();
  set({ authReady: true });
  subscribeRealtime(u.id);
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try { if (localStorage.getItem(HIDE_KEY) === "1") set({ hide: true }); } catch { /* ignore */ }
  supabase.auth.onAuthStateChange((_event, session) => {
    // não chamar o Supabase direto dentro do callback (risco de deadlock)
    setTimeout(() => { void applySession(session); }, 0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void loadData();
  });
}

export function useVn() {
  return useSyncExternalStore(
    (f) => { subs.add(f); start(); return () => subs.delete(f); },
    () => state,
    () => initial,
  );
}

export const uid = () => crypto.randomUUID();

const friendly = (m: string) =>
  /invalid login/i.test(m) ? "E-mail ou senha inválidos."
  : /already registered/i.test(m) ? "E-mail já cadastrado."
  : /not confirmed/i.test(m) ? "Confirme seu e-mail antes de entrar."
  : /signups not allowed/i.test(m) ? "Novos cadastros estão desativados."
  : m;

export const auth = {
  async signUp(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw new Error(friendly(error.message));
    if (!data.session) throw new Error("Conta criada! Confirme o e-mail que enviamos para poder entrar.");
    await applySession(data.session);
  },
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendly(error.message));
    await applySession(data.session);
  },
  async signOut() {
    await supabase.auth.signOut();
    await applySession(null);
  },
};

/** Atualiza a tela na hora (otimista) e grava no banco; se falhar, mostra o erro e ressincroniza. */
function persist(run: () => PromiseLike<{ error: { message: string } | null }>) {
  Promise.resolve(run())
    .then(({ error }) => {
      if (error) { set({ error: `Não foi possível salvar: ${friendly(error.message)}` }); void loadData(); }
    })
    .catch((e: Error) => { set({ error: `Falha de conexão: ${e.message}` }); void loadData(); });
}

export const actions = {
  setMonth: (month: string) => set({ month }),
  toggleHide() {
    const hide = !state.hide;
    set({ hide });
    try { localStorage.setItem(HIDE_KEY, hide ? "1" : "0"); } catch { /* ignore */ }
  },
  clearError: () => set({ error: "" }),
  add<K extends keyof Data>(k: K, item: Data[K][number]) {
    set({ data: { ...state.data, [k]: [...state.data[k], item] } });
    persist(() => supabase.from(k).insert(toDb(item)));
  },
  update<K extends keyof Data>(k: K, id: string, patch: Partial<Data[K][number]>) {
    set({ data: { ...state.data, [k]: (state.data[k] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) } });
    persist(() => supabase.from(k).update(toDb(patch)).eq("id", id));
  },
  remove<K extends keyof Data>(k: K, id: string) {
    const next = { ...state.data, [k]: (state.data[k] as { id: string }[]).filter((x) => x.id !== id) } as Data;
    // o banco apaga as compras do cartão em cascata; espelha isso na tela
    if (k === "cards") next.purchases = next.purchases.filter((p) => p.cardId !== id);
    set({ data: next });
    persist(() => supabase.from(k).delete().eq("id", id));
  },
};

// ---------- cálculos ----------
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return ym(new Date(y!, m! - 1 + n, 1));
}
export function monthDiff(a: string, b: string) {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb! - ya!) * 12 + (mb! - ma!);
}
/** Parcela de uma compra que cai no mês informado (0 se não houver). */
export function installmentIn(p: Purchase, month: string) {
  const i = monthDiff(p.month, month);
  return i >= 0 && i < p.installments ? p.amount / p.installments : 0;
}
export function invoice(d: Data, cardId: string | null, month: string) {
  return d.purchases.filter((p) => !cardId || p.cardId === cardId).reduce((s, p) => s + installmentIn(p, month), 0);
}
/** Limite comprometido: parcelas a partir do mês atual. */
export function usedLimit(d: Data, cardId: string, month: string) {
  return d.purchases.filter((p) => p.cardId === cardId).reduce((s, p) => {
    let t = 0;
    for (let i = 0; i < p.installments; i++) if (monthDiff(month, addMonths(p.month, i)) >= 0) t += p.amount / p.installments;
    return s + t;
  }, 0);
}
export function summary(d: Data, month: string) {
  const income = d.incomes.filter((i) => i.month === month).reduce((s, i) => s + i.amount, 0);
  const bills = d.bills.filter((b) => b.due.startsWith(month));
  const billsTotal = bills.reduce((s, b) => s + b.amount, 0);
  const billsPending = bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const cards = invoice(d, null, month);
  const transfers = d.transfers.filter((t) => t.date.startsWith(month));
  const transfersTotal = transfers.reduce((s, t) => s + t.amount, 0);
  const transfersPending = transfers.filter((t) => !t.done).reduce((s, t) => s + t.amount, 0);
  const expenses = billsTotal + cards;
  return { income, billsTotal, billsPending, cards, expenses, transfersTotal, transfersPending, transfersCount: transfers.length, free: income - expenses - transfersTotal };
}
export const brl = (v: number, hide = false) => (hide ? "R$ •••••" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
export const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y!, mo! - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
export const CATEGORIES = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Assinaturas", "Outros"];
