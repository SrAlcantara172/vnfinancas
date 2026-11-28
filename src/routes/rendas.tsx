import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Shell, MonthBar, useForm } from "@/components/vn/shell";
import { Btn, CardBox, Empty, Field, Modal } from "@/components/vn/ui";
import { actions, brl, incomeInMonth, isRecurringIncome, monthLabel, shortMonthLabel, toBrl, useVn, type Income } from "@/lib/vn-store";

export const Route = createFileRoute("/rendas")({
  head: () => ({ meta: [{ title: "Rendas do mês — VnFinanças" }, { name: "description", content: "Salário e entradas registradas do mês." }, { property: "og:title", content: "Rendas do mês — VnFinanças" }, { property: "og:description", content: "Salário e entradas registradas do mês." }] }),
  component: () => <Shell title="Rendas do mês"><Page /></Shell>,
});

function Page() {
  const { data, month, hide, currency } = useVn();
  const f = useForm();
  const [editing, setEditing] = useState<Income | null>(null);
  const [editRecurring, setEditRecurring] = useState(false);
  const sym = currency === "EUR" ? "€" : "R$";

  const list = data.incomes
    .filter((i) => incomeInMonth(i, month))
    .sort((a, b) => Number(isRecurringIncome(b)) - Number(isRecurringIncome(a)) || a.desc.localeCompare(b.desc));
  const total = list.reduce((s, i) => s + i.amount, 0);

  function openEdit(item: Income) {
    setEditing(item);
    setEditRecurring(isRecurringIncome(item));
  }

  function saveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const desc = String(fd.get("desc") || "").trim();
    const rawAmount = Number(fd.get("amount"));
    if (!desc || !Number.isFinite(rawAmount) || rawAmount <= 0) return;

    const rawMonth = String(fd.get("month") || "").trim();
    const targetMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : editing.month;

    actions.update("incomes", editing.id, {
      desc,
      amount: toBrl(rawAmount),
      month: targetMonth,
      recurring: editRecurring,
    });
    setEditing(null);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Rendas</h1><MonthBar /></div>
      <CardBox title="Entradas do mês" sub={`Total: ${brl(total, hide)}`} action={<Btn onClick={() => f.open("income")}><Plus className="h-4 w-4" />Adicionar</Btn>}>
        {list.length === 0 ? <Empty>Nenhuma renda registrada neste mês.</Empty> : <ul className="divide-y divide-border">
          {list.map((i) => {
            const rec = isRecurringIncome(i);
            return (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 truncate text-sm">
                    <span className="truncate">{i.desc}</span>
                    {rec && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        <Repeat className="h-2.5 w-2.5" />mensal
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rec ? `Fixa desde ${shortMonthLabel(i.month)}` : monthLabel(i.month)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mr-1 text-sm font-medium text-success">{brl(i.amount, hide)}</span>
                  <button
                    type="button"
                    aria-label="Editar renda"
                    title="Editar renda"
                    onClick={() => openEdit(i)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir"
                    onClick={() => actions.remove("incomes", i.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>}
      </CardBox>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar renda">
        {editing && (
          <form onSubmit={saveEdit}>
            <Field label="Descrição">
              <input name="desc" defaultValue={editing.desc} className="vn-input" />
            </Field>
            <Field label={`Valor (${sym})`}>
              <input name="amount" type="number" step="0.01" defaultValue={editing.amount} className="vn-input" />
            </Field>
            <Field label={editRecurring ? "Válido a partir do mês" : "Mês"}>
              <input name="month" type="month" defaultValue={editing.month} className="vn-input" />
            </Field>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editRecurring} onChange={(e) => setEditRecurring(e.target.checked)} className="accent-primary" />
              Salário / renda fixa (repete todos os meses até mudar)
            </label>
            <Btn type="submit" className="w-full">Salvar alterações</Btn>
          </form>
        )}
      </Modal>

      {f.modal}
    </>
  );
}