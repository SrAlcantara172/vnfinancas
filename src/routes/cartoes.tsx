import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CalendarCheck2, CreditCard, Plus, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { actions, addMonths, brl, installmentIn, invoice, monthDiff, monthLabel, usedLimit, useVn } from "@/lib/vn-store";

export const Route = createFileRoute("/cartoes")({
  head: () => ({ meta: [{ title: "Cartões de crédito — VnFinanças" }, { name: "description", content: "Cartões, faturas e compras parceladas." }, { property: "og:title", content: "Cartões de crédito — VnFinanças" }, { property: "og:description", content: "Cartões, faturas e compras parceladas." }] }),
  component: () => <Shell title="Cartões"><Page /></Shell>,
});

function Page() {
  const { data, month, hide } = useVn();
  const f = useForm();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Cartões de crédito</h1><MonthBar /></div>
      <div className="mb-4 flex flex-wrap gap-2"><Btn onClick={() => f.open("card")}><Plus className="h-4 w-4" />Novo cartão</Btn><Btn variant="ghost" onClick={() => f.open("purchase")} disabled={!data.cards.length}><Plus className="h-4 w-4" />Nova compra</Btn></div>
      {data.cards.length === 0 && <Empty>Cadastre seu primeiro cartão.</Empty>}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.cards.map((c) => {
          const used = usedLimit(data, c.id, month);
          const purchases = data.purchases.filter((p) => p.cardId === c.id && installmentIn(p, month) > 0);
          const activeInvoice = c.invoiceMonth || month;
          const nextInvoice = addMonths(activeInvoice, 1);

          return (
            <CardBox
              key={c.id}
              title={c.name}
              sub={`Fecha dia ${c.closingDay ?? 28} · Vence dia ${c.dueDay}${c.last4 ? ` · final ${c.last4}` : ""}`}
              icon={<CreditCard className="h-4 w-4" />}
              action={
                <div className="flex items-center gap-2">
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
                  <button aria-label="Excluir cartão" onClick={() => actions.remove("cards", c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              }
            >
              <p className="mb-2 text-xs text-muted-foreground">Novas compras indo para: <span className="capitalize text-foreground">{monthLabel(activeInvoice)}</span></p>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (used / c.limit) * 100)}%` }} /></div>
              <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-muted-foreground">Disponível</p><p className="font-medium">{brl(c.limit - used, hide)}</p></div>
                <div><p className="text-muted-foreground">Fatura atual</p><p className="font-medium text-warning">{brl(invoice(data, c.id, month), hide)}</p></div>
                <div><p className="text-muted-foreground">Próxima</p><p className="font-medium">{brl(invoice(data, c.id, addMonths(month, 1)), hide)}</p></div>
              </div>
              {purchases.length === 0 ? <Empty>Sem lançamentos nesta fatura.</Empty> : <ul className="divide-y divide-border">
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate">{p.desc} <span className="text-xs text-muted-foreground">{monthDiff(p.month, month) + 1}/{p.installments}</span></span>
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
      {f.modal}
    </>
  );
}