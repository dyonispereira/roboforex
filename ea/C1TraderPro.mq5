//+------------------------------------------------------------------+
//|  C1 Trader Pro – Expert Advisor MQL5                            |
//|  Estratégia: Canal C1 baseado nas 4 primeiras velas do dia      |
//+------------------------------------------------------------------+
#property copyright "C1 Trader Pro"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

//--- Parâmetros de entrada
input string   InpSymbol            = "XAUUSD";        // Ativo
input ENUM_TIMEFRAMES InpTimeframe  = PERIOD_M5;       // Timeframe
input int      InpRiskMode          = 0;               // 0=LOTE_FIXO 1=PERCENTUAL
input double   InpFixedLot          = 0.01;            // Lote fixo
input double   InpRiskPercent       = 1.0;             // Risco % por trade
input int      InpMaxTradesPerDay   = 3;               // Max trades/dia
input int      InpTradeStartHour    = 2;               // Hora início
input int      InpTradeEndHour      = 20;              // Hora fim
input double   InpStopLossMulti     = 1.0;             // Multiplicador SL
input double   InpTPRatio           = 2.0;             // Ratio TP/SL
input string   InpLicenseKey        = "";              // Chave de licença
input string   InpApiUrl            = "https://api.c1traderpro.com/validate"; // URL API

//--- Variáveis globais
CTrade         trade;
CPositionInfo  posInfo;

double   g_c1Upper     = 0;
double   g_c1Lower     = 0;
double   g_mediaRange  = 0;
datetime g_lastDayCalc = 0;
int      g_tradesToday = 0;
datetime g_lastTradeDay = 0;
bool     g_licValid    = false;
bool     g_brokeUpper  = false;
bool     g_brokeLower  = false;

//+------------------------------------------------------------------+
int OnInit()
{
   if(!ValidarLicenca())
   {
      Alert("C1 Trader Pro: Licença inválida ou expirada. Operações bloqueadas.");
      return INIT_FAILED;
   }
   trade.SetExpertMagicNumber(20240101);
   trade.SetDeviationInPoints(10);
   Print("C1 Trader Pro iniciado. Canal C1 será calculado na abertura do dia.");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnTick()
{
   if(!g_licValid) return;

   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);

   // Reinicia contagem diária
   datetime today = StringToTime(StringFormat("%04d.%02d.%02d 00:00", dt.year, dt.mon, dt.day));
   if(g_lastTradeDay != today)
   {
      g_tradesToday   = 0;
      g_lastTradeDay  = today;
      g_brokeUpper    = false;
      g_brokeLower    = false;
   }

   // Calcula C1 uma vez por dia (após 4 velas fechadas)
   if(g_lastDayCalc != today)
      CalcularC1(today);

   if(g_c1Upper == 0 || g_c1Lower == 0) return;

   // Janela de horário
   if(dt.hour < InpTradeStartHour || dt.hour >= InpTradeEndHour) return;

   // Limite diário
   if(g_tradesToday >= InpMaxTradesPerDay) return;

   VerificarEntradas();
}

//+------------------------------------------------------------------+
bool ValidarLicenca()
{
   if(InpLicenseKey == "")
   {
      Print("Chave de licença não informada.");
      return false;
   }

   string headers  = "Content-Type: application/json\r\n";
   string payload  = StringFormat(
      "{\"license_key\":\"%s\",\"account\":%d,\"broker\":\"%s\",\"symbol\":\"%s\"}",
      InpLicenseKey, AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_COMPANY), InpSymbol
   );

   char   body[];
   char   result[];
   string resHeaders;

   StringToCharArray(payload, body, 0, StringLen(payload));
   int res = WebRequest("POST", InpApiUrl, headers, 5000, body, result, resHeaders);

   if(res != 200)
   {
      Print("Falha ao validar licença. HTTP: ", res);
      return false;
   }

   string json = CharArrayToString(result);
   if(StringFind(json, "\"status\":\"active\"") >= 0)
   {
      g_licValid = true;
      Print("Licença ativa.");
      return true;
   }

   Print("Licença inválida/expirada/revogada: ", json);
   return false;
}

//+------------------------------------------------------------------+
void CalcularC1(datetime today)
{
   // Precisamos de pelo menos 4 velas fechadas após abertura do dia
   int barsAvail = iBars(InpSymbol, InpTimeframe);
   if(barsAvail < 6) return;

   // Descobre a barra correspondente à abertura do dia
   int dayBar = iBarShift(InpSymbol, InpTimeframe, today, false);
   if(dayBar < 0) return;

   // As 4 primeiras velas do dia = barras [dayBar, dayBar-3] (mais antigas primeiro)
   // Verificar se já fecharam
   if(dayBar - 3 < 0) return;

   double ranges[4];
   for(int i = 0; i < 4; i++)
   {
      int bar = dayBar - i;
      double h = iHigh(InpSymbol, InpTimeframe, bar);
      double l = iLow(InpSymbol, InpTimeframe, bar);
      ranges[i] = h - l;
   }

   g_mediaRange = (ranges[0] + ranges[1] + ranges[2] + ranges[3]) / 4.0;

   double openDay = iOpen(InpSymbol, InpTimeframe, dayBar);
   g_c1Upper = openDay + g_mediaRange;
   g_c1Lower = openDay - g_mediaRange;
   g_lastDayCalc = today;

   Print(StringFormat("C1 calculado | Abertura: %.5f | Upper: %.5f | Lower: %.5f | Range médio: %.5f",
         openDay, g_c1Upper, g_c1Lower, g_mediaRange));
}

