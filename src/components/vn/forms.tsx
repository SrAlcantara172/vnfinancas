import { useState, type FormEvent } from "react";
import { z } from "zod";
import { actions, uid, CATEGORIES, useVn } from "@/lib/vn-store";
import { Btn, Field, Modal } from "./ui";

export type FormKind = "income" | "bill" | "transfer" | "card" | "purchase";
const titles: Record<FormKind, string> = { income: "Nova renda", bill: "Nova conta do mês", transfer: "Nova transferência", card: "Novo cartão de crédito", purchase: "Nova compra no cartão" };
const money = z.coerce.number().positive("Informe um valor maior que zero").max(1e9);
const text = z.string().trim().min(1, "Campo obrigatório").max(100);

export function EntryModal({ kind, onClose }: { kind: FormKind | null; onClose: () => void }) {
  const { month, data } = useVn();
  const [err, setErr] = useState("");
  if (!kind) return null;
  const todayIso = new Date().toISOString().slice(0, 10);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Partial<Record<"desc" | "amount" | "month" | "category" | "due" | "paid" | "person" | "date" | "name" | "limit" | "dueDay" | "cardId" | "installments" | "email" | "password" | "last4", string>>;
    try {
      if (kind === "income") actions.add("incomes", { id: uid(), desc: text.parse(f.desc), amount: money.parse(f.amount), month: f.month || month });
      if (kind === "bill") actions.add("bills", { id: uid(), desc: text.parse(f.desc), amount: money.parse(f.amount), category: f.category || "Outros", due: f.due || todayIso, paid: f.paid === "on" });
      if (kind === "transfer") actions.add("transfers", { id: uid(), person: text.parse(f.person), amount: money.parse(f.amount), date: f.date || todayIso, done: false });
      if (kind === "card") actions.add("cards", { id: uid(), name: text.parse(f.name), limit: money.parse(f.limit), dueDay: z.coerce.number().int().min(1).max(31).parse(f.dueDay), last4: f.last4?.trim() ? z.string().regex(/^\d{4}$/, "Informe os 4 últimos dígitos do cartão").parse(f.last4.trim()) : undefined });
      if (kind === "purchase") {
        if (!f.cardId) throw new Error("Cadastre um cartão primeiro");
        actions.add("purchases", { id: uid(), cardId: f.cardId, desc: text.parse(f.desc), amount: money.parse(f.amount), installments: z.coerce.number().int().min(1).max(48).parse(f.installments), month: f.month || month, category: f.category || "Outros" });
      }
      setErr(""); onClose();
    } catch (x) {
      setErr(x instanceof z.ZodError ? x.issues[0]?.message ?? "Dados inválidos" : (x as Error).message);
    }
  }
  const cat = <Field label="Categoria"><select name="category" className="vn-input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>;

  return (
    <Modal open onClose={onClose} title={titles[kind]}>
      <form onSubmit={submit}>
        {kind === "income" && <>
          <Field label="Descrição"><input name="desc" className="vn-input" placeholder="Salário" /></Field>
          <Field label="Valor (R$)"><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          <Field label="Mês"><input name="month" type="month" defaultValue={month} className="vn-input" /></Field>
        </>}
        {kind === "bill" && <>
          <Field label="Descrição"><input name="desc" className="vn-input" placeholder="Aluguel" /></Field>
          <Field label="Valor (R$)"><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          {cat}
          <Field label="Vencimento"><input name="due" type="date" defaultValue={`${month}-10`} className="vn-input" /></Field>
          <label className="mb-3 flex items-center gap-2 text-sm"><input name="paid" type="checkbox" className="accent-[var(--success)]" /> Já está paga</label>
        </>}
        {kind === "transfer" && <>
          <Field label="Pessoa"><input name="person" className="vn-input" placeholder="Maria" /></Field>
          <Field label="Valor (R$)"><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          <Field label="Data"><input name="date" type="date" defaultValue={`${month}-05`} className="vn-input" /></Field>
        </>}
        {kind === "card" && <>
          <Field label="Nome do cartão"><input name="name" className="vn-input" placeholder="Nubank" /></Field>
          <Field label="Limite (R$)"><input name="limit" type="number" step="0.01" className="vn-input" /></Field>
          <Field label="Dia de vencimento da fatura"><input name="dueDay" type="number" min={1} max={31} defaultValue={10} className="vn-input" /></Field>
          <Field label="Final do cartão (4 dígitos, para o webhook)"><input name="last4" inputMode="numeric" maxLength={4} pattern="\d{4}" className="vn-input" placeholder="1234" /></Field>
        </>}
        {kind === "purchase" && <>
          <Field label="Cartão"><select name="cardId" className="vn-input">{data.cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Descrição"><input name="desc" className="vn-input" placeholder="Notebook" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total (R$)"><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
            <Field label="Parcelas"><input name="installments" type="number" min={1} max={48} defaultValue={1} className="vn-input" /></Field>
          </div>
          {cat}
          <Field label="Primeira fatura"><input name="month" type="month" defaultValue={month} className="vn-input" /></Field>
        </>}
        {err && <p className="mb-3 text-xs text-destructive">{err}</p>}
        <Btn type="submit" className="w-full">Salvar</Btn>
      </form>
    </Modal>
  );
}
