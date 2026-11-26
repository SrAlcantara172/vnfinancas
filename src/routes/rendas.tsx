import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { actions, brl, useVn } from "@/lib/vn-store";

export const Route = createFileRoute("/rendas")({
  head: () => ({ meta: [{ title: "Rendas — VnFinanças" }, { name: "description", content: "Salário e rendas do mês." }, { property: "og:title", content: "Rendas — VnFinanças" }, { property: "og:description", content: "Salário e rendas do mês." }] }),
  component: () => <Shell title="Rendas"><Page /></Shell>,
});

function Page() {
  const { data, month, hide } = useVn();
  const f = useForm();
  const list = data.incomes.filter((i) => i.month === month);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Salário e rendas</h1><MonthBar /></div>
      <CardBox title="Rendas do mês" sub={`Total: ${brl(list.reduce((s, i) => s + i.amount, 0), hide)}`} action={<Btn onClick={() => f.open("income")}><Plus className="h-4 w-4" />Adicionar</Btn>}>
        {list.length === 0 ? <Empty>Nenhuma renda neste mês.</Empty> : <ul className="divide-y divide-border">
          {list.map((i) => <li key={i.id} className="flex items-center justify-between py-3"><span className="text-sm">{i.desc}</span><span className="flex items-center gap-3 text-sm font-medium text-success">{brl(i.amount, hide)}<button aria-label="Excluir" onClick={() => actions.remove("incomes", i.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></span></li>)}
        </ul>}
      </CardBox>
      {f.modal}
    </>
  );
}
