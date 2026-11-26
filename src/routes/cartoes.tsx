import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { actions, addMonths, brl, installmentIn, invoice, monthDiff, usedLimit, useVn } from "@/lib/vn-store";

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
          return (
            <CardBox key={c.id} title={c.name} sub={`Vence dia ${c.dueDay}${c.last4 ? ` · final ${c.last4}` : ""}`} icon={<CreditCard className="h-4 w-4" />} action={<button aria-label="Excluir cartão" onClick={() => actions.remove("cards", c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}>
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
                    <span className="flex shrink-0 items-center gap-3">{brl(installmentIn(p, month), hide)}<button aria-label="Excluir" onClick={() => actions.remove("purchases", p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></span>
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
