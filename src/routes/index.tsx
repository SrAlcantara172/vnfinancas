import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, CalendarClock, CalendarDays, CheckCircle2, CreditCard, Receipt, TrendingUp, Wallet, PiggyBank, Utensils } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ReactNode } from "react";
import { Shell, MonthBar } from "@/components/vn/shell";
import { CardBox, Empty } from "@/components/vn/ui";
import { actions, addMonths, billInstallmentNum, brl, installmentIn, invoice, isBillPaid, isInvoicePaid, isMealCard, mealAvailableInMonth, monthDiff, monthLabel, summary, usedLimit, useVn } from "@/lib/vn-store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Visão geral — VnFinanças" },
    { name: "description", content: "Resumo do mês: renda, saldo livre, despesas, cartões e vencimentos." },
    { property: "og:title", content: "Visão geral — VnFinanças" },
    { property: "og:description", content: "Resumo do mês: renda, saldo livre, despesas, cartões e vencimentos." },
  ] }),
  component: () => <Shell title="Visão geral"><Overview /></Shell>,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "oklch(0.6 0.15 300)", "oklch(0.7 0.12 200)", "oklch(0.55 0.1 120)", "oklch(0.65 0.14 40)"];

function freeMood(free: number, income: number) {
  if (free < 0) {
    return {
      text: "Opa, passou da conta este mês — melhor segurar os gastos.",
      tone: "text-destructive",
    };
  }
  if (income > 0 && free < income * 0.2) {
    return {
      text: "Saldo no azul, mas curtinho — melhor guardar um pouco e maneirar.",
      tone: "text-warning",
    };
  }
  return {
    text: "Tudo certo por aqui: sobra boa, tá podendo gastar com tranquilidade.",
    tone: "text-success",
  };
}

function expensesMood(pending: number, total: number, hasOverdueOrSoon: boolean) {
  if (total <= 0) {
    return {
      text: "Nenhuma despesa registrada neste mês.",
      tone: "text-muted-foreground",
    };
  }
  if (pending <= 0) {
    return {
      text: "Tudo pago por aqui, mês em dia!",
      tone: "text-success",
    };
  }
  if (hasOverdueOrSoon) {
    return {
      text: "Opa, ainda tem coisa pendente por aqui.",
      tone: "text-warning",
    };
  }
  return {
    text: "Ainda não venceu, tudo na paz — mas vale ficar de olho.",
    tone: "text-muted-foreground",
  };
}