//+------------------------------------------------------------------+
void VerificarEntradas()
{
   double ask = SymbolInfoDouble(InpSymbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(InpSymbol, SYMBOL_BID);

   // --- Rompimento superior
   if(ask > g_c1Upper && !g_brokeUpper)
   {
      g_brokeUpper = true;
      if(!PosicaoAberta(POSITION_TYPE_BUY))
         AbrirCompra("Rompimento C1 superior");
      return;
   }

   // --- Falso rompimento superior (virada de mão)
   if(g_brokeUpper && bid < g_c1Upper)
   {
      g_brokeUpper = false;
      if(!PosicaoAberta(POSITION_TYPE_SELL))
         AbrirVenda("Falso rompimento C1 superior – virada de mão");
      return;
   }

   // --- Rompimento inferior
   if(bid < g_c1Lower && !g_brokeLower)
   {
      g_brokeLower = true;
      if(!PosicaoAberta(POSITION_TYPE_SELL))
         AbrirVenda("Rompimento C1 inferior");
      return;
   }

   // --- Falso rompimento inferior (virada de mão)
   if(g_brokeLower && ask > g_c1Lower)
   {
      g_brokeLower = false;
      if(!PosicaoAberta(POSITION_TYPE_BUY))
         AbrirCompra("Falso rompimento C1 inferior – virada de mão");
      return;
   }
}

//+------------------------------------------------------------------+
void AbrirCompra(string motivo)
{
   double lot = CalcularLote();
   double ask = SymbolInfoDouble(InpSymbol, SYMBOL_ASK);
   double sl  = ask - g_mediaRange * InpStopLossMulti;
   double tp  = ask + g_mediaRange * InpStopLossMulti * InpTPRatio;

   sl = NormalizeDouble(sl, (int)SymbolInfoInteger(InpSymbol, SYMBOL_DIGITS));
   tp = NormalizeDouble(tp, (int)SymbolInfoInteger(InpSymbol, SYMBOL_DIGITS));

   if(trade.Buy(lot, InpSymbol, ask, sl, tp, motivo))
   {
      g_tradesToday++;
      Print("COMPRA aberta | Motivo: ", motivo, " | Lote: ", lot, " | SL: ", sl, " | TP: ", tp);
   }
   else
      Print("Erro ao abrir COMPRA: ", trade.ResultRetcodeDescription());
}

//+------------------------------------------------------------------+
void AbrirVenda(string motivo)
{
   double lot = CalcularLote();
   double bid = SymbolInfoDouble(InpSymbol, SYMBOL_BID);
   double sl  = bid + g_mediaRange * InpStopLossMulti;
   double tp  = bid - g_mediaRange * InpStopLossMulti * InpTPRatio;

   sl = NormalizeDouble(sl, (int)SymbolInfoInteger(InpSymbol, SYMBOL_DIGITS));
   tp = NormalizeDouble(tp, (int)SymbolInfoInteger(InpSymbol, SYMBOL_DIGITS));

   if(trade.Sell(lot, InpSymbol, bid, sl, tp, motivo))
   {
      g_tradesToday++;
      Print("VENDA aberta | Motivo: ", motivo, " | Lote: ", lot, " | SL: ", sl, " | TP: ", tp);
   }
   else
      Print("Erro ao abrir VENDA: ", trade.ResultRetcodeDescription());
}

//+------------------------------------------------------------------+
double CalcularLote()
{
   if(InpRiskMode == 0)
      return NormalizeLot(InpFixedLot);

   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double stopDist = g_mediaRange * InpStopLossMulti;
   double tickVal  = SymbolInfoDouble(InpSymbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(InpSymbol, SYMBOL_TRADE_TICK_SIZE);

   if(tickVal == 0 || tickSize == 0 || stopDist == 0) return NormalizeLot(InpFixedLot);

   double riskAmount = balance * InpRiskPercent / 100.0;
   double lot = riskAmount / (stopDist / tickSize * tickVal);
   return NormalizeLot(lot);
}

//+------------------------------------------------------------------+
double NormalizeLot(double lot)
{
   double minLot  = SymbolInfoDouble(InpSymbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(InpSymbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(InpSymbol, SYMBOL_VOLUME_STEP);
   lot = MathFloor(lot / stepLot) * stepLot;
   return MathMin(MathMax(lot, minLot), maxLot);
}

//+------------------------------------------------------------------+
bool PosicaoAberta(ENUM_POSITION_TYPE tipo)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(posInfo.SelectByIndex(i))
      {
         if(posInfo.Symbol() == InpSymbol &&
            posInfo.Magic()  == 20240101  &&
            posInfo.PositionType() == tipo)
            return true;
      }
   }
   return false;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("C1 Trader Pro encerrado.");
}
