# VnFinanças Dashboard (PWA)

Progressive Web App (PWA) de gestão financeira pessoal desenvolvida com foco em clareza visual (tema OLED Dark), controle de fluxo mensal, cartões de crédito parcelados, projeção de fechamento e automação de lançamentos.

## Visão Geral e Funcionalidades

- **Autenticação e Segurança:** Tela de login e cadastro com e-mail e senha, autenticação gerenciada via Supabase e isolamento de dados por usuário com Row Level Security (RLS).
- **Experiência PWA (Web e Mobile):** Layout responsivo com menu lateral no desktop, navegação inferior e botão de ação rápida (`+`) no mobile, com suporte a instalação como PWA (`manifest.json`).
- **Dashboard Mensal:**
  - Navegação por mês/ano e opção de ocultar/exibir valores na tela.
  - Indicadores principais: Renda/Salário do mês, Saldo livre, Despesas do mês e Transferências/Pessoas.
  - Cards de acompanhamento: *Previsão de fechamento do mês*, *Cartões de crédito* (limite, fatura atual e próxima fatura), *Compromissos futuros* e *Vencimentos nos próximos 7 dias*.
  - Visualizações analíticas com Recharts (distribuição por categoria e evolução mensal).
- **Fluxos Operacionais e Automação:**
  - Cadastro e gestão de rendas, contas do mês (pago/pendente), transferências para pessoas e compras em cartões de crédito com projeção automática de parcelas em meses futuros.
  - Integração com Supabase e gatilhos via webhook para captura automatizada de movimentações.

## Stack Tecnológica

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend e Banco de Dados:** Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **Deploy:** Vercel

## Como Executar Localmente

Pré-requisitos: Node.js e npm (ou Bun).

```bash
git clone [https://github.com/SrAlcantara172/vnfinan-as-dashboard.git](https://github.com/SrAlcantara172/vnfinan-as-dashboard.git)
cd vnfinan-as-dashboard
npm install
