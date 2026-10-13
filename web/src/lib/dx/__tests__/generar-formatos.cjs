/* eslint-disable @typescript-eslint/no-require-imports -- generador local de archivos de prueba. */
// Genera, a partir de los estados reales de Supersociedades de esta carpeta, los mismos estados en otros formatos
// (PDF, Word, PowerPoint, OpenDocument, XBRL, iXBRL, HTML, JSON, texto, Markdown, RTF, ZIP, XLSB, XLS, SYLK).
// Ejecutar desde web/: node src/lib/dx/__tests__/generar-formatos.cjs
const fs = require("node:fs"), path = require("node:path"), XLSX = require("xlsx"), JSZip = require("jszip"), { jsPDF } = require("jspdf"), { autoTable } = require("jspdf-autotable");
const dir = path.join(__dirname, "formatos");
const hojas = f => { const w = XLSX.readFile(path.join(dir, f), { cellDates: true }); return w.SheetNames.map(n => ({ n, f: XLSX.utils.sheet_to_json(w.Sheets[n], { header: 1, raw: true, defval: "" }) })); };
const co = v => typeof v === "number" ? (v < 0 ? "(" + Math.abs(v).toLocaleString("es-CO") + ")" : v.toLocaleString("es-CO")) : v instanceof Date ? v.toISOString().slice(0, 10).split("-").reverse().join("/") : String(v);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escribir = (n, d) => { fs.writeFileSync(path.join(dir, n), d); console.log("  " + n); };

