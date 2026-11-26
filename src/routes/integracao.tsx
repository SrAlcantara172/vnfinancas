import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Shell } from "@/components/vn/shell";
import { Btn, CardBox, Empty } from "@/components/vn/ui";
import { supabase, WEBHOOK_URL } from "@/lib/supabase";

export const Route = createFileRoute("/integracao")({
  head: () => ({ meta: [{ title: "Integração — VnFinanças" }, { name: "description", content: "Webhook para lançar compras automaticamente pelo MacroDroid." }, { property: "og:title", content: "Integração — VnFinanças" }, { property: "og:description", content: "Webhook para lançar compras automaticamente pelo MacroDroid." }] }),
  component: () => <Shell title="Integração"><Page /></Shell>,
});

type Ev = { id: number; received_at: string; status: string; error: string | null; parsed: { amount?: number | null; merchant?: string | null; last4?: string | null } | null };
const STATUS: Record<string, { label: string; cls: string }> = {
  created: { label: "Lançado", cls: "bg-success/15 text-success" },
  duplicate: { label: "Duplicado", cls: "bg-muted text-muted-foreground" },
  card_not_found: { label: "Cartão não encontrado", cls: "bg-warning/15 text-warning" },
  unparsed: { label: "Não reconhecido", cls: "bg-warning/15 text-warning" },
  error: { label: "Erro", cls: "bg-destructive/15 text-destructive" },
};

function Page() {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [events, setEvents] = useState<Ev[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const p = await supabase.from("profiles").select("webhook_token").single();
    if (p.error) setMsg(p.error.message); else setToken(p.data.webhook_token);
    const e = await supabase.from("webhook_events").select("id,received_at,status,error,parsed").order("received_at", { ascending: false }).limit(10);
    if (!e.error) setEvents(e.data as Ev[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setMsg(`${what} copiado.`); } catch { setMsg("Não foi possível copiar."); }
  }
  async function regenerate() {
    if (!window.confirm("Gerar um novo token? O token antigo deixa de funcionar e você precisará atualizar o MacroDroid.")) return;
    const { data, error } = await supabase.rpc("regenerate_webhook_token");
    if (error) setMsg(error.message); else { setToken(data as string); setShow(true); setMsg("Novo token gerado."); }
  }

  return (
    <>
      <div className="mb-6"><h1 className="text-2xl font-semibold">Integração com MacroDroid</h1><p className="text-sm text-muted-foreground">Lance compras do cartão automaticamente a partir das notificações da Carteira do Google.</p></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CardBox title="Seu webhook" sub="Pessoal e secreto — não compartilhe">
          <p className="mb-1 text-xs text-muted-foreground">URL</p>
          <div className="mb-4 flex items-center gap-2"><code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-2 text-xs">{WEBHOOK_URL}</code><Btn variant="ghost" aria-label="Copiar URL" onClick={() => copy(WEBHOOK_URL, "URL")}><Copy className="h-4 w-4" /></Btn></div>
          <p className="mb-1 text-xs text-muted-foreground">Token (enviar no header <code>x-webhook-token</code>)</p>
          <div className="mb-4 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2 py-2 text-xs">{token ? (show ? token : "•".repeat(32)) : "carregando..."}</code>
            <Btn variant="ghost" aria-label="Mostrar token" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Btn>
            <Btn variant="ghost" aria-label="Copiar token" onClick={() => copy(token, "Token")} disabled={!token}><Copy className="h-4 w-4" /></Btn>
          </div>
          <Btn variant="ghost" onClick={regenerate}><RefreshCw className="h-4 w-4" />Gerar novo token</Btn>
          {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
          <ol className="mt-5 list-decimal space-y-1.5 pl-4 text-xs text-muted-foreground">
            <li>Cadastre o cartão com os <b>4 últimos dígitos</b> (aba Cartões).</li>
            <li>No MacroDroid: gatilho <b>Notificação recebida</b> do app Carteira/Google Wallet.</li>
            <li>Ação <b>Requisição HTTP</b> (POST) na URL acima, header <code>x-webhook-token</code> com seu token.</li>
            <li>Corpo: <code>{`{"title":"[título]","text":"[texto]"}`}</code> usando as variáveis de notificação do MacroDroid.</li>
          </ol>
        </CardBox>

        <CardBox title="Últimos recebimentos" sub="Ajuda a depurar o que o MacroDroid enviou" action={<Btn variant="ghost" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Btn>}>
          {events.length === 0 ? <Empty>Nada recebido ainda.</Empty> : <ul className="divide-y divide-border">
            {events.map((e) => {
              const s = STATUS[e.status] ?? { label: e.status, cls: "bg-muted text-muted-foreground" };
              return (
                <li key={e.id} className="py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate">{e.parsed?.merchant ?? "—"}{e.parsed?.amount ? ` · R$ ${e.parsed.amount.toFixed(2).replace(".", ",")}` : ""}</span><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span></div>
                  <p className="text-xs text-muted-foreground">{new Date(e.received_at).toLocaleString("pt-BR")}{e.parsed?.last4 ? ` · final ${e.parsed.last4}` : ""}{e.error ? ` · ${e.error}` : ""}</p>
                </li>
              );
            })}
          </ul>}
        </CardBox>
      </div>
    </>
  );
}