function Stat({ label, value, hint, linkTo, linkLabel, icon, tone = "" }: { label: string; value: string; hint: ReactNode; linkTo?: string; linkLabel?: string; icon: ReactNode; tone?: string }) {
  return (
    <div className="vn-card p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          {linkTo && linkLabel && <Link to={linkTo} className="text-primary hover:underline">{linkLabel}</Link>}
          <span className="grid h-7 w-7 place-items-center rounded-md border border-border">{icon}</span>
        </div>
      </div>
      <p className={`text-xl font-semibold tracking-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Overview() {
  const { user, data, month, hide } = useVn();
  const s = summary(data, month);
  const h = new Date().getHours();
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

  // gráfico geral por categoria: contas/empréstimos/assinaturas + cartões de crédito + transferências
  const cats: Record<string, number> = {};
  data.bills
    .filter((b) => billInstallmentNum(b, month) > 0)
    .forEach((b) => {
      const cat = b.category || "Outros";
      cats[cat] = (cats[cat] ?? 0) + b.amount;
    });
  data.purchases
    .filter((p) => !isMealCard(data, p.cardId))
    .forEach((p) => {
      const v = installmentIn(p, month);
      if (v > 0) {
        const cat = p.category || "Outros";
        cats[cat] = (cats[cat] ?? 0) + v;
      }
    });
  const transfersTotal = data.transfers
    .filter((t) => t.date.startsWith(month))
    .reduce((acc, t) => acc + t.amount, 0);
  if (transfersTotal > 0) {
    cats["Transferências"] = (cats["Transferências"] ?? 0) + transfersTotal;
  }
  const pie = Object.entries(cats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const bars = Array.from({ length: 6 }, (_, i) => { const m = addMonths(month, i - 5); const x = summary(data, m); return { name: monthLabel(m).slice(0, 3), Renda: x.income, Despesas: x.expenses + x.transfersTotal }; });

  // compromissos futuros
  const future = data.purchases
    .filter((p) => !isMealCard(data, p.cardId))
    .flatMap((p) => {
      if (p.recurring) return [{ p, m: addMonths(month, 1), v: p.amount }];
      return Array.from({ length: p.installments }, (_, i) => ({ p, m: addMonths(p.month, i), v: p.amount / p.installments })).filter((x) => monthDiff(month, x.m) > 0);
    });
  const futureTotal = future.reduce((a, x) => a + x.v, 0);
  const byMonth: Record<string, number> = {};
  future.forEach((x) => (byMonth[x.m] = (byMonth[x.m] ?? 0) + x.v));

  // vencimentos próximos 7 dias
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const lim = new Date(now); lim.setDate(lim.getDate() + 7);
  const inRange = (d: Date) => d >= now && d <= lim;
  const dues = [
    ...data.bills.filter((b) => !isBillPaid(b, month) && inRange(new Date(b.due + "T00:00"))).map((b) => ({ id: b.id, name: b.desc, date: new Date(b.due + "T00:00"), v: b.amount })),
    ...data.cards.filter((c) => c.kind !== "meal").flatMap((c) => [0, 1].map((k) => { const d = new Date(now.getFullYear(), now.getMonth() + k, c.dueDay); const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return { id: c.id + k, name: `Fatura ${c.name}`, date: d, v: isInvoicePaid(c, m, data) ? 0 : invoice(data, c.id, m) }; })).filter((x) => inRange(x.date) && x.v > 0),
  ].sort((a, b) => +a.date - +b.date);

  const hasOverdueOrSoon = dues.length > 0 || data.bills.some((b) => billInstallmentNum(b, month) > 0 && !isBillPaid(b, month) && new Date(b.due + "T00:00") < now);
  const forecast = s.income - s.expenses - s.transfersTotal;
  const mood = freeMood(s.free, s.income);
  const expMood = expensesMood(s.pendingTotal, s.expenses, hasOverdueOrSoon);
  const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }, formatter: (v: number) => brl(v, hide) };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs capitalize text-muted-foreground">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{greet}, {user?.name.split(" ")[0]}.</h1>
          <p className="text-sm text-muted-foreground">Seu resumo financeiro do mês.</p>
        </div>
        <MonthBar />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Salário / Renda do mês" value={brl(s.income, hide)} hint="Entradas registradas" linkTo="/rendas" linkLabel="Ver rendas" icon={<Wallet className="h-3.5 w-3.5" />} tone="text-success" />
        <Stat
          label="Saldo livre a gastar"
          value={brl(s.free, hide)}
          hint={<><span className="block">Renda − despesas − transf.</span><span className={`mt-1 block font-medium ${mood.tone}`}>{mood.text}</span></>}
          icon={<PiggyBank className="h-3.5 w-3.5" />}
          tone={s.free < 0 ? "text-destructive" : "text-primary"}
        />
        <Stat
          label="Despesas do mês"
          value={brl(s.expenses, hide)}
          hint={<><span className="block">Pendente {brl(s.pendingTotal, hide)}</span><span className={`mt-1 block font-medium ${expMood.tone}`}>{expMood.text}</span></>}
          linkTo="/contas"
          linkLabel="Ver contas"
          icon={<Receipt className="h-3.5 w-3.5" />}
          tone="text-warning"
        />
        <Stat label="Transferências / Pessoas" value={brl(s.transfersTotal, hide)} hint={`${s.transfersCount} transferência(s)`} linkTo="/transferencias" linkLabel="Ver transferências" icon={<ArrowLeftRight className="h-3.5 w-3.5" />} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CardBox title="Previsão de fechamento do mês" sub={monthLabel(month)} icon={<TrendingUp className="h-4 w-4" />}>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Renda do mês</span><span className="text-success">{brl(s.income, hide)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">− Contas do mês</span><span>{brl(s.billsTotal, hide)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">− Faturas de cartão</span><span>{brl(s.cards, hide)}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">− Transferências</span><span>{brl(s.transfersTotal, hide)}</span></li>
          </ul>
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">= Saldo livre projetado</span>
              <span className={`text-2xl font-semibold ${forecast < 0 ? "text-destructive" : "text-success"}`}>{brl(forecast, hide)}</span>
            </div>
            <p className={`mt-1 text-xs ${mood.tone}`}>{mood.text}</p>
          </div>
        </CardBox>

        <CardBox title="Cartões" sub={`Fatura de ${monthLabel(month)}`} action={<Link to="/cartoes" className="text-xs text-primary">Ver cartões</Link>}>
          {data.cards.length === 0 ? <Empty>Nenhum cartão cadastrado.</Empty> : <div className="space-y-3">
            {data.cards.map((c) => {
              if (c.kind === "meal") {
                const { available, carryover, spent } = mealAvailableInMonth(data, c, month);
                return (
                  <div key={c.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-medium"><Utensils className="h-4 w-4 text-primary" />{c.name}</p>
                      {carryover > 0 && <span className="text-[11px] text-success">+{brl(carryover, hide)} do mês ant.</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-muted-foreground">Quanto ainda tem</p><p className={available < 0 ? "text-destructive" : "text-success"}>{brl(available, hide)}</p></div>
                      <div><p className="text-muted-foreground">Quanto já gastou</p><p className="text-warning">{brl(spent, hide)}</p></div>
                    </div>
                  </div>
                );
              }
              const paid = isInvoicePaid(c, month, data);
              return (
                <div key={c.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium"><CreditCard className="h-4 w-4 text-primary" />{c.name}</p>
                    <button
                      type="button"
                      onClick={() => actions.toggleInvoicePaid(c.id, month)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
                        paid
                          ? "border-success/40 bg-success/15 text-success hover:bg-success/25"
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {paid ? "Fatura paga" : "Marcar como pago"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Limite livre</p><p>{brl(c.limit - usedLimit(data, c.id, month), hide)}</p></div>
                    <div><p className="text-muted-foreground">Fatura atual</p><p className={paid ? "text-success" : "text-warning"}>{brl(invoice(data, c.id, month), hide)}</p></div>
                    <div><p className="text-muted-foreground">Próxima fatura</p><p>{brl(invoice(data, c.id, addMonths(month, 1)), hide)}</p></div>
                  </div>
                </div>
              );
            })}
          </div>}
        </CardBox>

        <CardBox title="Compromissos futuros" sub="Parcelas nos próximos meses" icon={<CalendarClock className="h-4 w-4" />}>
          <p className="mb-3 text-2xl font-semibold">{brl(futureTotal, hide)}</p>
          {futureTotal === 0 ? <Empty>Nenhuma parcela futura. Compras parceladas aparecem aqui.</Empty> : <ul className="space-y-1.5 text-sm">
            {Object.entries(byMonth).sort().slice(0, 5).map(([m, v]) => <li key={m} className="flex justify-between"><span className="capitalize text-muted-foreground">{monthLabel(m)}</span><span>{brl(v, hide)}</span></li>)}
          </ul>}
        </CardBox>

        <CardBox title="Vencimentos nos próximos 7 dias" sub="Contas pendentes e faturas" icon={<CalendarDays className="h-4 w-4" />}>
          {dues.length === 0 ? <Empty>Nenhum vencimento nos próximos 7 dias.</Empty> : <ul className="divide-y divide-border">
            {dues.map((d) => <li key={d.id} className="flex justify-between py-2 text-sm"><span>{d.name} <span className="text-xs text-muted-foreground">{d.date.toLocaleDateString("pt-BR")}</span></span><span className="text-warning">{brl(d.v, hide)}</span></li>)}
          </ul>}
        </CardBox>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <CardBox title="Gastos por categoria" sub="Contas, cartões e transferências">
          {pie.length === 0 ? <Empty>Sem despesas neste mês.</Empty> : <div className="h-64"><ResponsiveContainer>
            <PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} stroke="var(--card)" paddingAngle={2}>{pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /></PieChart>
          </ResponsiveContainer></div>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs">{pie.map((p, i) => <span key={p.name} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name}</span>)}</div>
        </CardBox>
        <CardBox title="Evolução mensal" sub="Últimos 6 meses">
          <div className="h-64"><ResponsiveContainer>
            <BarChart data={bars}><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} /><YAxis hide /><Tooltip {...tip} cursor={{ fill: "var(--accent)" }} />
              <Bar dataKey="Renda" fill="var(--success)" radius={[4, 4, 0, 0]} /><Bar dataKey="Despesas" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer></div>
        </CardBox>
      </div>
    </>
  );
}