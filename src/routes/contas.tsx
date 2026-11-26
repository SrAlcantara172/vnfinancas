import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { actions, brl, useVn } from "@/lib/vn-store";

export const Route = createFileRoute("/contas")({
  head: () => ({ meta: [{ title: "Contas do mês — VnFinanças" }, { name: "description", content: "Contas pagas e pendentes do mês." }, { property: "og:title", content: "Contas do mês — VnFinanças" }, { property: "og:description", content: "Contas pagas e pendentes do mês." }] }),
  component: () => <Shell title="Contas do mês"><Page /></Shell>,
});

function Page() {
  const { data, month, hide } = useVn();
  const f = useForm();
  const list = data.bills.filter((b) => b.due.startsWith(month)).sort((a, b) => a.due.localeCompare(b.due));
  const pend = list.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Contas do mês</h1><MonthBar /></div>
      <CardBox title="Contas" sub={`Pendente: ${brl(pend, hide)}`} action={<Btn onClick={() => f.open("bill")}><Plus className="h-4 w-4" />Adicionar</Btn>}>
        {list.length === 0 ? <Empty>Nenhuma conta neste mês.</Empty> : <ul className="divide-y divide-border">
          {list.map((b) => (
            <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <div className="min-w-0"><p className="truncate text-sm">{b.desc}</p><p className="text-xs text-muted-foreground">{b.category} · vence {b.due.split("-").reverse().join("/")}</p></div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{brl(b.amount, hide)}</span>
                <button onClick={() => actions.update("bills", b.id, { paid: !b.paid })} className={`rounded-full px-2.5 py-1 text-xs font-medium ${b.paid ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{b.paid ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" />Pago</span> : "Pendente"}</button>
                <button aria-label="Excluir" onClick={() => actions.remove("bills", b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>}
      </CardBox>
      {f.modal}
    </>
  );
}