(async () => {
    // PDF tipo tabla (autotable) y PDF tipo estado contable: cifras alineadas a la derecha, columna de notas y encabezado en dos líneas
    { const doc = new jsPDF(); let y = 12; for (const h of hojas("pyme_v1_supersociedades.xlsx")) { doc.setFontSize(10); doc.text(h.n, 10, y); autoTable(doc, { startY: y + 3, body: h.f.map(r => r.map(co)), styles: { fontSize: 7 } }); y = doc.lastAutoTable.finalY + 10; } escribir("pyme_v9_pdf_tabla.pdf", Buffer.from(doc.output("arraybuffer"))); }
    { const doc = new jsPDF(); doc.setFontSize(12); doc.text("Fábrica de Muebles La Esperanza S.A.S.", 15, 15); doc.setFontSize(8);
      let y = 22;
      for (const h of hojas("grande_v1_supersociedades.xlsx")) {
          doc.setFontSize(10); doc.text(h.n, 15, y); y += 5; doc.setFontSize(7.5);
          for (const r of h.f) {
              if (y > 285) { doc.addPage(); y = 15; doc.text("Nota", 120, y, { align: "right" }); doc.text("31 de diciembre de 2025", 160, y, { align: "right" }); doc.text("31 de diciembre de 2024", 195, y, { align: "right" }); y += 5; }
              if (r[1] instanceof Date || (typeof r[1] === "string" && /\d{4}$/.test(r[1]))) { doc.text("Nota", 120, y, { align: "right" }); doc.text("31 de diciembre de 2025", 160, y, { align: "right" }); doc.text("31 de diciembre de 2024", 195, y, { align: "right" }); y += 5; continue; }
              if (!r[0]) continue;
              doc.text(String(r[0]).slice(0, 70), 15, y);
              if (typeof r[1] === "number") { if (/efectivo|inventario|ingresos de act/i.test(r[0])) doc.text(String(4 + Math.round(y) % 9), 120, y, { align: "right" }); doc.text(co(r[1]), 160, y, { align: "right" }); doc.text(co(r[2]), 195, y, { align: "right" }); }
              y += 4.2;
          }
          y += 6;
      }
      escribir("grande_v3_pdf_contable.pdf", Buffer.from(doc.output("arraybuffer"))); }

    // Word con tablas (y párrafos con el nombre y la unidad)
    { const filas = hojas("perdidas_v1_supersociedades.xlsx");
      const tc = t => `<w:tc><w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr><w:p><w:r><w:t xml:space="preserve">${esc(co(t))}</w:t></w:r></w:p></w:tc>`;
      const cuerpo = filas.map(h => `<w:p><w:r><w:t>${esc(h.n)}</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>${h.f.filter(r => r.some(Boolean)).map(r => `<w:tr>${r.map(tc).join("")}</w:tr>`).join("")}</w:tbl>`).join("");
      const z = new JSZip();
      z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
      z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
      z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Informe financiero anual</w:t></w:r></w:p>${cuerpo}<w:sectPr/></w:body></w:document>`);
      escribir("perdidas_v3_word.docx", await z.generateAsync({ type: "nodebuffer" })); }

    // PowerPoint con una tabla por diapositiva
    { const filas = hojas("construccion_v1_supersociedades.xlsx"), z = new JSZip();
      const tc = t => `<a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>${esc(co(t))}</a:t></a:r></a:p></a:txBody></a:tc>`;
      filas.forEach((h, i) => z.file(`ppt/slides/slide${i + 1}.xml`, `<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${esc(h.n)}</a:t></a:r></a:p></p:txBody></p:sp><p:graphicFrame><a:graphic><a:graphicData><a:tbl>${h.f.filter(r => r.some(Boolean)).map(r => `<a:tr h="300">${r.map(tc).join("")}</a:tr>`).join("")}</a:tbl></a:graphicData></a:graphic></p:graphicFrame></p:spTree></p:cSld></p:sld>`));
      z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`);
      escribir("construccion_v3_presentacion.pptx", await z.generateAsync({ type: "nodebuffer" })); }

    // OpenDocument texto
    { const filas = hojas("sin_deuda_v1_supersociedades.xlsx"), z = new JSZip();
      const celda = v => typeof v === "number" ? `<table:table-cell office:value-type="float" office:value="${v}"><text:p>${co(v)}</text:p></table:table-cell>` : `<table:table-cell office:value-type="string"><text:p>${esc(co(v))}</text:p></table:table-cell>`;
      z.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });
      z.file("content.xml", `<?xml version="1.0" encoding="UTF-8"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"><office:body><office:text>${filas.map(h => `<text:h>${esc(h.n)}</text:h><table:table table:name="${esc(h.n)}">${h.f.filter(r => r.some(Boolean)).map(r => `<table:table-row>${r.map(celda).join("")}</table:table-row>`).join("")}</table:table>`).join("")}</office:text></office:body></office:document-content>`);
      escribir("sin_deuda_v3_texto.odt", await z.generateAsync({ type: "nodebuffer" })); }

    // Hojas de cálculo en otros formatos que SheetJS escribe
    { const w = XLSX.readFile(path.join(dir, "pyme_v1_supersociedades.xlsx"), { cellDates: true });
      escribir("pyme_v10_opendocument.ods", XLSX.write(w, { type: "buffer", bookType: "ods" }));
      escribir("pyme_v11_binario.xlsb", XLSX.write(w, { type: "buffer", bookType: "xlsb" }));
      escribir("pyme_v12_excel97.xls", XLSX.write(w, { type: "buffer", bookType: "biff8" })); }
    { const w = XLSX.readFile(path.join(dir, "construccion_v1_supersociedades.xlsx"), { cellDates: true });
      escribir("construccion_v4_web.html", `<html><body><h1>Constructora</h1>${w.SheetNames.map(n => XLSX.utils.sheet_to_html(w.Sheets[n], { header: "", footer: "" })).join("<br>")}</body></html>`); }

    // XBRL (instancia) e iXBRL a partir del mapeo del motor
    { const ts = require("typescript");
      require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
      const { parseWorkbook } = require("../engine.ts");
      const C = { cash: "CashAndCashEquivalents", ar: "TradeAndOtherCurrentReceivables", inv: "Inventories", tca: "CurrentAssets", ppe: "PropertyPlantAndEquipment", intg: "IntangibleAssetsOtherThanGoodwill", tnca: "NoncurrentAssets", ta: "Assets", ap: "TradeAndOtherCurrentPayables", stb: "OtherCurrentFinancialLiabilities", tcl: "CurrentLiabilities", ltd: "OtherNoncurrentFinancialLiabilities", tncl: "NoncurrentLiabilities", tl: "Liabilities", re: "RetainedEarnings", eq: "Equity", tle: "EquityAndLiabilities", rev: "Revenue", cogs: "CostOfSales", gp: "GrossProfit", ebit: "ProfitLossFromOperatingActivities", iexp: "FinanceCosts", iinc: "FinanceIncome", ebt: "ProfitLossBeforeTax", tax: "IncomeTaxExpenseContinuingOperations", ni: "ProfitLoss" };
      const p = parseWorkbook(XLSX.readFile(path.join(dir, "pyme_v1_supersociedades.xlsx"), { cellDates: true }), "pyme.xlsx");
      const ctx = p.years.map(y => `<xbrli:context id="I${y}"><xbrli:entity><xbrli:identifier scheme="http://www.supersociedades.gov.co">900123456</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:instant>${y}-12-31</xbrli:instant></xbrli:period></xbrli:context><xbrli:context id="D${y}"><xbrli:entity><xbrli:identifier scheme="http://www.supersociedades.gov.co">900123456</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>${y}-01-01</xbrli:startDate><xbrli:endDate>${y}-12-31</xbrli:endDate></xbrli:period></xbrli:context><xbrli:context id="S${y}"><xbrli:entity><xbrli:identifier scheme="x">1</xbrli:identifier><xbrli:segment><xbrldi:explicitMember dimension="ifrs-full:SegmentsAxis">ifrs-full:A</xbrldi:explicitMember></xbrli:segment></xbrli:entity><xbrli:period><xbrli:instant>${y}-12-31</xbrli:instant></xbrli:period></xbrli:context>`).join("");
      const hechos = [], ihechos = [];
      p.rows.filter(r => r.field && C[r.field]).forEach(r => p.years.forEach((y, i) => { if (r.v[i] == null) return; const c = (r.st === "bal" ? "I" : "D") + y; hechos.push(`<ifrs-full:${C[r.field]} contextRef="${c}" unitRef="COP" decimals="-3">${r.v[i] * 1000}</ifrs-full:${C[r.field]}>`, `<ifrs-full:${C[r.field]} contextRef="S${y}" unitRef="COP" decimals="-3">1</ifrs-full:${C[r.field]}>`); ihechos.push(`<tr><td>${esc(r.label)}</td><td><ix:nonFraction name="ifrs-full:${C[r.field]}" contextRef="${c}" unitRef="COP" decimals="-3" scale="3" format="ixt:num-dot-decimal">${Math.abs(r.v[i]).toLocaleString("en-US")}</ix:nonFraction></td></tr>`); }));
      escribir("pyme_v13_supersociedades.xbrl", `<?xml version="1.0" encoding="UTF-8"?><xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:ifrs-full="http://xbrl.ifrs.org/taxonomy/2024-03-27/ifrs-full" xmlns:xbrldi="http://xbrl.org/2006/xbrldi" xmlns:iso4217="http://www.xbrl.org/2003/iso4217"><xbrli:unit id="COP"><xbrli:measure>iso4217:COP</xbrli:measure></xbrli:unit>${ctx}<ifrs-full:NameOfReportingEntityOrOtherMeansOfIdentification contextRef="D${p.years[1]}">Confecciones Andinas S.A.S.</ifrs-full:NameOfReportingEntityOrOtherMeansOfIdentification>${hechos.join("")}</xbrli:xbrl>`);
      escribir("pyme_v14_inline.xhtml", `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:ix="http://www.xbrl.org/2013/inlineXBRL" xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:ifrs-full="http://xbrl.ifrs.org/taxonomy/2024-03-27/ifrs-full"><body><div style="display:none"><ix:header><ix:resources><xbrli:unit id="COP"><xbrli:measure>iso4217:COP</xbrli:measure></xbrli:unit>${ctx}</ix:resources></ix:header></div><p>Cifras en miles de pesos</p><table>${ihechos.join("")}</table></body></html>`);
      // JSON en formato largo (cuenta, año, valor) con la PyG en negativo como la exporta un ERP
      const largo = p.rows.filter(r => !r.hdr).flatMap(r => p.years.map((y, i) => ({ cuenta: r.label, anio: y, valor: r.v[i] })));
      escribir("pyme_v15_erp.json", JSON.stringify({ empresa: "Confecciones Andinas S.A.S.", unidad: "miles de pesos", datos: largo }, null, 1)); }

    // Texto de reporte contable (columnas por espacios, con notas), Markdown y RTF
    { const filas = hojas("perdidas_v1_supersociedades.xlsx"), lineas = ["DISTRIBUIDORA DEL NORTE S.A.S.", "Cifras en miles de pesos colombianos", ""];
      filas.forEach(h => { lineas.push(h.n.toUpperCase(), ""); h.f.forEach(r => { if (r[1] instanceof Date) lineas.push("".padEnd(60) + "Nota" + "2025".padStart(16) + "2024".padStart(16)); else if (r[0] && r[1] !== "") lineas.push(String(r[0]).slice(0, 58).padEnd(60) + (/efectivo|inventario/i.test(r[0]) ? "  7 " : "    ") + co(r[1]).padStart(16) + co(r[2]).padStart(16)); }); lineas.push(""); });
      escribir("perdidas_v4_reporte.txt", lineas.join("\r\n")); }
    { const filas = hojas("sin_deuda_v1_supersociedades.xlsx"), md = ["# Comercializadora", "", "Cifras en miles de pesos", ""];
      filas.forEach(h => { md.push("## " + h.n, "", "| Cuenta | 2025 | 2024 |", "|---|---:|---:|"); h.f.forEach(r => { if (r[0] && typeof r[1] === "number") md.push(`| ${r[0]} | ${co(r[1])} | ${co(r[2])} |`); }); md.push(""); });
      escribir("sin_deuda_v4_notas.md", md.join("\n")); }
    { const filas = hojas("construccion_v1_supersociedades.xlsx");
      const rtf = ["{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs20 Constructora del Caribe\\par Cifras en miles de pesos\\par"];
      filas.forEach(h => { rtf.push(h.n.replace(/[áéíóú]/g, c => "\\'" + Buffer.from(c, "latin1")[0].toString(16)) + "\\par"); h.f.forEach(r => { if (!r.some(Boolean)) return; rtf.push("\\trowd\\cellx5000\\cellx7000\\cellx9000 " + r.map(v => "\\intbl " + co(v).replace(/[áéíóúñ]/g, c => "\\'" + Buffer.from(c, "latin1")[0].toString(16)) + "\\cell").join(" ") + "\\row"); }); });
      rtf.push("}"); escribir("construccion_v5_documento.rtf", rtf.join("\n")); }

    // ZIP con un Excel dentro
    { const z = new JSZip(); z.file("__MACOSX/._x", "x"); z.file("estados/LEEME.txt", "Estados 2025"); z.file("estados/grande.xlsx", fs.readFileSync(path.join(dir, "grande_v1_supersociedades.xlsx")));
      escribir("grande_v4_comprimido.zip", await z.generateAsync({ type: "nodebuffer" })); }
})().catch(e => { console.error(e); process.exit(1); });
