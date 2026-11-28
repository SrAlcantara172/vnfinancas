import { useState, type FormEvent } from "react";
import { z } from "zod";
import { actions, uid, toBrl, CATEGORIES, useVn, type CardKind } from "@/lib/vn-store";
import { Btn, Field, Modal } from "./ui";

export type FormKind = "income" | "bill" | "transfer" | "card" | "purchase";
const titles: Record<FormKind, string> = { income: "Nova renda", bill: "Nova conta ou assinatura", transfer: "Nova transferência", card: "Novo cartão", purchase: "Nova compra no cartão" };
const money = z.coerce.number().positive("Informe um valor maior que zero").max(1e9);
const text = z.string().trim().min(1, "Campo obrigatório").max(100);

export function EntryModal({ kind, onClose }: { kind: FormKind | null; onClose: () => void }) {
  const { month, data, currency } = useVn();
  const [err, setErr] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [cardKind, setCardKind] = useState<CardKind>("credit");
  const [recurring, setRecurring] = useState(false);
  const [billCategory, setBillCategory] = useState<string>(CATEGORIES[0] ?? "Moradia");
  if (!kind) return null;
  const sym = currency === "EUR" ? "€" : "R$";
  const todayIso = new Date().toISOString().slice(0, 10);
  const activeCard = data.cards.find((c) => c.id === (selectedCardId || data.cards[0]?.id));
  const isMealSelected = activeCard?.kind === "meal";
  const defaultPurchaseMonth = isMealSelected ? month : (activeCard?.invoiceMonth || month);
  const isBillSubscription = billCategory === "Assinaturas";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Partial<Record<"desc" | "amount" | "installments" | "month" | "category" | "due" | "paid" | "person" | "date" | "name" | "limit" | "dueDay" | "closingDay" | "invoiceMonth" | "cardId" | "email" | "password" | "last4", string>>;
    try {
      if (kind === "income") actions.add("incomes", { id: uid(), desc: text.parse(f.desc), amount: toBrl(money.parse(f.amount)), month: f.month || month });
      if (kind === "bill") {
        const category = f.category || "Outros";
        const isSub = category === "Assinaturas";
        const installments = isSub ? 1 : z.coerce.number().int().min(1).max(120).parse(f.installments || 1);
        const dueDate = f.due || `${month}-10`;
        const isPaid = f.paid === "on";
        const dueMonth = dueDate.slice(0, 7) || month;
        actions.add("bills", {
          id: uid(),
          desc: text.parse(f.desc),
          amount: toBrl(money.parse(f.amount)),
          category,
          due: dueDate,
          paid: isPaid,
          installments,
          recurring: isSub,
          paidMonths: isPaid ? { [dueMonth]: true } : {},
        });
      }
      if (kind === "transfer") actions.add("transfers", { id: uid(), person: text.parse(f.person), amount: toBrl(money.parse(f.amount)), date: f.date || todayIso, done: false });
      if (kind === "card") {
        const isMeal = cardKind === "meal";
        const closingDay = isMeal ? 1 : z.coerce.number().int().min(1).max(31).parse(f.closingDay || 1);
        const dueDay = isMeal ? 10 : z.coerce.number().int().min(1).max(31).parse(f.dueDay);
        const invoiceMonth = isMeal ? undefined : (f.invoiceMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(f.invoiceMonth) ? f.invoiceMonth : month);
        actions.add("cards", {
          id: uid(),
          name: text.parse(f.name),
          limit: toBrl(money.parse(f.limit)),
          dueDay,
          closingDay,
          invoiceMonth,
          kind: cardKind,
          last4: f.last4?.trim() ? z.string().regex(/^\d{4}$/, "Informe os 4 últimos dígitos do cartão").parse(f.last4.trim()) : undefined,
        });
      }
      if (kind === "purchase") {
        if (!f.cardId) throw new Error("Cadastre um cartão primeiro");
        const card = data.cards.find((c) => c.id === f.cardId);
        const isMeal = card?.kind === "meal";
        const isRec = !isMeal && recurring;
        actions.add("purchases", {
          id: uid(),
          cardId: f.cardId,
          desc: text.parse(f.desc),
          amount: toBrl(money.parse(f.amount)),
          installments: isRec ? 1 : z.coerce.number().int().min(1).max(48).parse(f.installments || 1),
          month: isMeal ? month : (f.month || card?.invoiceMonth || month),
          category: isMeal ? "Alimentação" : (f.category || "Outros"),
          recurring: isRec,
        });
      }
      setErr(""); setRecurring(false); setCardKind("credit"); setSelectedCardId(""); setBillCategory(CATEGORIES[0] ?? "Moradia"); onClose();
    } catch (x) {
      setErr(x instanceof z.ZodError ? x.issues[0]?.message ?? "Dados inválidos" : (x as Error).message);
    }
  }

  return (
    <Modal open onClose={onClose} title={titles[kind]}>
      <form onSubmit={submit}>
        {kind === "income" && <>
          <Field label="Descrição"><input name="desc" className="vn-input" placeholder="Salário" /></Field>
          <Field label={`Valor (${sym})`}><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          <Field label="Mês"><input name="month" type="month" defaultValue={month} className="vn-input" /></Field>
        </>}
        {kind === "bill" && <>
          <Field label="Categoria">
            <select name="category" value={billCategory} onChange={(e) => setBillCategory(e.target.value)} className="vn-input">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="O que é / Descrição"><input name="desc" className="vn-input" placeholder={isBillSubscription ? "Netflix / Internet" : "Empréstimo pessoal"} /></Field>
          {isBillSubscription ? (
            <Field label={`Valor mensal (${sym})`}><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Valor da parcela (${sym})`}><input name="amount" type="number" step="0.01" className="vn-input" placeholder="176.94" /></Field>
              <Field label="Parcelas (1 = à vista)"><input name="installments" type="number" min={1} max={120} defaultValue={1} className="vn-input" /></Field>
            </div>
          )}
          <Field label={isBillSubscription ? "Início / dia de cobrança" : "Data da 1ª fatura / vencimento"}><input name="due" type="date" defaultValue={`${month}-10`} className="vn-input" /></Field>
          {isBillSubscription && <p className="mb-3 text-xs text-muted-foreground">Assinaturas ficam ativas todos os meses até você excluir.</p>}
          <label className="mb-3 flex items-center gap-2 text-sm"><input name="paid" type="checkbox" className="accent-[var(--success)]" /> Já está paga</label>
        </>}
        {kind === "transfer" && <>
          <Field label="Pessoa"><input name="person" className="vn-input" placeholder="Maria" /></Field>
          <Field label={`Valor (${sym})`}><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          <Field label="Data"><input name="date" type="date" defaultValue={`${month}-05`} className="vn-input" /></Field>
        </>}
        {kind === "card" && <>
          <Field label="Tipo">
            <select value={cardKind} onChange={(e) => setCardKind(e.target.value as CardKind)} className="vn-input">
              <option value="credit">Cartão de crédito</option>
              <option value="meal">Vale-refeição / benefício (ex.: Pluxee)</option>
            </select>
          </Field>
          <Field label="Nome do cartão"><input name="name" className="vn-input" placeholder={cardKind === "meal" ? "Pluxee" : "Nubank"} /></Field>
          <Field label={cardKind === "meal" ? `Saldo disponível (${sym})` : `Limite (${sym})`}><input name="limit" type="number" step="0.01" className="vn-input" /></Field>
          {cardKind === "credit" && <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Melhor dia de compra"><input name="closingDay" type="number" min={1} max={31} placeholder="Ex: 3" className="vn-input" /></Field>
              <Field label="Dia de vencimento"><input name="dueDay" type="number" min={1} max={31} defaultValue={10} className="vn-input" /></Field>
            </div>
            <Field label="Fatura que está recebendo compras"><input name="invoiceMonth" type="month" defaultValue={month} className="vn-input" /></Field>
          </>}
          <Field label="Final do cartão (4 dígitos, para o webhook)"><input name="last4" inputMode="numeric" maxLength={4} pattern="\d{4}" className="vn-input" placeholder="1234" /></Field>
        </>}
        {kind === "purchase" && <>
          <Field label="Cartão">
            <select name="cardId" defaultValue={activeCard?.id} onChange={(e) => setSelectedCardId(e.target.value)} className="vn-input">
              {data.cards.map((c) => <option key={c.id} value={c.id}>{c.name}{c.kind === "meal" ? " (Refeição)" : ""}</option>)}
            </select>
          </Field>
          <Field label="Descrição"><input name="desc" className="vn-input" placeholder={isMealSelected ? "Almoço" : "Notebook"} /></Field>
          {isMealSelected ? (
            <Field label={`Valor gasto (${sym})`}><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
          ) : (
            <>
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="accent-primary" />
                Assinatura recorrente (repete todo mês até cancelar)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label={recurring ? `Valor mensal (${sym})` : `Valor total (${sym})`}><input name="amount" type="number" step="0.01" className="vn-input" /></Field>
                {!recurring && <Field label="Parcelas"><input name="installments" type="number" min={1} max={48} defaultValue={1} className="vn-input" /></Field>}
              </div>
              <Field label="Categoria"><select name="category" className="vn-input">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Fatura de cobrança"><input key={defaultPurchaseMonth} name="month" type="month" defaultValue={defaultPurchaseMonth} className="vn-input" /></Field>
            </>
          )}
        </>}
        {err && <p className="mb-3 text-xs text-destructive">{err}</p>}
        <Btn type="submit" className="w-full">Salvar</Btn>
      </form>
    </Modal>
  );
}