import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { actions, brl, useVn } from "@/lib/vn-store";

export const Route = createFileRoute("/transferencias")({
  head: () => ({ meta: [{ title: "Transferências — VnFinanças" }, { name: "description", content: "Transferências para pessoas." }, { property: "og:title", content: "Transferências — VnFinanças" }, { property: "og:description", content: "Transferências para pessoas." }] }),
  component: () => <Shell title="Transferências"><Page /></Shell>,
});

function Page() {
  const { data, month, hide } = useVn();
  const f = useForm();
  const list = data.transfers.filter((t) => t.date.startsWith(month));
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Transferências para pessoas</h1><MonthBar /></div>
      <CardBox title="Transferências do mês" sub={`${list.filter((t) => !t.done).length} pendente(s)`} action={<Btn onClick={() => f.open("transfer")}><Plus className="h-4 w-4" />Adicionar</Btn>}>
        {list.length === 0 ? <Empty>Nenhuma transferência neste mês.</Empty> : <ul className="divide-y divide-border">
          {list.map((t) => (
            <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <div className="min-w-0"><p className="truncate text-sm">{t.person}</p><p className="text-xs text-muted-foreground">{t.date.split("-").reverse().join("/")} · {brl(t.amount, hide)}</p></div>
              <div className="flex items-center gap-3">
                {t.done ? <button onClick={() => actions.update("transfers", t.id, { done: false })} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs text-success"><Check className="h-3 w-3" />Transferido</button>
                  : <Btn variant="ghost" onClick={() => actions.update("transfers", t.id, { done: true })}>Marcar como transferido</Btn>}
                <button aria-label="Excluir" onClick={() => actions.remove("transfers", t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>}
      </CardBox>
      {f.modal}
    </>
  );
}
