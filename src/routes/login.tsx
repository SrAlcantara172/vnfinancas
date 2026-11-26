import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { auth, useVn } from "@/lib/vn-store";
import { Logo } from "@/components/vn/shell";
import { Btn, Field } from "@/components/vn/ui";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Entrar — VnFinanças" },
    { name: "description", content: "Acesse ou crie sua conta no VnFinanças." },
    { property: "og:title", content: "Entrar — VnFinanças" },
    { property: "og:description", content: "Acesse ou crie sua conta no VnFinanças." },
  ] }),
  component: Login,
});

const schema = z.object({ email: z.string().trim().email("E-mail inválido").max(255), password: z.string().min(6, "A senha precisa ter 6 caracteres ou mais").max(100) });

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, authReady } = useVn();

  useEffect(() => { if (authReady && user) navigate({ to: "/" }); }, [authReady, user, navigate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Partial<Record<"name" | "email" | "password", string>>;
    const r = schema.safeParse(f);
    if (!r.success) return setErr(r.error.issues[0]?.message ?? "");
    setBusy(true);
    setErr("");
    try {
      if (mode === "up") await auth.signUp((f.name || "").trim() || r.data.email.split("@")[0]!, r.data.email, r.data.password);
      else await auth.signIn(r.data.email, r.data.password);
      navigate({ to: "/" });
    } catch (x) { setErr((x as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="vn-card p-6">
          <h1 className="text-xl font-semibold">{mode === "in" ? "Entrar" : "Criar conta"}</h1>
          <p className="mb-5 text-sm text-muted-foreground">{mode === "in" ? "Bem-vindo de volta." : "Comece a organizar suas finanças."}</p>
          <form onSubmit={submit}>
            {mode === "up" && <Field label="Nome"><input name="name" className="vn-input" maxLength={60} /></Field>}
            <Field label="E-mail"><input name="email" type="email" autoComplete="email" className="vn-input" /></Field>
            <Field label="Senha"><input name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} className="vn-input" /></Field>
            {err && <p className="mb-3 text-xs text-destructive">{err}</p>}
            <Btn type="submit" className="w-full" disabled={busy}>{busy ? "Aguarde..." : mode === "in" ? "Entrar" : "Cadastrar"}</Btn>
          </form>
          <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
            {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
