# C1 Trader Pro 🤖

Expert Advisor MQL5 com estratégia de canal C1, gestão de risco configurável e sistema de licenciamento remoto (SaaS).

## Estrutura do Projeto

```
roboforex/
├── ea/
│   └── C1TraderPro.mq5          # Expert Advisor MQL5
├── backend/
│   ├── src/
│   │   ├── index.js             # Entry point Express
│   │   ├── routes/
│   │   │   ├── license.js       # Rota POST /validate
│   │   │   └── admin.js         # Rotas /admin/*
│   │   ├── middleware/
│   │   │   └── auth.js          # Autenticação admin
│   │   └── db/
│   │       ├── database.js      # Pool PostgreSQL
│   │       └── schema.sql       # Tabelas do banco
│   ├── package.json
│   └── .env.example
├── admin/
│   └── src/
│       └── index.html           # Painel admin (HTML puro)
└── README.md
```

## 🚀 Como usar

### 1. EA MQL5 – C1TraderPro.mq5

1. Copie `ea/C1TraderPro.mq5` para a pasta `Experts/` do MetaTrader 5
2. Compile no MetaEditor
3. Adicione o EA ao gráfico XAUUSD M5
4. Configure os parâmetros (especialmente `LicenseKey` e `ApiUrl`)
5. Nas configurações do MT5, autorize a URL da API em **Ferramentas → Opções → Expert Advisors → URLs permitidas**

### 2. Backend (API de Licenciamento)

```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais
npm install
npm run db:migrate   # Cria tabelas no PostgreSQL
npm start
```

#### Variáveis de ambiente

| Variável        | Descrição                              |
|-----------------|----------------------------------------|
| `DATABASE_URL`  | URL de conexão PostgreSQL              |
| `ADMIN_TOKEN`   | Token secreto para o painel admin      |
| `PORT`          | Porta da API (padrão: 3000)            |

#### Endpoints

| Método | Rota                              | Descrição                  |
|--------|-----------------------------------|----------------------------|
| POST   | `/validate`                       | Valida licença (EA → API)  |
| GET    | `/admin/licenses`                 | Lista licenças             |
| POST   | `/admin/licenses`                 | Cria licença               |
| PATCH  | `/admin/licenses/:key/revoke`     | Revoga licença             |
| PATCH  | `/admin/licenses/:key/activate`   | Reativa licença            |
| DELETE | `/admin/licenses/:key`            | Exclui licença             |
| GET    | `/admin/logs`                     | Últimos logs de validação  |

Todas as rotas `/admin/*` exigem o header `x-admin-token`.

### 3. Painel Admin

Abra `admin/src/index.html` diretamente no navegador.
Informe a URL da API e o Admin Token para gerenciar licenças.

## ⚙️ Parâmetros do EA

| Parâmetro            | Padrão        | Descrição                        |
|----------------------|---------------|----------------------------------|
| `Symbol`             | XAUUSD        | Ativo a operar                   |
| `Timeframe`          | M5            | Timeframe das velas C1           |
| `RiskMode`           | 0 (Lote fixo) | 0 = fixo, 1 = percentual         |
| `FixedLot`           | 0.01          | Lote fixo                        |
| `RiskPercent`        | 1.0           | % do saldo por operação          |
| `MaxTradesPerDay`    | 3             | Máximo de trades por dia         |
| `TradeStartHour`     | 2             | Hora de início das operações     |
| `TradeEndHour`       | 20            | Hora de encerramento             |
| `StopLossMultiplier` | 1.0           | Multiplicador do range para SL   |
| `TakeProfitRatio`    | 2.0           | Ratio TP/SL                      |
| `LicenseKey`         | —             | Chave de ativação                |
| `ApiUrl`             | (URL da API)  | Endpoint de validação            |

## 🧠 Estratégia C1

1. Captura as **4 primeiras velas** do dia no timeframe configurado
2. Calcula a **média dos ranges** (High - Low)
3. Projeta o canal: `C1 Superior = Abertura + média`, `C1 Inferior = Abertura - média`
4. Opera **rompimentos** e **falsos rompimentos** (virada de mão)

## 🔐 Licenciamento

- O EA envia `license_key + account + broker + symbol` para a API a cada inicialização
- A API valida status (`active / blocked / expired`) e retorna o resultado
- Operações são bloqueadas se a licença for inválida

## 💰 Modelo de Negócio

- Licença mensal por conta MT5
- Trial de 7 dias
- Versão PRO com filtros avançados (EMA, ATR)

## 🗺️ Roadmap

- [x] Fase 1 – EA C1 funcional
- [x] Fase 2 – API de licenciamento
- [x] Fase 3 – Painel admin
- [ ] Fase 4 – Otimização + backtest
- [ ] Fase 5 – Comercialização