import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { actions, billEndMonth, billInstallmentNum, brl, shortMonthLabel, useVn } from "@/lib/vn-store";

export const Route = createFileRoute("/contas")({
  head: () => ({ meta: [{ title: "Contas do mês — VnFinanças" }, { name: "description", content: "Contas pagas e pendentes do mês." }, { property: "og:title", content: "Contas do mês — VnFinanças" }, { property: "og:description", content: "Contas pagas e pendentes do mês." }] }),
  component: () => <Shell title="Contas do mês"><Page /></Shell>,
});

function Page() {
  const { data, month, hide } = useVn();
  const f = useForm();
  const list = data.bills
    .filter((b) => billInstallmentNum(b, month) > 0)
    .sort((a, b) => a.due.slice(8, 10).localeCompare(b.due.slice(8, 10)) || a.desc.localeCompare(b.desc));
  const pend = list.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Contas do mês</h1><MonthBar /></div>
      <CardBox title="Contas e empréstimos" sub={`Pendente: ${brl(pend, hide)}`} action={<Btn onClick={() => f.open("bill")}><Plus className="h-4 w-4" />Adicionar</Btn>}>
        {list.length === 0 ? <Empty>Nenhuma conta neste mês.</Empty> : <ul className="divide-y divide-border">
          {list.map((b) => {
            const count = b.installments && b.installments > 1 ? b.installments : 1;
            const currentNum = billInstallmentNum(b, month);
            const dueDay = b.due.slice(8, 10) || "10";
            const endLabel = count > 1 ? shortMonthLabel(billEndMonth(b)) : null;

            return (
              <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 truncate text-sm">
                    <span className="truncate">{b.desc}</span>
                    {count > 1 && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        {currentNum}/{count} · acaba em {endLabel}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.category} · dia {dueDay}
                    {count > 1 ? ` · total ${brl(b.amount * count, hide)}` : ` · vence ${b.due.split("-").reverse().join("/")}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{brl(b.amount, hide)}</span>
                  <button onClick={() => actions.update("bills", b.id, { paid: !b.paid })} className={`rounded-full px-2.5 py-1 text-xs font-medium ${b.paid ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{b.paid ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" />Pago</span> : "Pendente"}</button>
                  <button aria-label="Excluir" onClick={() => actions.remove("bills", b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            );
          })}
        </ul>}
      </CardBox>
      {f.modal}
    </>
  );
}