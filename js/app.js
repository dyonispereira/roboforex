(function () {
  "use strict";

  const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const percentFmt = (v) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

  const fields = {
    nomeProduto: document.getElementById("nomeProduto"),
    custoUnitario: document.getElementById("custoUnitario"),
    quantidade: document.getElementById("quantidade"),
    frete: document.getElementById("frete"),
    custoProducao: document.getElementById("custoProducao"),
    pctImpostoCompra: document.getElementById("pctImpostoCompra"),
    margemLucro: document.getElementById("margemLucro"),
    pctImpostoVenda: document.getElementById("pctImpostoVenda"),
  };

  function readInputs() {
    return {
      nomeProduto: fields.nomeProduto.value.trim() || "Produto sem nome",
      custoUnitario: parseFloat(fields.custoUnitario.value) || 0,
      quantidade: Math.max(1, parseFloat(fields.quantidade.value) || 1),
      frete: parseFloat(fields.frete.value) || 0,
      custoProducao: parseFloat(fields.custoProducao.value) || 0,
      pctImpostoCompra: (parseFloat(fields.pctImpostoCompra.value) || 0) / 100,
      margemLucro: (parseFloat(fields.margemLucro.value) || 0) / 100,
      pctImpostoVenda: (parseFloat(fields.pctImpostoVenda.value) || 0) / 100,
    };
  }

  // Mirrors the formulas from the original spreadsheet (Custo x Venda - Eternure).
  function calculate(inputs) {
    const subtotalCompra = inputs.custoUnitario * inputs.quantidade + inputs.frete + inputs.custoProducao;
    const impostoCompraValor = subtotalCompra * inputs.pctImpostoCompra;
    const custoTotal = subtotalCompra + impostoCompraValor;
    const custoUnitarioFinal = custoTotal / inputs.quantidade;

    const margemLucroValor = custoTotal * inputs.margemLucro;
    const precoVenda = custoTotal + margemLucroValor;

    const impostoVendaValor = precoVenda * inputs.pctImpostoVenda;
    const valorVendaComImposto = precoVenda + impostoVendaValor;
    const custoUnitarioVenda = valorVendaComImposto / inputs.quantidade;

    const lucroTotal = precoVenda - custoTotal;
    const lucroUnitario = lucroTotal / inputs.quantidade;
    const precoVendaUnitario = precoVenda / inputs.quantidade;

    return {
      subtotalCompra,
      impostoCompraValor,
      custoTotal,
      custoUnitarioFinal,
      margemLucroValor,
      precoVenda,
      precoVendaUnitario,
      impostoVendaValor,
      valorVendaComImposto,
      custoUnitarioVenda,
      lucroTotal,
      lucroUnitario,
    };
  }

  function breakdownRows(inputs, r) {
    return [
      ["Subtotal de compra", `Custo unit. × Qtd + Frete + Custo produção = ${currencyFmt.format(inputs.custoUnitario)} × ${inputs.quantidade} + ${currencyFmt.format(inputs.frete)} + ${currencyFmt.format(inputs.custoProducao)}`, currencyFmt.format(r.subtotalCompra)],
      [`Imposto de compra (${percentFmt(inputs.pctImpostoCompra)})`, `Subtotal de compra × ${percentFmt(inputs.pctImpostoCompra)}`, currencyFmt.format(r.impostoCompraValor)],
      ["Custo total", "Subtotal de compra + Imposto de compra", currencyFmt.format(r.custoTotal)],
      ["Custo unitário", "Custo total ÷ Quantidade total", currencyFmt.format(r.custoUnitarioFinal)],
      [`Margem de lucro (${percentFmt(inputs.margemLucro)})`, `Custo total × ${percentFmt(inputs.margemLucro)}`, currencyFmt.format(r.margemLucroValor)],
      ["Preço de venda", "Custo total + Margem de lucro", currencyFmt.format(r.precoVenda)],
      [`Imposto de venda (${percentFmt(inputs.pctImpostoVenda)})`, `Preço de venda × ${percentFmt(inputs.pctImpostoVenda)}`, currencyFmt.format(r.impostoVendaValor)],
      ["Valor de venda c/ imposto", "Preço de venda + Imposto de venda", currencyFmt.format(r.valorVendaComImposto)],
      ["Custo unitário de venda", "Valor de venda c/ imposto ÷ Quantidade total", currencyFmt.format(r.custoUnitarioVenda)],
      ["Lucro total", "Preço de venda − Custo total", currencyFmt.format(r.lucroTotal)],
      ["Lucro unitário", "Lucro total ÷ Quantidade total", currencyFmt.format(r.lucroUnitario)],
    ];
  }

  function render() {
    const inputs = readInputs();
    const r = calculate(inputs);

    document.getElementById("out-custoTotal").textContent = currencyFmt.format(r.custoTotal);
    document.getElementById("out-precoVenda").textContent = currencyFmt.format(r.precoVenda);
    document.getElementById("out-valorVendaImposto").textContent = currencyFmt.format(r.valorVendaComImposto);
    document.getElementById("out-lucroTotal").textContent = currencyFmt.format(r.lucroTotal);

    const rows = breakdownRows(inputs, r);
    const tbody = document.getElementById("breakdown-body");
    tbody.innerHTML = rows
      .map(([label, formula, value]) => `<tr><td>${label}</td><td class="formula">${formula}</td><td>${value}</td></tr>`)
      .join("");

    fillPrintReport(inputs, r, rows);
  }

  function fillPrintReport(inputs, r, rows) {
    document.getElementById("print-nomeProduto").textContent = inputs.nomeProduto;
    document.getElementById("print-date").textContent = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const inputRows = [
      ["Custo unitário", currencyFmt.format(inputs.custoUnitario)],
      ["Quantidade total", inputs.quantidade.toLocaleString("pt-BR")],
      ["Frete de compra", currencyFmt.format(inputs.frete)],
      ["Custo de produção", currencyFmt.format(inputs.custoProducao)],
      ["Imposto de compra", percentFmt(inputs.pctImpostoCompra)],
      ["Margem de lucro", percentFmt(inputs.margemLucro)],
      ["Imposto de venda", percentFmt(inputs.pctImpostoVenda)],
    ];
    document.getElementById("print-inputs-body").innerHTML = inputRows
      .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
      .join("");

    document.getElementById("print-breakdown-body").innerHTML = rows
      .map(([label, formula, value]) => `<tr><td>${label}</td><td>${formula}</td><td>${value}</td></tr>`)
      .join("");

    document.getElementById("print-custoTotal").textContent = currencyFmt.format(r.custoTotal);
    document.getElementById("print-precoVenda").textContent = currencyFmt.format(r.precoVenda);
    document.getElementById("print-valorVendaImposto").textContent = currencyFmt.format(r.valorVendaComImposto);
    document.getElementById("print-lucroTotal").textContent = currencyFmt.format(r.lucroTotal);
  }

  document.getElementById("form-simulador").addEventListener("input", render);
  document.getElementById("btn-pdf").addEventListener("click", () => {
    render();
    window.print();
  });

  render();
})();
