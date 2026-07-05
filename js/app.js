(function () {
  "use strict";

  const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const percentFmt = (v) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  const GOLD_DARK = [107, 93, 63];
  const GOLD_LIGHT = [241, 234, 217];
  const LINE = [227, 217, 195];
  const INK = [43, 42, 38];
  const INK_SOFT = [85, 82, 74];
  const PROFIT = [75, 106, 79];

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
      ["Subtotal de compra", `Custo unit. × Qtd + Frete + Custo produção = ${currencyFmt.format(inputs.custoUnitario)} × ${inputs.quantidade} + ${currencyFmt.format(inputs.frete)} + ${currencyFmt.format(inputs.custoProducao)}`, r.subtotalCompra],
      [`Imposto de compra (${percentFmt(inputs.pctImpostoCompra)})`, `Subtotal de compra × ${percentFmt(inputs.pctImpostoCompra)}`, r.impostoCompraValor],
      ["Custo total", "Subtotal de compra + Imposto de compra", r.custoTotal],
      ["Custo unitário", "Custo total ÷ Quantidade total", r.custoUnitarioFinal],
      [`Margem de lucro (${percentFmt(inputs.margemLucro)})`, `Custo total × ${percentFmt(inputs.margemLucro)}`, r.margemLucroValor],
      ["Preço de venda", "Custo total + Margem de lucro", r.precoVenda],
      [`Imposto de venda (${percentFmt(inputs.pctImpostoVenda)})`, `Preço de venda × ${percentFmt(inputs.pctImpostoVenda)}`, r.impostoVendaValor],
      ["Valor de venda c/ imposto", "Preço de venda + Imposto de venda", r.valorVendaComImposto],
      ["Custo unitário de venda", "Valor de venda c/ imposto ÷ Quantidade total", r.custoUnitarioVenda],
      ["Lucro total", "Preço de venda − Custo total", r.lucroTotal],
      ["Lucro unitário", "Lucro total ÷ Quantidade total", r.lucroUnitario],
    ];
  }

  function currentState() {
    const inputs = readInputs();
    const r = calculate(inputs);
    const rows = breakdownRows(inputs, r);
    return { inputs, r, rows };
  }

  function render() {
    const { inputs, r, rows } = currentState();

    document.getElementById("out-custoTotal").textContent = currencyFmt.format(r.custoTotal);
    document.getElementById("out-precoVenda").textContent = currencyFmt.format(r.precoVenda);
    document.getElementById("out-valorVendaImposto").textContent = currencyFmt.format(r.valorVendaComImposto);
    document.getElementById("out-lucroTotal").textContent = currencyFmt.format(r.lucroTotal);
    document.getElementById("out-custoUnitarioVenda").textContent = currencyFmt.format(r.custoUnitarioVenda);
    document.getElementById("out-lucroUnitario").textContent = currencyFmt.format(r.lucroUnitario);

    document.getElementById("breakdown-body").innerHTML = rows
      .map(([label, formula, value]) => `<tr><td>${label}</td><td class="formula">${formula}</td><td>${currencyFmt.format(value)}</td></tr>`)
      .join("");
  }

  function inputRowsFor(inputs) {
    return [
      ["Custo unitário", currencyFmt.format(inputs.custoUnitario)],
      ["Quantidade total", inputs.quantidade.toLocaleString("pt-BR")],
      ["Frete de compra", currencyFmt.format(inputs.frete)],
      ["Custo de produção", currencyFmt.format(inputs.custoProducao)],
      ["Imposto de compra", percentFmt(inputs.pctImpostoCompra)],
      ["Margem de lucro", percentFmt(inputs.margemLucro)],
      ["Imposto de venda", percentFmt(inputs.pctImpostoVenda)],
    ];
  }

  // jsPDF's standard fonts don't include the U+2212 minus sign glyph; use a plain hyphen instead.
  function pdfSafe(text) {
    return text.replace(/−/g, "-");
  }

  function safeFileName(name) {
    return name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase() || "produto";
  }

  // ---------- PDF export (jsPDF) ----------
  function generatePDF() {
    const { inputs, r, rows } = currentState();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    let y = 14;

    // Header
    try {
      doc.addImage(window.ETERNURE_LOGO_PNG, "PNG", marginX, y - 2, 14, 14);
    } catch (e) { /* logo optional */ }
    doc.setTextColor(...GOLD_DARK);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("ETERNURE", marginX + 18, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK_SOFT);
    doc.text("Personalização & Brindes", marginX + 18, y + 9);

    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    doc.setFontSize(9);
    doc.text(dateStr, pageWidth - marginX, y + 4, { align: "right" });

    y += 16;
    doc.setDrawColor(...GOLD_DARK);
    doc.setLineWidth(0.8);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 9;

    doc.setTextColor(...INK);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.text("Resumo de Custo e Precificação", marginX, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Produto: ${inputs.nomeProduto}`, marginX, y);
    y += 8;

    // Table helper
    const LINE_H = 4.2;
    function drawTable(title, headers, dataRows, colWidths, align) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setFillColor(...GOLD_LIGHT);
      doc.setTextColor(...GOLD_DARK);
      const headerH = 7;
      doc.rect(marginX, y, contentWidth, headerH, "F");
      let x = marginX;
      headers.forEach((h, i) => {
        doc.text(h, x + 3, y + headerH - 2.3);
        x += colWidths[i];
      });
      y += headerH;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      dataRows.forEach((row) => {
        const cellLines = row.map((cell, i) => doc.splitTextToSize(pdfSafe(String(cell)), colWidths[i] - 6));
        const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
        const rowH = Math.max(7, maxLines * LINE_H + 2.8);

        if (y + rowH > 283) {
          doc.addPage();
          y = 16;
        }
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, contentWidth, rowH, "S");
        let cx = marginX;
        row.forEach((cell, i) => {
          const cellAlign = (align && align[i]) || "left";
          const textX = cellAlign === "right" ? cx + colWidths[i] - 3 : cx + 3;
          cellLines[i].forEach((line, li) => {
            doc.text(line, textX, y + (li + 1) * LINE_H, { align: cellAlign });
          });
          cx += colWidths[i];
        });
        y += rowH;
      });
      y += 6;
    }

    drawTable(
      "Dados informados",
      ["Dados informados", "Valor"],
      inputRowsFor(inputs),
      [contentWidth * 0.6, contentWidth * 0.4],
      ["left", "right"]
    );

    drawTable(
      "Memória de cálculo",
      ["Descrição", "Fórmula", "Valor"],
      rows.map(([label, formula, value]) => [label, formula, currencyFmt.format(value)]),
      [contentWidth * 0.24, contentWidth * 0.5, contentWidth * 0.26],
      ["left", "left", "right"]
    );

    // Summary cards
    if (y + 26 > 283) {
      doc.addPage();
      y = 16;
    }
    const cards = [
      ["Custo total", currencyFmt.format(r.custoTotal)],
      ["Preço de venda", currencyFmt.format(r.precoVenda)],
      ["Valor de venda c/ imposto", currencyFmt.format(r.valorVendaComImposto)],
      ["Lucro total", currencyFmt.format(r.lucroTotal)],
      ["Custo unitário de venda", currencyFmt.format(r.custoUnitarioVenda)],
      ["Lucro unitário", currencyFmt.format(r.lucroUnitario)],
    ];
    const cardGap = 4;
    const cardW = (contentWidth - cardGap * 2) / 3;
    const cardH = 18;
    cards.forEach((card, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = marginX + col * (cardW + cardGap);
      const cy = y + row * (cardH + cardGap);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.rect(cx, cy, cardW, cardH, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK_SOFT);
      doc.text(card[0].toUpperCase(), cx + 3, cy + 6);
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...GOLD_DARK);
      doc.text(card[1], cx + 3, cy + 13.5);
    });
    y += Math.ceil(cards.length / 3) * (cardH + cardGap) + 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK_SOFT);
    doc.text("Documento gerado automaticamente pelo Simulador de Custo Eternure.", pageWidth / 2, 290, { align: "center" });

    doc.save(`eternure-resumo-custo-${safeFileName(inputs.nomeProduto)}.pdf`);
  }

  // ---------- Excel export (SpreadsheetML, no external library needed) ----------
  function xmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function excelCell(type, value, styleId) {
    const style = styleId ? ` ss:StyleID="${styleId}"` : "";
    return `<Cell${style}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
  }

  function excelRow(cells) {
    return `<Row>${cells.join("")}</Row>`;
  }

  function exportExcel() {
    const { inputs, r, rows } = currentState();
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    const xmlRows = [];
    xmlRows.push(excelRow([excelCell("String", "Eternure — Resumo de Custo e Precificação", "title")]));
    xmlRows.push(excelRow([excelCell("String", "Produto"), excelCell("String", inputs.nomeProduto, "bold")]));
    xmlRows.push(excelRow([excelCell("String", "Data"), excelCell("String", dateStr)]));
    xmlRows.push(excelRow([]));

    xmlRows.push(excelRow([excelCell("String", "Dados informados", "header"), excelCell("String", "Valor", "header")]));
    xmlRows.push(excelRow([excelCell("String", "Custo unitário"), excelCell("Number", inputs.custoUnitario, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Quantidade total"), excelCell("Number", inputs.quantidade)]));
    xmlRows.push(excelRow([excelCell("String", "Frete de compra"), excelCell("Number", inputs.frete, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Custo de produção"), excelCell("Number", inputs.custoProducao, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Imposto de compra"), excelCell("Number", inputs.pctImpostoCompra, "percent")]));
    xmlRows.push(excelRow([excelCell("String", "Margem de lucro"), excelCell("Number", inputs.margemLucro, "percent")]));
    xmlRows.push(excelRow([excelCell("String", "Imposto de venda"), excelCell("Number", inputs.pctImpostoVenda, "percent")]));
    xmlRows.push(excelRow([]));

    xmlRows.push(excelRow([
      excelCell("String", "Descrição", "header"),
      excelCell("String", "Fórmula", "header"),
      excelCell("String", "Valor", "header"),
    ]));
    rows.forEach(([label, formula, value]) => {
      xmlRows.push(excelRow([
        excelCell("String", label),
        excelCell("String", formula),
        excelCell("Number", value, "currency"),
      ]));
    });
    xmlRows.push(excelRow([]));

    xmlRows.push(excelRow([excelCell("String", "Resumo", "header"), excelCell("String", "", "header")]));
    xmlRows.push(excelRow([excelCell("String", "Custo total"), excelCell("Number", r.custoTotal, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Preço de venda"), excelCell("Number", r.precoVenda, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Valor de venda c/ imposto"), excelCell("Number", r.valorVendaComImposto, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Lucro total"), excelCell("Number", r.lucroTotal, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Custo unitário de venda"), excelCell("Number", r.custoUnitarioVenda, "currency")]));
    xmlRows.push(excelRow([excelCell("String", "Lucro unitário"), excelCell("Number", r.lucroUnitario, "currency")]));

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="14" ss:Color="#6B5D3F"/></Style>
  <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
  <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#6B5D3F" ss:Pattern="Solid"/></Style>
  <Style ss:ID="currency"><NumberFormat ss:Format="&quot;R$&quot;\\ #,##0.00"/></Style>
  <Style ss:ID="percent"><NumberFormat ss:Format="0.00%"/></Style>
 </Styles>
 <Worksheet ss:Name="Resumo de Custo">
  <Table>
${xmlRows.join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eternure-resumo-custo-${safeFileName(inputs.nomeProduto)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  document.getElementById("form-simulador").addEventListener("input", render);
  document.getElementById("btn-pdf").addEventListener("click", generatePDF);
  document.getElementById("btn-excel").addEventListener("click", exportExcel);

  render();
})();
