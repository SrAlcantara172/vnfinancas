import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, LayoutDashboard, LogOut, Plug, Plus, Receipt, Wallet } from "lucide-react";
import { actions, addMonths, auth, monthLabel, useVn } from "@/lib/vn-store";
import { EntryModal, type FormKind } from "./forms";
import { Modal } from "./ui";

const nav = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard },
  { to: "/rendas", label: "Rendas", icon: Wallet },
  { to: "/contas", label: "Contas", icon: Receipt },
  { to: "/transferencias", label: "Transferências", icon: ArrowLeftRight },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
] as const;

export function Logo() {
  return <div className="flex items-center gap-2 font-semibold"><img src="/icon.svg" alt="" className="h-7 w-7" />VnFinanças</div>;
}

export function MonthBar() {
  const { month, hide } = useVn();
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-md border border-border bg-card">
        <button aria-label="Mês anterior" onClick={() => actions.setMonth(addMonths(month, -1))} className="p-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-28 text-center text-xs capitalize">{monthLabel(month)}</span>
        <button aria-label="Próximo mês" onClick={() => actions.setMonth(addMonths(month, 1))} className="p-2 text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <button aria-label="Ocultar valores" onClick={actions.toggleHide} className="rounded-md border border-border bg-card p-2 text-muted-foreground hover:text-foreground">
        {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CurrencySwitch() {
  const { currency, rate, rateLive } = useVn();
  const opts = [["BRL", "R$"], ["EUR", "€"]] as const;
  const fmt = rate.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="flex items-center gap-2">
      <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline" title={rateLive ? "Cotação atualizada" : "Cotação estimada (sem conexão com a API)"}>1 € = R$ {fmt}{rateLive ? "" : " ~"}</span>
      <div role="group" aria-label="Moeda" className="flex rounded-md border border-border bg-card p-0.5 text-xs">
        {opts.map(([c, s]) => (
          <button key={c} aria-pressed={currency === c} onClick={() => actions.setCurrency(c)} className={`rounded px-2 py-1 font-medium transition-colors ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s} {c}</button>
        ))}
      </div>
    </div>
  );
}

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  const { user, authReady, error } = useVn();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<FormKind | null>(null);
  const [picker, setPicker] = useState(false);
  useEffect(() => { setReady(true); }, []);
  useEffect(() => { if (ready && authReady && !user) navigate({ to: "/login" }); }, [ready, authReady, user, navigate]);
  if (!ready || !authReady || !user) return <div className="min-h-screen bg-background" />;

  const linkCls = "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground";
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border p-4 md:flex">
        <Logo />
        <p className="mb-2 mt-8 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">Finanças</p>
        <nav className="space-y-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: "bg-accent text-foreground" }} activeOptions={{ exact: true }}>
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">{user.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
          <Link to="/integracao" aria-label="Integração MacroDroid" className="text-muted-foreground hover:text-foreground"><Plug className="h-4 w-4" /></Link>
          <button aria-label="Sair" onClick={() => auth.signOut()} className="text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-8">
          <div className="md:hidden"><Logo /></div>
          <p className="hidden text-sm text-muted-foreground md:block">Meu espaço / <span className="text-foreground">{title}</span></p>
          <div className="flex items-center gap-2">
            <CurrencySwitch />
            <button onClick={() => setPicker(true)} className="hidden items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 md:inline-flex"><Plus className="h-4 w-4" />Novo lançamento</button>
            <Link to="/integracao" aria-label="Integração MacroDroid" className="p-2 text-muted-foreground md:hidden"><Plug className="h-4 w-4" /></Link>
            <button aria-label="Sair" onClick={() => auth.signOut()} className="p-2 text-muted-foreground md:hidden"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
          {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"><span>{error}</span><button onClick={actions.clearError} className="shrink-0 underline">Fechar</button></div>}
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>
            <n.icon className="h-5 w-5" />{n.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
      <button aria-label="Novo lançamento" onClick={() => setPicker(true)} className="fixed bottom-20 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:hidden"><Plus className="h-6 w-6" /></button>

      <Modal open={picker} onClose={() => setPicker(false)} title="O que deseja lançar?">
        <div className="grid grid-cols-2 gap-2">
          {([["income", "Renda", Wallet], ["bill", "Conta do mês", Receipt], ["transfer", "Transferência", ArrowLeftRight], ["purchase", "Compra no cartão", CreditCard], ["card", "Novo cartão", CreditCard]] as const).map(([k, l, I]) => (
            <button key={k} onClick={() => { setPicker(false); setForm(k); }} className="flex items-center gap-2 rounded-lg border border-border p-3 text-left text-sm hover:bg-accent"><I className="h-4 w-4 text-primary" />{l}</button>
          ))}
        </div>
      </Modal>
      <EntryModal kind={form} onClose={() => setForm(null)} />
    </div>
  );
}

/** Abre um formulário específico a partir de páginas internas. */
export function useForm() {
  const [form, setForm] = useState<FormKind | null>(null);
  return { open: setForm, modal: <EntryModal kind={form} onClose={() => setForm(null)} /> };
}
