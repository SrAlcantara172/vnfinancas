import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, CalendarCheck2, ChevronLeft, ChevronRight, CreditCard, Pencil, Plus, Repeat, Trash2, Utensils } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty, Field, Modal } from "@/components/vn/ui";
import { actions, addMonths, brl, installmentIn, invoice, mealSpent, monthDiff, monthLabel, usedLimit, useVn, type Card } from "@/lib/vn-store";

export const Route = createFileRoute("/cartoes")({
  head: () => ({ meta: [{ title: "Cartões de crédito — VnFinanças" }, { name: "description", content: "Cartões, faturas e compras parceladas." }, { property: "og:title", content: "Cartões de crédito — VnFinanças" }, { property: "og:description", content: "Cartões, faturas e compras parceladas." }] }),
  component: () => <Shell title="Cartões"><Page /></Shell>,
});

function Page() {
  const { data, month, hide } = useVn();
  const f = useForm();
  const [editing, setEditing] = useState<Card | null>(null);

  function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const closingDay = Math.min(31, Math.max(1, Number(fd.get("closingDay")) || 1));
    const dueDay = Math.min(31, Math.max(1, Number(fd.get("dueDay")) || 10));
    const rawInvoice = String(fd.get("invoiceMonth") || "").trim();
    const invoiceMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawInvoice) ? rawInvoice : (editing.invoiceMonth || month);

    actions.update("cards", editing.id, { closingDay, dueDay, invoiceMonth });
    setEditing(null);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Cartões</h1><MonthBar /></div>
      <div className="mb-4 flex flex-wrap gap-2"><Btn onClick={() => f.open("card")}><Plus className="h-4 w-4" />Novo cartão</Btn><Btn variant="ghost" onClick={() => f.open("purchase")} disabled={!data.cards.length}><Plus className="h-4 w-4" />Novo lançamento</Btn></div>
      {data.cards.length === 0 && <Empty>Cadastre seu primeiro cartão.</Empty>}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.cards.map((c) => {
          if (c.kind === "meal") {
            const spent = mealSpent(data, c.id);
            const remaining = c.limit - spent;
            const mealItems = data.purchases.filter((p) => p.cardId === c.id);
            return (
              <CardBox
                key={c.id}
                title={c.name}
                sub={`Vale-refeição${c.last4 ? ` · final ${c.last4}` : ""}`}
                icon={<Utensils className="h-4 w-4" />}
                action={
                  <button aria-label="Excluir cartão" onClick={() => actions.remove("cards", c.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                }
              >
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, c.limit > 0 ? (spent / c.limit) * 100 : 0)}%` }} />
                </div>
                <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Quanto ainda tem</p><p className={`font-medium ${remaining < 0 ? "text-destructive" : "text-success"}`}>{brl(remaining, hide)}</p></div>
                  <div><p className="text-muted-foreground">Quanto já gastou</p><p className="font-medium text-warning">{brl(spent, hide)}</p></div>
                  <div><p className="text-muted-foreground">Saldo inicial</p><p className="font-medium">{brl(c.limit, hide)}</p></div>
                </div>
                {mealItems.length === 0 ? <Empty>Nenhum uso registrado.</Empty> : (
                  <ul className="divide-y divide-border">
                    {mealItems.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{p.desc}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {brl(p.amount, hide)}
                          <button aria-label="Excluir" onClick={() => actions.remove("purchases", p.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBox>
            );
          }

          const used = usedLimit(data, c.id, month);
          const purchases = data.purchases.filter((p) => p.cardId === c.id && installmentIn(p, month) > 0);
          const activeInvoice = c.invoiceMonth || month;
          const nextInvoice = addMonths(activeInvoice, 1);

          return (
            <CardBox
              key={c.id}
              title={c.name}
              sub={`Melhor dia ${c.closingDay ?? 1} · Vence dia ${c.dueDay}${c.last4 ? ` · final ${c.last4}` : ""}`}
              icon={<CreditCard className="h-4 w-4" />}
              action={
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      actions.update("cards", c.id, { invoiceMonth: nextInvoice });
                      actions.setMonth(nextInvoice);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                    title={`Fechar fatura atual e direcionar novas compras para ${monthLabel(nextInvoice)}`}
                  >
                    <CalendarCheck2 className="h-3.5 w-3.5" />
                    Fechar fatura
                  </button>
                  <button
                    type="button"
                    aria-label="Editar datas do cartão"
                    title="Editar melhor dia de compra e vencimento"
                    onClick={() => setEditing(c)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button aria-label="Excluir cartão" onClick={() => actions.remove("cards", c.id)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              }
            >
              <div className="mb-3 flex items-center justify-between rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">Novas compras caem em:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Voltar mês da fatura aberta"
                    onClick={() => actions.update("cards", c.id, { invoiceMonth: addMonths(activeInvoice, -1) })}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-28 text-center font-medium capitalize text-foreground">{monthLabel(activeInvoice)}</span>
                  <button
                    type="button"
                    aria-label="Avançar mês da fatura aberta"
                    onClick={() => actions.update("cards", c.id, { invoiceMonth: nextInvoice })}
                    className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (used / c.limit) * 100)}%` }} /></div>
              <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-muted-foreground">Disponível</p><p className="font-medium">{brl(c.limit - used, hide)}</p></div>
                <div><p className="text-muted-foreground">Fatura atual</p><p className="font-medium text-warning">{brl(invoice(data, c.id, month), hide)}</p></div>
                <div><p className="text-muted-foreground">Próxima</p><p className="font-medium">{brl(invoice(data, c.id, addMonths(month, 1)), hide)}</p></div>
              </div>
              {purchases.length === 0 ? <Empty>Sem lançamentos nesta fatura.</Empty> : <ul className="divide-y divide-border">
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 truncate">
                      <span className="truncate">{p.desc}</span>
                      {p.recurring ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Repeat className="h-2.5 w-2.5" />mensal
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{monthDiff(p.month, month) + 1}/{p.installments}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {brl(installmentIn(p, month), hide)}
                      <button
                        type="button"
                        aria-label="Mover para conta paga"
                        title="Mover para Contas do mês como pago"
                        onClick={() => actions.moveToPaidBill(p, month)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-success"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                      <button aria-label="Excluir" onClick={() => actions.remove("purchases", p.id)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  </li>
                ))}
              </ul>}
            </CardBox>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Editar ${editing.name}` : "Editar cartão"}>
        {editing && (
          <form onSubmit={saveEdit}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Melhor dia de compra">
                <input name="closingDay" type="number" min={1} max={31} defaultValue={editing.closingDay ?? 1} className="vn-input" />
              </Field>
              <Field label="Dia de vencimento">
                <input name="dueDay" type="number" min={1} max={31} defaultValue={editing.dueDay} className="vn-input" />
              </Field>
            </div>
            <Field label="Fatura que está recebendo compras">
              <input name="invoiceMonth" type="month" defaultValue={editing.invoiceMonth || month} className="vn-input" />
            </Field>
            <Btn type="submit" className="w-full">Salvar alterações</Btn>
          </form>
        )}
      </Modal>

      {f.modal}
    </>
  );
}