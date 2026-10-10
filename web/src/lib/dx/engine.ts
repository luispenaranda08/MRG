/* eslint-disable */
// @ts-nocheck
// Port literal de las fórmulas dinámicas del DX original; API e interfaz con contratos tipados.
import * as XLSX from "xlsx";
import { proponerEmpresa } from "../nombres";
import ExcelJS from "exceljs";
import { applyTone } from "../excel";
const LY = c => c.years.length - 1;
const norm = s => String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
/* ======================= Diccionario de cuentas ======================= */
const F = [
    ["cash", "bal", "Efectivo y equivalentes", "ln", /efectivo y equivalentes|cash and (cash )?equivalents|caja y bancos|^disponible$|^efectivo$/, /restringid|restricted|crecimiento|growth/],
    ["sti", "bal", "Inversiones de corto plazo", "ln", /inversiones (a |de )?corto plazo|short.?term investments|inversiones temporales|inversiones corrientes/],
    ["ar", "bal", "Cuentas por cobrar", "ln", /cuentas (comerciales )?por cobrar|deudores comerciales|receivables?|^cartera|^deudores/, /largo plazo|long.?term|no corriente|other receivables/],
    ["inv", "bal", "Inventarios", "ln", /inventario|inventor(y|ies)|existencias|^mercancias/, /no corriente|non.?current/],
    ["pre", "bal", "Gastos pagados por anticipado", "ln", /pagados por (adelantado|anticipado)|prepaid|gastos anticipados/],
    ["tca", "bal", "Activo corriente", "sub", /total (del |de )?activos? corrientes?|total current assets|activos? corrientes? totales|^activos? corrientes?$|activo corriente total/, /no corriente|non.?current/],
    ["ppe", "bal", "Propiedad, planta y equipo", "ln", /propiedad(es)?,? planta y equipo|planta,? propiedad y equipo|property,? plant|pp&e|inmovilizado material|^activos fijos/, /bruto|gross|acumulad|accumulated/],
    ["lti", "bal", "Inversiones de largo plazo", "ln", /inversiones (a |de )?largo plazo|long.?term investments|inversiones no corrientes|inversiones en (subsidiarias|asociadas)/],
    ["intg", "bal", "Intangibles", "ln", /^activos intangibles|^intangibles?|intangible assets/, /otros intangibles|other intangibles/],
    ["tnca", "bal", "Activo no corriente", "sub", /total (del |de )?activos? no corrientes?|total non.?current assets|^activos? no corrientes?$/],
    ["ta", "bal", "Activo total", "tot", /^total (del |de )?activos?$|^activos? totales$|^total assets$/],
    ["ap", "bal", "Cuentas por pagar y proveedores", "ln", /cuentas (comerciales )?por pagar|^proveedores|accounts payable/, /impuesto|tax|largo plazo|long.?term/],
    ["stb", "bal", "Obligaciones financieras de corto plazo", "ln", /prestamos (a |de )?corto plazo|obligaciones financieras corrientes|^otros pasivos financieros corrientes|^pasivos financieros corrientes|obligaciones financieras (a |de )?corto plazo|short.?term borrowings|deuda (a |de )?corto plazo/],
    ["cpltd", "bal", "Porción corriente de la deuda", "ln", /parte (actual|corriente) de la deuda|porcion corriente de (la )?deuda|current portion of long.?term debt/],
    ["tcl", "bal", "Pasivo corriente", "sub", /total (del |de )?pasivos? corrientes?|total current liabilities|^pasivos? corrientes?$/, /no corriente|non.?current/],
    ["ltd", "bal", "Deuda de largo plazo", "ln", /^deuda (a |de )?largo plazo|^long.?term debt$|obligaciones financieras no corrientes|^otros pasivos financieros no corrientes|^pasivos financieros no corrientes|obligaciones financieras (a |de )?largo plazo/, /parte|porcion|current/],
    ["lease", "bal", "Arrendamientos de largo plazo", "ln", /arrendamientos (a |de )?largo plazo|long.?term leases|pasivos por arrendamiento no corrientes/],
    ["tncl", "bal", "Pasivo no corriente", "sub", /total (del |de )?pasivos? no corrientes?|total non.?current liabilities|^pasivos? no corrientes?$/],
    ["tl", "bal", "Pasivo total", "sub", /^total (del |de )?pasivos?$|^pasivos? totales?$|^total liabilities$|^pasivo total$/],
    ["re", "bal", "Utilidades retenidas", "ln", /ganancias (retenidas|acumuladas)|utilidades (retenidas|acumuladas)|retained earnings|resultados acumulados/],
    ["mi", "bal", "Interés minoritario", "ln", /intereses? minoritarios?|minority interest|participaciones? no controladoras?/],
    ["eq", "bal", "Patrimonio total", "sub", /^patrimonio neto$|^total (del |de )?patrimonio( neto)?$|^total equity$|^patrimonio total$|^patrimonio$/, /pasivo|liabilities/],
    ["tle", "bal", "Pasivo + patrimonio", "tot", /total (del |de )?pasivos? y (del |de )?patrimonio|total (de |del )?patrimonio y pasivos?|total liabilities and (shareholders.? )?equity/],
    ["debt", "bal", "Deuda financiera total", "memo", /^deuda total$|^total debt$|deuda financiera total|total obligaciones financieras/, /crecimiento|growth/],
    ["rev", "pyg", "Ingresos totales", "tot", /ingresos totales|total revenues?|ingresos de actividades ordinarias|ingresos operacionales|ventas netas|^ventas$|^ingresos$|^revenues?$|^net sales/, /crecimiento|growth|cost|no devengad|intereses|financieros/],
    ["cogs", "pyg", "Costo de ventas", "ln", /cost[eo]s? de (los )?(ingresos|ventas)|cost of (revenues?|goods|sales)|costo de la mercancia/],
    ["gp", "pyg", "Utilidad bruta", "sub", /beneficio bruto|utilidad bruta|ganancia bruta|gross profit/, /crecimiento|growth|margen|margin/],
    ["opx", "pyg", "Gastos operativos", "ln", /total (de )?otros gastos operativos|other operating expenses,? total|total gastos (operacionales|operativos)/],
    ["sga", "pyg", "Gastos de administración y ventas", "ln", /gastos de venta,? generales|selling,? general|^gastos de administracion|administracion y ventas/],
    ["ebit", "pyg", "Utilidad operativa (EBIT)", "sub", /^ebit$|^ebit \(|utilidad operativa|utilidad operacional|ganancia operacional|(ganancia|perdida).*actividades de operacion|operating income|resultado operativo/, /margen|margin|crecimiento/],
    ["iexp", "pyg", "Gasto por intereses", "ln", /total de gastos de intereses|gastos? (por |de )?intereses|interest expense|^costos financieros|^gastos financieros/, /net|neto|ingreso/],
    ["iinc", "pyg", "Ingresos financieros", "ln", /ingresos por intereses|ingresos financieros|interest (and investment )?income/],
    ["ebt", "pyg", "Utilidad antes de impuestos", "sub", /ebt incluyendo|ebt,? incl|antes de impuestos|income before (income )?tax|^ebt$/, /excepto|excl|crecimiento|margen|growth|margin/],
    ["tax", "pyg", "Impuesto de renta", "ln", /impuesto (sobre la |a la |de )?renta|income tax|impuestos? a las ganancias|gasto por impuesto|^(ingreso|gasto) \((gasto|ingreso)\) por impuestos?|^(gasto|ingreso) por impuestos?/, /diferido|antes|deferred|before/],
    ["nic", "pyg", "Utilidad neta consolidada", "sub", /beneficios netos para la empresa|net income to company|utilidad neta consolidada/],
    ["ni", "pyg", "Utilidad neta", "tot", /^beneficio neto$|^utilidad neta|^ganancia (\(perdida\) )?neta|^net income$|^resultado neto|^(ganancia|perdida) neta|^ganancia \(perdida\)$|^(ganancia|perdida) \((ganancia|perdida)\)$|^(utilidad|ganancia|perdida|resultado) (neta |\(perdida\) )?del (ejercicio|periodo)$|^(utilidad|perdida|resultado) (neta )?del ejercicio/, /sobre ingresos|crecimiento|margen|growth|margin|common|minorit|por accion/],
    ["ebitda", "pyg", "EBITDA", "memo", /^ebitda$/],
    ["da", "pyg", "Depreciación y amortización", "memo", /depreciacion y amortizacion|^d&a|depreciation (and|&) amortization/, /acumulad/]
];
const FI: Record<string, {
    id: string;
    st: string;
    l: string;
    t: string;
    re: RegExp;
    ex?: RegExp;
}> = {};
F.forEach(f => FI[f[0]] = { id: f[0], st: f[1], l: f[2], t: f[3], re: f[4], ex: f[5] });
const AUX = [["capex", /capex|inversion en activos fijos|capital expenditures?|adquisicion de propiedades/], ["shares", /promedio ponderado diluido|diluted (weighted )?(average )?shares/], ["shares", /acciones en circulacion|shares outstanding|promedio ponderado (basico )?de acciones/]];
const EXP = ["cogs", "sga", "opx", "tax"];
/* ======================= Lectura ======================= */
const MES = /^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*[\s.\-\/]*((?:19|20)\d{2})$/i;
function yearOf(v) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 1990 && v <= 2100)
        return v;
    // Fechas reales de Excel en el encabezado (31/12/2025), leídas con cellDates
    if (v instanceof Date && !isNaN(v.getTime())) {
        const y = new Date(v.getTime() + 43_200_000).getFullYear();
        return y >= 1990 && y <= 2100 ? y : null;
    }
    if (typeof v !== "string")
        return null;
    const t = v.trim();
    if (t.length > 16)
        return null;
    let m = t.match(/^(?:fy|ay|ejercicio|año)?\s*((?:19|20)\d{2})\s*(?:\(?(?:real|r|e|p|est|estimado)\)?)?$/i);
    if (m)
        return +m[1];
    m = t.match(/^(?:\d{1,2}[\/\-.]){1,2}((?:19|20)\d{2})$/);
    if (m)
        return +m[1];
    m = t.match(/^((?:19|20)\d{2})[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/);
    if (m)
        return +m[1];
    m = t.match(MES);
    if (m)
        return +m[2];
    return null;
}
function num(v) {
    if (v == null)
        return null;
    if (typeof v === "number")
        return isFinite(v) ? v : null;
    if (v instanceof Date)
        return null;
    let s = String(v).trim();
    if (!s || /^[-–—]+$/.test(s) || /^n\/?[ad]$/i.test(s) || /%$/.test(s))
        return null;
    const neg = /^\(.*\)$/.test(s) || /^[-–]/.test(s);
    s = s.replace(/[()\s$€]|COP|USD/gi, "").replace(/^[-–]/, "");
    const lc = s.lastIndexOf(","), ld = s.lastIndexOf(".");
    if (lc > -1 && ld > -1)
        s = lc > ld ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    else if (lc > -1) {
        const p = s.split(",");
        s = p.length === 2 && p[1].length !== 3 ? s.replace(",", ".") : s.replace(/,/g, "");
    }
    else if (ld > -1) {
        const p = s.split(".");
        if (p.length > 2 || (p.length === 2 && p[1].length === 3))
            s = s.replace(/\./g, "");
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : (neg ? -n : n);
}
function headerRow(rows) {
    for (let r = 0; r < Math.min(rows.length, 30); r++) {
        const row = rows[r] || [], seen = new Set(), cols = [];
        for (let c = 0; c < row.length; c++) {
            const y = yearOf(row[c]);
            if (!y)
                continue;
            if (seen.has(y))
                break;
            seen.add(y);
            cols.push([c, y]);
        }
        if (cols.length >= 2)
            return { r, cols };
    }
    return null;
}
function parseWorkbook(wb, fname) {
    const sheets = [], text = [];
    wb.SheetNames.forEach(name => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null, blankrows: true });
        rows.slice(0, 16).forEach(r => (r || []).forEach(v => { if (typeof v === "string")
            text.push(v); }));
        const h = headerRow(rows);
        if (!h)
            return;
        const first = h.cols[0][0], out = [];
        for (let r = h.r + 1; r < rows.length; r++) {
            const row = rows[r] || [];
            let lab = null;
            for (let c = 0; c < first; c++) {
                const v = row[c];
                // Se salta códigos de cuenta (PUC "1105", "41") para tomar el nombre de la cuenta
                if (typeof v === "string" && v.trim() && !/^https?:/i.test(v.trim()) && !/^[\d.\-\s]+$/.test(v.trim())) {
                    lab = v.trim();
                    break;
                }
            }
            if (!lab)
                continue;
            out.push({ label: lab, v: h.cols.map(([c]) => num(row[c])) });
        }
        let years = h.cols.map(x => x[1]);
        if (years[0] > years[years.length - 1]) {
            years = years.slice().reverse();
            out.forEach(o => o.v.reverse());
        }
        const mags = out.flatMap(o => o.v.filter(v => v != null).map(Math.abs)).sort((a, b) => a - b), med = mags.length ? mags[Math.floor(mags.length / 2)] : 0;
        let nb = 0, np = 0;
        out.forEach(o => { const n = norm(o.label); F.forEach(f => { if (f[4].test(n) && !(f[5] && f[5].test(n))) {
            if (f[1] === "bal")
                nb++;
            else
                np++;
        } }); });
        sheets.push({ name, years, rows: out, med, nb, np });
    });
    if (!sheets.length)
        throw new Error("No encontré columnas con años (por ejemplo 2023, 2024, 2025) en ninguna hoja.");
    const bs = sheets.slice().sort((a, b) => b.nb - a.nb)[0], ps = sheets.slice().sort((a, b) => b.np - a.np)[0];
    if (bs.nb < 3 || ps.np < 3)
        throw new Error("No reconocí suficientes cuentas de balance o de resultados. Revisa que el archivo tenga ambos estados con una cuenta por fila.");
    const years = bs.years.filter(y => ps.years.indexOf(y) > -1);
    if (years.length < 2)
        throw new Error("El balance y el estado de resultados no comparten al menos dos años.");
    const pick = (sh, o) => years.map(y => o.v[sh.years.indexOf(y)]);
    const rows = [], used = {};
    const take = (sh, kind) => {
        let lastSt = kind === "both" ? "bal" : kind;
        sh.rows.forEach(o => {
            const v = pick(sh, o), n = norm(o.label), vals = v.filter(x => x != null), mx = vals.length ? Math.max(...vals.map(Math.abs)) : 0;
            if (!vals.length) {
                if (/^(activos?|pasivos?|patrimonio|activos? (no )?corrientes?|pasivos? (no )?corrientes?|ingresos|gastos)$/.test(n))
                    rows.push({ label: o.label, st: lastSt, hdr: 1, v: years.map(() => null), sheet: sh.name });
                return;
            }
            if (/por accion|per share|^bpa|eps|dividendo por|promedio ponderado|acciones en circulacion|shares/.test(n))
                return;
            if ((/crecimiento|crecmiento|growth|%|margen|margin|variacion|ratio/.test(n) && mx <= 5) || (mx < 2 && sh.med > 500))
                return;
            let field = null, conf = 0;
            for (const f of F) {
                if (used[f[0]])
                    continue;
                if (kind !== "both" && f[1] !== kind)
                    continue;
                if (f[5] && f[5].test(n))
                    continue;
                const m = n.match(f[4]);
                if (m) {
                    field = f[0];
                    conf = 0.74 + 0.24 * Math.min(1, m[0].length / n.length);
                    break;
                }
            }
            if (field)
                used[field] = 1;
            const stt_ = field ? FI[field].st : lastSt;
            if (field)
                lastSt = stt_;
            rows.push({ label: o.label, st: stt_, field, conf, v, sheet: sh.name });
        });
    };
    if (bs === ps)
        take(bs, "both");
    else {
        take(bs, "bal");
        take(ps, "pyg");
    }
    const aux = {};
    AUX.forEach(([k, re]) => { if (aux[k])
        return; for (const sh of sheets) {
        const o = sh.rows.find(o => re.test(norm(o.label)) && years.some(y => sh.years.indexOf(y) > -1));
        if (o) {
            aux[k] = years.map(y => { const j = sh.years.indexOf(y); return j > -1 && o.v[j] != null ? Math.abs(o.v[j]) : null; });
            aux[k + "Src"] = sh.name + " · " + o.label;
            break;
        }
    } });
    const all = norm(text.join(" "));
    let unit = /miles de pesos|cop miles|en miles|thousands/.test(all) ? "miles" : /millones|millions|\bmm\b|us\$ mm/.test(all) ? "millones" : null;
    const rev = (rows.find(r => r.field === "rev") || { v: [0] }).v.filter(x => x != null), mr = rev.length ? Math.max(...rev.map(Math.abs)) : 0;
    if (!unit)
        unit = mr > 1e10 ? "unidades" : mr > 1e7 ? "miles" : "millones";
    const cur = /us\$|usd|dolares|u\.s\./.test(all) ? "USD" : /pesos|cop|niif|supersociedades|ingresos de actividades ordinarias/.test(all) ? "COP" : "USD";
    const name = proponerEmpresa(text, fname);
    return { years, rows, aux, unit, cur, name, sheets: sheets.map(s => s.name), bs: bs.name, ps: ps.name, fname };
}
/* ======================= Empresa a partir del mapeo ======================= */
const UM = { unidades: 1, miles: 1e3, millones: 1e6 };
function buildCompany(p, meta) {
    const years = p.years, n = years.length, bal = [], pyg = [], flags = [], has = {};
    let k = 0;
    p.rows.forEach(r => {
        if (r.hdr) {
            (r.st === "pyg" ? pyg : bal).push({ id: "h" + (k++), l: r.label, t: "hdr" });
            return;
        }
        const f = r.field && FI[r.field];
        let v = r.v.map(x => x == null ? 0 : x);
        if (f && EXP.indexOf(f.id) > -1 && v.filter(x => x < 0).length > v.length / 2)
            v = v.map(x => -x);
        const id = f ? f.id : "x" + (k++);
        if (f)
            has[f.id] = 1;
        (r.st === "pyg" ? pyg : bal).push({ id, l: r.label, t: f ? f.t : (/^total/.test(norm(r.label)) ? "sub" : "ln"), lv: f && f.t !== "ln" ? undefined : 1, neg: f && EXP.indexOf(f.id) > -1 ? 1 : undefined, v });
    });
    const G = (id) => { const r = bal.concat(pyg).find(x => x.id === id && x.v); return r ? r.v : null; };
    const addD = (arr, id, l, t, v, why) => { arr.push({ id, l: l + " (derivada)", t, v }); has[id] = 1; flags.push({ st: arr === bal ? "bal" : "pyg", id, y: years.map((y, i) => i), sev: "info", msg: "Partida derivada por Mirage: " + why + "." }); };
    const z = () => years.map(() => 0), sum = (...a) => years.map((y, i) => a.reduce((s, v) => s + (v ? v[i] : 0), 0));
    let hdr = false;
    const memo = (arr) => { if (!hdr) {
        bal.push({ id: "hD", l: "Partidas derivadas", t: "hdr" });
        hdr = true;
    } };
    if (!has.ta && has.tle) {
        memo();
        addD(bal, "ta", "Activo total", "tot", G("tle").slice(), "igual a pasivo + patrimonio");
    }
    if (!has.tl && has.ta && has.eq) {
        memo();
        addD(bal, "tl", "Pasivo total", "sub", years.map((y, i) => G("ta")[i] - G("eq")[i]), "activo total − patrimonio");
    }
    if (!has.eq && has.ta && has.tl) {
        memo();
        addD(bal, "eq", "Patrimonio total", "sub", years.map((y, i) => G("ta")[i] - G("tl")[i]), "activo total − pasivo total");
    }
    if (!has.debt) {
        memo();
        addD(bal, "debt", "Deuda financiera total", "memo", sum(G("stb"), G("cpltd"), G("ltd"), G("lease")).map(Math.abs), "obligaciones financieras de corto y largo plazo + arrendamientos");
    }
    if (!has.cash) {
        memo();
        addD(bal, "cash", "Efectivo", "memo", z(), "no se encontró en el archivo; se asume 0");
    }
    ["ta", "tca", "tl", "tcl", "eq"].forEach(id => { if (!has[id])
        throw new Error("Falta una cuenta clave del balance: " + FI[id].l + ". Asígnala en la tabla de cuentas."); });
    let ph = false;
    const pmemo = () => { if (!ph) {
        pyg.push({ id: "hP", l: "Partidas derivadas", t: "hdr" });
        ph = true;
    } };
    if (!has.rev)
        throw new Error("Falta la cuenta de ingresos. Asígnala en la tabla de cuentas.");
    if (!has.gp && has.cogs) {
        pmemo();
        addD(pyg, "gp", "Utilidad bruta", "sub", years.map((y, i) => G("rev")[i] - G("cogs")[i]), "ingresos − costo de ventas");
    }
    if (!has.gp) {
        pmemo();
        addD(pyg, "gp", "Utilidad bruta", "sub", G("rev").slice(), "sin costo de ventas en el archivo; se iguala a ingresos");
    }
    if (!has.ebit && has.opx) {
        pmemo();
        addD(pyg, "ebit", "Utilidad operativa (EBIT)", "sub", years.map((y, i) => G("gp")[i] - G("opx")[i]), "utilidad bruta − gastos operativos");
    }
    if (!has.ebit)
        throw new Error("Falta la utilidad operativa (EBIT). Asígnala en la tabla de cuentas.");
    if (!has.ebt) {
        pmemo();
        addD(pyg, "ebt", "Utilidad antes de impuestos", "sub", years.map((y, i) => G("ebit")[i] - Math.abs((G("iexp") || z())[i]) + (G("iinc") || z())[i]), "EBIT − intereses + ingresos financieros");
    }
    if (!has.tax && has.ni) {
        pmemo();
        addD(pyg, "tax", "Impuesto de renta", "ln", years.map((y, i) => G("ebt")[i] - G("ni")[i]), "utilidad antes de impuestos − utilidad neta");
    }
    if (!has.ni && has.tax) {
        pmemo();
        addD(pyg, "ni", "Utilidad neta", "tot", years.map((y, i) => G("ebt")[i] - G("tax")[i]), "utilidad antes de impuestos − impuesto");
    }
    if (!has.ni)
        throw new Error("Falta la utilidad neta. Asígnala en la tabla de cuentas.");
    const map = {};
    ["rev", "gp", "ebit", "ebt", "tax", "ni", "ebitda", "da", "ta", "tca", "tl", "tcl", "eq", "mi", "cash", "sti", "ar", "inv", "ap", "ppe", "lti", "re", "debt"].forEach(x => { if (has[x])
        map[x] = x; });
    if (has.nic)
        map.nic = "nic";
    if (has.iexp)
        map.int = "iexp";
    const um = UM[meta.unit] || 1, usd = meta.cur === "USD" ? um / 1e6 : (meta.fx > 0 ? um / meta.fx / 1e6 : NaN);
    const maxTA = Math.max(...G("ta").map(Math.abs));
    const checks = { bal: [["ta", ["tl", "eq"]]], pyg: [] };
    if (p.rows.some(r => r.field === "gp") && p.rows.some(r => r.field === "cogs"))
        checks.pyg.push(["gp", ["rev", "-cogs"]]);
    const dec = Math.max(...G("rev").map(Math.abs)) >= 1e5 ? 0 : 1;
    return { tk: "MI", name: meta.name, short: meta.name.split(" ").slice(0, 2).join(" ").replace(/[,.]$/, ""), exch: meta.listed ? "Cotiza" : "No cotiza", cur: meta.cur, unit: meta.cur + " " + meta.unit, div: 1, dec, usd, um, country: meta.country,
        fy: "años " + years[0] + "–" + years[n - 1], activity: meta.sectorName + " · " + meta.country, years,
        src: { name: "Archivo cargado: " + p.fname, url: "#dx", primary: "Estados financieros de la empresa", purl: "#dx" }, origin: "Cargado por el usuario · " + p.fname,
        wacc: { v: null, note: "WACC calculado con API y supuestos del usuario" }, beta: { bu: meta.bu, buSrc: meta.sectorName }, capm: { rf: meta.rf, erp: meta.erp, crp: meta.crp, lam: meta.lam, src: "Supuestos de DX" },
        bal, pyg, checks, tol: Math.max(1, maxTA * 0.0005), flags, map, aux: p.aux };
}
const IDX = new WeakMap();
function ix(c) { if (!IDX.has(c)) {
    const m = {};
    ["bal", "pyg"].forEach(s => c[s].forEach(r => { m[s + ":" + r.id] = r; if (r.v && !m[r.id])
        m[r.id] = r; }));
    IDX.set(c, m);
} return IDX.get(c); }
function gv(c, key, i) { const id = c.map[key]; if (!id)
    return null; const r = ix(c)[id]; if (!r || !r.v)
    return null; const v = r.v[i]; return v == null ? null : v; }
function M(c, i) {
    c._m = c._m || [];
    if (c._m[i])
        return c._m[i];
    const g = k => gv(c, k, i);
    const rev = g("rev"), gp = g("gp"), ebit = g("ebit"), ebt = g("ebt"), tax = g("tax"), ni = g("ni");
    const nic = g("nic") != null ? g("nic") : ni;
    const ebitda = g("ebitda");
    let da = g("da");
    if (da == null && ebitda != null)
        da = ebitda - ebit;
    if (da == null && c.map.accdep && i > 0)
        da = -(gv(c, "accdep", i) - gv(c, "accdep", i - 1));
    let intr = g("int");
    intr = intr == null ? null : Math.abs(intr);
    const ta = g("ta"), tca = g("tca"), tl = g("tl"), tcl = g("tcl"), eq = g("eq"), mi = g("mi") || 0;
    const cash = g("cash") || 0, sti = g("sti") || 0, ar = g("ar") || 0, inv = g("inv") || 0, ap = g("ap") || 0, ppe = g("ppe") || 0, lti = g("lti") || 0, re = g("re"), debt = g("debt");
    const cogs = rev - gp, eqA = eq - mi, t = ebt > 0 ? tax / ebt : 0, nopat = ebit * (1 - t), ic = debt + eq - cash;
    return c._m[i] = { rev, cogs, gp, opex: gp - ebit, ebit, nonop: ebt - ebit, ebt, tax, nic, ni, min: ni - nic, ebitda, da, intr, ta, tca, tnca: ta - tca, tl, tcl, eq, eqA, mi, cash, sti, ar, inv, ap, ppe, lti, re, debt, t, nopat, ic,
        gm: gp / rev, em: ebit / rev, nm: ni / rev, roe: ni / eqA, roa: ni / ta, roic: nopat / ic, cr: tca / tcl, quick: (tca - inv) / tcl, de: debt / eq, la: tl / ta,
        cov: intr ? ebit / intr : null, nde: ebitda ? (debt - cash - sti) / ebitda : null, at: rev / ta, dso: ar / rev * 365, dio: inv && cogs ? inv / cogs * 365 : null, dpo: ap && cogs ? ap / cogs * 365 : null,
        mult: ta / eqA, wcta: (tca - tcl) / ta, ktno: ar + inv - ap };
}
function nf(v, d) { if (v == null || !isFinite(v))
    return "n/d"; const s = Math.abs(v).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }); return (v < 0 && s.replace(/[0.,]/g, "") !== "" ? "−" : "") + s; }
const U = (c, v) => v == null ? "n/d" : nf(v / c.div, c.dec);
const Ur = (c, r, v) => r && r.ps ? nf(v, 2) : U(c, v);
const P1 = (v, d) => v == null || !isFinite(v) ? "n/d" : nf(v * 100, d == null ? 1 : d) + "%";
const SP = (v, d) => v == null || !isFinite(v) ? "n/d" : (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v) * 100, d == null ? 1 : d) + "%";
const PP = (v, d) => v == null || !isFinite(v) ? "n/d" : (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v) * 100, d == null ? 1 : d) + " pp";
const X = (v, d) => v == null || !isFinite(v) ? "n/d" : nf(v, d == null ? 2 : d) + "x";
const cagr = (a, b, n) => a > 0 && b > 0 ? Math.pow(b / a, 1 / n) - 1 : null;
const median = v => { const a = v.slice().sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const yr = (c, i) => c.years[i];
const taUSD = (c, i) => M(c, i).ta * (c.usd != null ? c.usd : NaN); // a USD millones con TRM ≈ 4.000
/* ======================= Calidad de datos ======================= */
function dq(c) {
    if (c._dq)
        return c._dq;
    const list = [], cells = {};
    const add = (st, id, i, sev, msg) => { const k = st + ":" + id + ":" + i; (cells[k] = cells[k] || []).push({ sev, msg }); };
    const X_ = ix(c), ta = X_["bal:ta"], tl = X_["bal:tl"], eq = X_["bal:eq"];
    let ok = 0;
    c.years.forEach((y, i) => { const d = ta.v[i] - (tl.v[i] + eq.v[i]); if (Math.abs(d) <= c.tol)
        ok++;
    else
        add("bal", "ta", i, "alta", "Activo ≠ pasivo + patrimonio: diferencia de " + nf(d, c.dec) + "."); });
    list.push({ sev: ok === c.years.length ? "ok" : "alta", title: "Cuadre contable", msg: "Activo = pasivo + patrimonio en " + ok + " de " + c.years.length + " años.", go: { st: "bal", id: "ta", i: c.years.length - 1 } });
    let nd = 0, first = null;
    ["bal", "pyg"].forEach(st => (c.checks[st] || []).forEach(([tot, parts]) => {
        if (tot === "ta" && parts[0] === "tl")
            return;
        c.years.forEach((y, i) => {
            let s = 0;
            parts.forEach(p => { const neg = p[0] === "-", r = X_[st + ":" + (neg ? p.slice(1) : p)]; s += (neg ? -1 : 1) * ((r && r.v[i]) || 0); });
            const r = X_[st + ":" + tot], d = r.v[i] - s;
            if (Math.abs(d) > c.tol) {
                nd++;
                if (!first)
                    first = { st, id: tot, i };
                add(st, tot, i, "media", "El subtotal no coincide con la suma de sus partidas: diferencia de " + nf(d, c.dec) + " (" + c.unit + "). Revisar el desglose en la fuente primaria.");
            }
        });
    }));
    list.push({ sev: nd ? "media" : "ok", title: "Sumas de subtotales", msg: nd ? nd + " subtotales no coinciden con la suma de sus partidas." : "Todos los subtotales cuadran con sus partidas.", go: first });
    let ns = 0, fs = null;
    ["bal", "pyg"].forEach(st => c[st].forEach(r => {
        if (!r.v || r.t === "tot" || r.ps)
            return;
        r.v.forEach((v, i) => {
            if (!v)
                return;
            const others = r.v.filter((x, j) => j !== i && x).map(Math.abs);
            if (others.length < 2)
                return;
            const md = median(others);
            if (Math.abs(v) < md / 500) {
                ns++;
                if (!fs)
                    fs = { st, id: r.id, i };
                add(st, r.id, i, "alta", "Posible error de escala en la fuente: el valor es más de 500 veces menor que en los demás años (mediana " + U(c, md) + "). Si venía en miles, sería ≈ " + U(c, v * 1000) + ".");
            }
        });
    }));
    list.push({ sev: ns ? "alta" : "ok", title: "Saltos de escala", msg: ns ? ns + " celdas con valores fuera de escala respecto a su propia serie." : "Sin saltos de escala.", go: fs });
    c.flags.forEach(f => { f.y.forEach(i => add(f.st, f.id, i, f.sev, f.msg)); list.push({ sev: f.sev, title: f.sev === "alta" ? "Contraste con fuente primaria" : "Nota de la fuente", msg: f.msg, go: { st: f.st, id: f.id, i: f.y[0] } }); });
    return c._dq = { list, cells };
}
function altz(c, i) {
    const m = M(c, i), x1 = (m.tca - m.tcl) / m.ta, x2 = m.re / m.ta, x3 = m.ebit / m.ta, x4 = m.eq / m.tl, z = 3.25 + 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
    const T = [[8.15, "AAA"], [7.6, "AA+"], [7.3, "AA"], [7, "AA−"], [6.85, "A+"], [6.65, "A"], [6.4, "A−"], [6.25, "BBB+"], [5.85, "BBB"], [5.65, "BBB−"], [5.25, "BB+"], [4.95, "BB"], [4.75, "BB−"], [4.5, "B+"], [4.15, "B"], [3.75, "B−"], [3.2, "CCC+"], [2.5, "CCC"], [1.75, "CCC−"], [-99, "D"]];
    return { x1, x2, x3, x4, z, r: T.find(t => z >= t[0])[1] };
}
const NOTCH = ["AAA", "AA+", "AA", "AA−", "A+", "A", "A−", "BBB+", "BBB", "BBB−", "BB+", "BB", "BB−", "B+", "B", "B−", "CCC+", "CCC", "CCC−"];
const COUNTRY = { TGLS: -0.9, EC: -1.2, V: 0 };
function ratingModel(c, i) {
    const m = M(c, i), lev = m.nde != null ? clamp((2 - m.nde) / 1.5, -2, 2) : clamp((1 - m.de) / 0.6, -2, 2);
    const F = [["Cobertura de intereses", .2, m.cov ? clamp((Math.log(m.cov) - Math.log(4)) / 1.2, -2, 2) : -1, X(m.cov, 1)], ["Apalancamiento", .15, lev, m.nde != null ? "DN/EBITDA " + X(m.nde, 1) : "D/E " + X(m.de)], ["Margen EBIT", .1, clamp((m.em - .12) / .08, -2, 2), P1(m.em)], ["ROA", .1, clamp((m.roa - .06) / .05, -2, 2), P1(m.roa)], ["Tamaño (activo en USD)", .25, clamp((Math.log10(taUSD(c, i)) - 3.8) / .7, -2, 2), "US$ " + nf(taUSD(c, i), 0) + " mm"], ["Liquidez", .05, clamp((m.cr - 1.3) / .5, -2, 2), X(m.cr)], ["Riesgo país", .3, COUNTRY[c.tk] != null ? COUNTRY[c.tk] : (c.country === "Colombia" ? -1.2 : 0), c.country || (c.tk === "V" ? "EE. UU." : "Colombia")]];
    const score = F.reduce((s, f) => s + f[1] * f[2], 0), n = clamp(11.5 - 5.3 * score, 1, 19), pn = NOTCH.map((x, k) => { const z = (k + 1 - n) / 1.3; return Math.exp(-z * z / 2); }), sum = pn.reduce((a, b) => a + b, 0);
    return { F: F.map(f => ({ l: f[0], v: f[3], c: 5.3 * f[1] * f[2] })), n, r: NOTCH[Math.round(n) - 1], p: pn.map(x => x / sum) };
}
function pdModel(c, i) { const m = M(c, i), z = altz(c, i).z, lc = Math.log(Math.max(m.cov || 1, 0.5)), sz = Math.log10(taUSD(c, i)) - 4, logit = 1.2 - 0.95 * z - 0.4 * lc - 0.6 * sz, pd = 1 / (1 + Math.exp(-logit)); return { pd, pd3: 1 - Math.pow(1 - pd, 3) * 0.97, z, lc, sz, F: [["Z'' de Altman", -0.95 * (z - 5)], ["Cobertura de intereses", -0.4 * (lc - Math.log(4))], ["Tamaño", -0.6 * sz]] }; }
const A = { M, altz, ratingModel, pdModel, dq };
const RT = [[8.5, "AAA"], [6.5, "AA"], [5.5, "A+"], [4.25, "A"], [3, "A−"], [2.5, "BBB"], [2.25, "BB+"], [2, "BB"], [1.75, "B+"], [1.5, "B"], [1.25, "B−"], [0.8, "CCC"], [-1e9, "CC"]];
const rating = icr => RT.find(t => icr >= t[0]);
export function runModel(c, s, datos) {
    const SECT = () => datos.sectores.map(x => ({ n: x.nombre, bu: x.beta_desapalancada.v, de: x.de.v }));
    function model(c, s) {
        const k = LY(c), m = A.M(c, k), n = c.years.length, t = s.t / 100, fish = x => c.cur === "COP" ? ((1 + x / 100) * (1 + s.piCOP / 100) / (1 + s.piUSD / 100) - 1) * 100 : x;
        const de = m.debt / m.eq, sect = SECT()[s.sector], bu = +s.bu, bl = bu * (1 + (1 - t) * de);
        const keU = s.rf + bl * s.erp + s.lam * s.crp + s.size, cov = m.cov == null ? 99 : m.cov, rt = rating(cov);
        const kdU = s.kdMode === "manual" ? +s.kd : s.kd, ke = fish(keU), kd = fish(kdU), wD = m.debt / (m.debt + m.eq), wE = 1 - wD;
        const waccBU = wE * ke + wD * kd * (1 - t);
        const br = s.betaReg === "" || s.betaReg == null ? null : +s.betaReg, keReg = br != null ? fish(s.rf + br * s.erp + s.lam * s.crp) : null, waccReg = br != null ? wE * keReg + wD * kd * (1 - t) : null;
        const sDE = sect.de, sBL = sect.bu * (1 + (1 - t) * sDE), sKe = fish(s.rf + sBL * s.erp + s.lam * s.crp), sW = sKe / (1 + sDE) + sDE / (1 + sDE) * kd * (1 - t);
        const wacc = s.waccMode === "reg" && waccReg != null ? waccReg : s.waccMode === "manual" ? +s.waccManual : waccBU, w = wacc / 100;
        const curve = [];
        for (let d = 0; d <= 2.0001; d += 0.05) {
            const b = bu * (1 + (1 - t) * d), kk = fish(s.rf + b * s.erp + s.lam * s.crp + s.size);
            curve.push([d, kk / (1 + d) + d / (1 + d) * kd * (1 - t)]);
        }
        // FCL histórico
        const H = c.years.map((y, i) => {
            const q = A.M(c, i), da = q.da != null && q.da > 0 ? q.da : 0, prev = i > 0 ? A.M(c, i - 1) : null, cx = c.aux && c.aux.capex && c.aux.capex[i] != null ? c.aux.capex[i] : (prev ? Math.max(0, q.ppe - prev.ppe + da) : null);
            const dk = prev ? q.ktno - prev.ktno : null, uodi = q.ebit * (1 - q.t);
            return { y, ebit: q.ebit, t: q.t, uodi, da, ktno: q.ktno, dk, capex: cx, fcl: prev && cx != null ? uodi + da - dk - cx : null, ar: q.ar, inv: q.inv, ap: q.ap };
        });
        // proyección
        const Pj = [];
        let rev = m.rev, ktPrev = m.ktno;
        for (let j = 0; j < 5; j++) {
            rev *= 1 + s.growth[j] / 100;
            const ebit = rev * s.margin / 100, uodi = ebit * (1 - t), da = rev * s.daPct / 100, kt = rev * s.ktnoPct / 100, dk = kt - ktPrev, cx = rev * s.capexPct / 100, fcl = uodi + da - dk - cx;
            ktPrev = kt;
            Pj.push({ y: c.years[k] + j + 1, g: s.growth[j] / 100, rev, ebit, tax: ebit * t, uodi, da, kt, dk, cx, fcl });
        }
        const val = (ww, gg) => { let pv = 0; Pj.forEach((p, j) => { pv += p.fcl / Math.pow(1 + ww, j + 1); }); const tv = Pj[4].fcl * (1 + gg) / (ww - gg); return { pv, tv, pvtv: tv / Math.pow(1 + ww, 5), ev: pv + tv / Math.pow(1 + ww, 5) }; };
        const g = s.g / 100, V = w > g ? val(w, g) : null, netDebt = m.debt - m.cash, eqv = V ? V.ev - netDebt : null, ps = eqv != null && s.shares ? eqv * c.um / s.shares : null;
        const SW = [-1, -0.5, 0, 0.5, 1], SG = [-0.5, 0, 0.5], sens = SW.map(dw => SG.map(dg => { const ww = w + dw / 100, gg = g + dg / 100; if (ww <= gg)
            return null; const v = val(ww, gg).ev - netDebt; return s.shares ? v * c.um / s.shares : v; }));
        // apalancamiento
        const fx_ = s.fixed / 100, cv = m.cogs + m.opex * (1 - fx_), cf = m.opex * fx_, mc = m.rev - cv, I = m.intr || 0, gao = m.ebit > 0 ? mc / m.ebit : null, gaf = m.ebit - I > 0 ? m.ebit / (m.ebit - I) : null, pe = cf / (mc / m.rev);
        const Fin = +s.finNeed, kdNew = (s.finRate == null || s.finRate === "" ? kd : +s.finRate) / 100, price = +(s.issuePrice || (s.price || (m.eq * c.um / s.shares))), nB = +s.shares, nA = nB + Fin * c.um / price, IB = I + Fin * kdNew;
        const ebitStar = (IB * nA - I * nB) / (nA - nB), upa = (e, i, nn) => { const u = e - i; return (u - Math.max(0, u) * t) * c.um / nn; };
        // EVA y riesgo
        const EV = c.years.map((y, i) => { const q = A.M(c, i); return { y, nopat: q.nopat, ic: q.ic, roic: q.roic, eva: q.nopat - w * q.ic }; });
        const az = A.altz(c, k), rm = A.ratingModel(c, k), pd = A.pdModel(c, k);
        return { k, m, t, de, bu, bl, keU, ke, kdU, kd, rt, cov, wD, wE, waccBU, keReg, waccReg, sW, sDE, sBL, sKe, sect, wacc, w, curve, H, Pj, V, netDebt, eqv, ps, g, sens, SW, SG,
            lev: { cv, cf, mc, I, gao, gaf, gat: gao && gaf ? gao * gaf : null, pe, ms: (m.rev - pe) / m.rev }, upa: { Fin, kdNew, price, nA, nB, IB, ebitStar, A: upa(m.ebit, I, nA), B: upa(m.ebit, IB, nB), f: upa }, EV, az, rm, pd };
    }
    return model(c, s);
}
export { parseWorkbook, buildCompany, FI, M, dq };
export function buildWorkbook(c, s, R, parsed, datos) {
    const st = { company: c, sup: s, R, parsed, fname: parsed.fname };
    const SECT = () => datos.sectores.map(x => ({ n: x.nombre }));
    const yrs = c.years, n = yrs.length, k = R.k, wb = new ExcelJS.Workbook(), C_ = i => XLSX.utils.encode_col(i);
    const NUM = "#,##0" + (c.dec ? ".0" : ""), PCT = "0.0%", PC2 = "0.00%";
    const add = (name, rows, widths) => {
        const ws = wb.addWorksheet(name);
        ws.views = [{ state: "frozen", ySplit: 4, xSplit: 1 }];
        widths?.forEach((v, i) => ws.getColumn(i + 1).width = v);
        rows.forEach((row, ri) => row?.forEach((value, ci) => {
            if (value == null || value === "")
                return;
            const cell = ws.getCell(ri + 1, ci + 1);
            if (typeof value === "object") {
                const v = typeof value.v === "number" && !isFinite(value.v) ? null : value.v;
                cell.value = value.f ? { formula: value.f.replace(/^=/, ""), result: v ?? 0 } : v;
                cell.numFmt = value.z || NUM;
            }
            else {
                cell.value = typeof value === "number" && !isFinite(value) ? null : value;
                cell.numFmt = typeof value === "number" ? NUM : "@";
            }
            let tone = ri === 0 || ri === 3 ? "encabezado" : name === "Supuestos" && ci === 1 || ["Balance", "PyG"].includes(name) && ci > 0 && ci <= n ? "insumo" : typeof value === "object" && value.f ? "clave" : "neutro";
            if (["Balance", "PyG"].includes(name) && ci > 2 * n + 2)
                tone = (value.v || 0) >= 0 ? "sube" : "baja";
            applyTone(cell, datos.estilo, tone);
            cell.alignment = { vertical: "top", wrapText: ci === 0 || ci > n };
        }));
    };
    const fv = (f, v, z) => ({ f, v, z: z || NUM });
    // Supuestos
    const SU = {}, sup = [["Mirage · Supuestos del diagnóstico"], [c.name + " · cifras en " + c.unit], [], ["Supuesto", "Valor", "Fuente"]];
    const putS = (key, l, v, z, src) => { sup.push([l, { v, z: z || NUM }, src || ""]); SU[key] = "Supuestos!$B$" + sup.length; };
    putS("rf", "Tasa libre de riesgo (Rf)", s.rf / 100, PC2, datos.parametros.rf_usd.fuente + " · " + datos.parametros.rf_usd.corte);
    putS("erp", "Prima de mercado (ERP)", s.erp / 100, PC2, datos.parametros.erp_maduro.fuente + " · " + datos.parametros.erp_maduro.corte);
    putS("crp", "Prima país (CRP)", s.crp / 100, PC2, datos.parametros.crp.fuente + " · " + datos.parametros.crp.corte + " · exposición: " + c.country);
    putS("lam", "Exposición país (λ)", s.lam, "0.00", "1 si opera en el país");
    putS("size", "Prima de tamaño", s.size / 100, PC2, "Sin prima en API; sólo supuesto explícito del usuario");
    putS("bu", "Beta desapalancada del sector (βu)", +s.bu, "0.000", SECT()[s.sector].n);
    putS("t", "Tasa de impuestos", s.t / 100, PC2, "Tasa efectiva " + yrs[k]);
    putS("spread", "Spread del rating sintético", 0, PC2, "No aplicado: se usa Kd observado de la API");
    putS("kdman", "Kd USD observado o ingresado", s.kdMode === "manual" ? s.kd / 100 : 0, PC2, s.kdFuente || "Supuesto del usuario");
    putS("beta", "Beta de regresión (si cotiza)", s.betaReg === "" ? 0 : +s.betaReg, "0.000", "Regresión contra el índice");
    putS("pic", "Inflación esperada COP", s.piCOP / 100, PC2, datos.parametros.inflacion_cop.fuente);
    putS("piu", "Inflación esperada USD", s.piUSD / 100, PC2, datos.parametros.inflacion_usd.fuente);
    putS("cop", 'Moneda en pesos (1 = sí)', c.cur === "COP" ? 1 : 0, "0", "Conversión por diferencial de inflación");
    putS("wmode", "WACC para valorar (1 sector, 2 regresión, 3 manual)", s.waccMode === "bu" ? 1 : s.waccMode === "reg" ? 2 : 3, "0", "Supuesto del usuario");
    putS("wman", "WACC manual", s.waccManual / 100, PC2, "Supuesto del usuario");
    s.growth.forEach((g, j) => putS("g" + j, "Crecimiento de ingresos " + (yrs[k] + j + 1), g / 100, PCT, "Supuesto del usuario"));
    putS("mg", "Margen EBIT proyectado", s.margin / 100, PCT, "Margen " + yrs[k]);
    putS("dap", "D&A / ingresos", s.daPct / 100, PC2, "Histórico " + yrs[k]);
    putS("cxp", "CAPEX / ingresos", s.capexPct / 100, PC2, c.aux && c.aux.capex ? "Del archivo" : "ΔPP&E + D&A");
    putS("ktp", "KTNO / ingresos", s.ktnoPct / 100, PC2, "Histórico " + yrs[k]);
    putS("gp", "Crecimiento perpetuo (g)", s.g / 100, PCT, "Supuesto del usuario");
    putS("sh", "Acciones en circulación", +s.shares, "#,##0", "Archivo o supuesto");
    putS("px", "Precio por acción", +s.price || 0, "#,##0.00", "Supuesto del usuario");
    putS("um", "Multiplicador de unidades", c.um, "#,##0", c.unit);
    putS("fix", "Gastos operativos fijos", s.fixed / 100, PCT, "Supuesto del usuario");
    putS("fin", "Financiación adicional", R.upa.Fin, NUM, "Escenario UPA");
    putS("kdn", "Tasa de la deuda nueva", R.upa.kdNew, PC2, "Escenario UPA");
    putS("ip", "Precio de emisión", R.upa.price, "#,##0.00", "Escenario UPA");
    add("Portada", [["Mirage · Diagnóstico financiero"], [c.name], ["Archivo de origen", st.fname], ["Cifras en", c.unit], ["Años", yrs[0] + "–" + yrs[n - 1]], ["Generado", new Date().toISOString().slice(0, 10)], [], ["Hoja", "Contenido"], ["Supuestos", "Cada supuesto con su fuente; cambiarlos recalcula todo el libro"], ["Balance", "Valores, análisis vertical y horizontal"], ["PyG", "Valores, análisis vertical y horizontal"], ["Indicadores", "Razones financieras por año"], ["WACC", "Beta, Ke, Kd, pesos y WACC"], ["FCL Histórico", "Flujo de caja libre por año"], ["FCL Proyectado", "Proyección, DCF y sensibilidad"], ["Apalancamiento", "Punto de equilibrio, GAO, GAF y GAT"], ["UPA", "Indiferencia entre deuda y acciones"], ["EVA", "Valor económico agregado"], ["Riesgo", "Altman Z'' y ratings"], ["Calidad y mapeo", "Cuentas del archivo y alertas"], [], [datos.meta.aviso]], [28, 70]);
    add("Supuestos", sup, [48, 16, 48]);
    // Estados
    const RF = { bal: {}, pyg: {} };
    const stmt = (stn, title, baseId) => {
        const rows = [[title], [c.name + " · " + c.unit], [], ["Cuenta"].concat(yrs, [""], yrs.map(y => "V " + y), [""], yrs.slice(1).map(y => "H " + y))];
        const list = c[stn].filter(r => r.t !== "hdr" && r.v);
        list.forEach((r, j) => { RF[stn][r.id] = 5 + j; });
        const br = RF[stn][baseId];
        list.forEach((r, j) => {
            const row = 5 + j, out = [r.l];
            r.v.forEach(v => out.push({ v, z: NUM }));
            out.push("");
            r.v.forEach((v, i) => { const cl = C_(1 + i); out.push(fv("IFERROR(" + cl + row + "/" + cl + "$" + br + ",0)", c[stn].find(x => x.id === baseId).v[i] ? v / c[stn].find(x => x.id === baseId).v[i] : 0, PCT)); });
            out.push("");
            r.v.slice(1).forEach((v, i) => { const a = C_(1 + i), b = C_(2 + i), p = r.v[i]; out.push(fv('IFERROR(' + b + row + "/" + a + row + '-1,"")', p ? v / p - 1 : "", PCT)); });
            rows.push(out);
        });
        add(stn === "bal" ? "Balance" : "PyG", rows, [46].concat(yrs.map(() => 14), [3], yrs.map(() => 10), [3], yrs.map(() => 10)));
    };
    stmt("bal", "Estado de situación financiera", "ta");
    stmt("pyg", "Estado de resultados", "rev");
    const B = (id, i) => RF.bal[id] ? "Balance!" + C_(1 + i) + RF.bal[id] : null, Pq = (id, i) => RF.pyg[id] ? "PyG!" + C_(1 + i) + RF.pyg[id] : null;
    const G0 = (ref) => ref || "0";
    const M_ = i => A.M(c, i);
    // Indicadores
    const ind = [["Indicadores financieros"], [c.name], [], ["Indicador"].concat(yrs)];
    const IR = [["Razón corriente", i => B("tca", i) + "/" + B("tcl", i), "cr", "0.00"], ["Pasivo / activo", i => B("tl", i) + "/" + B("ta", i), "la", PCT], ["Deuda financiera / patrimonio", i => B("debt", i) + "/" + B("eq", i), "de", "0.00"], ["Margen bruto", i => Pq("gp", i) + "/" + Pq("rev", i), "gm", PCT], ["Margen EBIT", i => Pq("ebit", i) + "/" + Pq("rev", i), "em", PCT], ["Margen neto", i => Pq("ni", i) + "/" + Pq("rev", i), "nm", PCT], ["ROA", i => Pq("ni", i) + "/" + B("ta", i), "roa", PCT], ["ROE", i => Pq("ni", i) + "/(" + B("eq", i) + (B("mi", i) ? "-" + B("mi", i) : "") + ")", "roe", PCT], ["Rotación del activo", i => Pq("rev", i) + "/" + B("ta", i), "at", "0.00"], ["Días de cartera", i => B("ar", i) ? B("ar", i) + "/" + Pq("rev", i) + "*365" : "0", "dso", "0"]];
    if (Pq("iexp", 0))
        IR.push(["EBIT / intereses", i => Pq("ebit", i) + "/ABS(" + Pq("iexp", i) + ")", "cov", "0.0"]);
    IR.forEach(([l, f, kk, z]) => ind.push([l].concat(yrs.map((y, i) => fv("IFERROR(" + f(i) + ",0)", M_(i)[kk], z)))));
    add("Indicadores", ind, [34].concat(yrs.map(() => 12)));
    // WACC
    const L_ = k, W = [["Costo de capital (WACC)"], [c.name + " · " + yrs[k]], [], ["Concepto", "Valor", "Fórmula"]], WR = {};
    const pw = (key, l, f, v, z, note) => { W.push([l, fv(f, v, z), note || ""]); WR[key] = "B" + W.length; };
    pw("D", "Deuda financiera", B("debt", L_), R.m.debt, NUM, "Balance");
    pw("E", "Patrimonio", B("eq", L_), R.m.eq, NUM, "Balance");
    pw("de", "D/E (libros)", WR.D + "/" + WR.E, R.de, "0.000", "");
    pw("bl", "Beta reapalancada (βL)", SU.bu + "*(1+(1-" + SU.t + ")*" + WR.de + ")", R.bl, "0.000", "Hamada");
    pw("keu", "Ke en USD", SU.rf + "+" + WR.bl + "*" + SU.erp + "+" + SU.lam + "*" + SU.crp + "+" + SU.size, R.keU / 100, PC2, "CAPM con prima país y tamaño");
    pw("kdu", "Kd en USD antes de impuestos", "IF(" + SU.kdman + ">0," + SU.kdman + "," + SU.rf + "+" + SU.lam + "*" + SU.crp + "+" + SU.spread + ")", R.kdU / 100, PC2, s.kdFuente || "Supuesto del usuario");
    pw("fx", "Factor de conversión de moneda", "IF(" + SU.cop + "=1,(1+" + SU.pic + ")/(1+" + SU.piu + "),1)", c.cur === "COP" ? (1 + s.piCOP / 100) / (1 + s.piUSD / 100) : 1, "0.0000", "Fisher");
    pw("ke", "Ke en " + c.cur, "(1+" + WR.keu + ")*" + WR.fx + "-1", R.ke / 100, PC2, "");
    pw("kd", "Kd en " + c.cur, "(1+" + WR.kdu + ")*" + WR.fx + "-1", R.kd / 100, PC2, "");
    pw("kdt", "Kd después de impuestos", WR.kd + "*(1-" + SU.t + ")", R.kd / 100 * (1 - R.t), PC2, "");
    pw("wd", "Peso de la deuda", WR.D + "/(" + WR.D + "+" + WR.E + ")", R.wD, PCT, "Valor en libros");
    pw("we", "Peso del patrimonio", "1-" + WR.wd, R.wE, PCT, "");
    pw("wbu", "WACC con beta del sector", WR.we + "*" + WR.ke + "+" + WR.wd + "*" + WR.kdt, R.waccBU / 100, PC2, "");
    pw("ker", "Ke con beta de regresión", "IF(" + SU.beta + ">0,(1+" + SU.rf + "+" + SU.beta + "*" + SU.erp + "+" + SU.lam + "*" + SU.crp + ")*" + WR.fx + "-1,0)", R.keReg != null ? R.keReg / 100 : 0, PC2, "");
    pw("wre", "WACC con beta de regresión", "IF(" + SU.beta + ">0," + WR.we + "*" + WR.ker + "+" + WR.wd + "*" + WR.kdt + ",0)", R.waccReg != null ? R.waccReg / 100 : 0, PC2, "");
    pw("w", "WACC usado para valorar", "CHOOSE(" + SU.wmode + "," + WR.wbu + "," + WR.wre + "," + SU.wman + ")", R.w, PC2, "Según el supuesto elegido");
    add("WACC", W, [38, 16, 40]);
    const WACC = "WACC!$" + WR.w.replace(/(\D+)(\d+)/, "$1$$$2");
    // FCL histórico
    const H = [["Flujo de caja libre histórico"], [c.name + " · " + c.unit], [], ["Concepto"].concat(yrs)], HR = {};
    const ph = (key, l, f, v, z) => { H.push([l].concat(yrs.map((y, i) => { const ff = f(i); return ff == null ? "" : fv(ff, v(i), z); }))); HR[key] = H.length; };
    const col = i => C_(1 + i);
    ph("ebit", "EBIT", i => Pq("ebit", i), i => R.H[i].ebit);
    ph("t", "Tasa efectiva", i => "IFERROR(" + Pq("tax", i) + "/" + Pq("ebt", i) + ",0)", i => R.H[i].t, PCT);
    ph("uodi", "UODI = EBIT × (1 − t)", i => col(i) + HR.ebit + "*(1-" + col(i) + HR.t + ")", i => R.H[i].uodi);
    ph("da", "(+) Depreciación y amortización", i => Pq("da", i) || (Pq("ebitda", i) ? Pq("ebitda", i) + "-" + Pq("ebit", i) : "0"), i => R.H[i].da);
    ph("ar", "Cuentas por cobrar", i => G0(B("ar", i)), i => R.H[i].ar);
    ph("inv", "Inventarios", i => G0(B("inv", i)), i => R.H[i].inv);
    ph("ap", "Proveedores", i => G0(B("ap", i)), i => R.H[i].ap);
    ph("kt", "KTNO", i => col(i) + HR.ar + "+" + col(i) + HR.inv + "-" + col(i) + HR.ap, i => R.H[i].ktno);
    ph("dk", "(−) Variación del KTNO", i => i ? col(i) + HR.kt + "-" + col(i - 1) + HR.kt : null, i => R.H[i].dk);
    const capexFile = c.aux && c.aux.capex;
    ph("cx", "(−) CAPEX", i => i || capexFile ? (capexFile && c.aux.capex[i] != null ? String(c.aux.capex[i]) : (i ? "MAX(0," + B("ppe", i) + "-" + B("ppe", i - 1) + "+" + col(i) + HR.da + ")" : null)) : null, i => R.H[i].capex);
    ph("fcl", "Flujo de caja libre", i => i ? col(i) + HR.uodi + "+" + col(i) + HR.da + "-" + col(i) + HR.dk + "-" + col(i) + HR.cx : null, i => R.H[i].fcl);
    add("FCL Histórico", H, [38].concat(yrs.map(() => 14)));
    // FCL proyectado
    const pc = j => C_(2 + j), P_ = [["Flujo de caja libre proyectado y valoración"], [c.name + " · " + c.unit], [], ["Concepto", yrs[k] + " real"].concat(R.Pj.map(p => p.y + "e"))], PR = {};
    const pp = (key, l, base, f, v, z) => { P_.push([l, base == null ? "" : base].concat(R.Pj.map((p, j) => fv(f(j), v(p, j), z)))); PR[key] = P_.length; };
    pp("g", "Crecimiento de ingresos", null, j => SU["g" + j], p => p.g, PCT);
    P_.push(["Ingresos", fv(Pq("rev", k), R.m.rev)].concat(R.Pj.map((p, j) => fv((j ? pc(j - 1) : "B") + (P_.length + 1) + "*(1+" + pc(j) + PR.g + ")", p.rev))));
    PR.rev = P_.length;
    pp("ebit", "EBIT = ingresos × margen", fv(Pq("ebit", k), R.m.ebit), j => pc(j) + PR.rev + "*" + SU.mg, p => p.ebit);
    pp("tax", "(−) Impuesto", null, j => pc(j) + PR.ebit + "*" + SU.t, p => p.tax);
    pp("uodi", "UODI", fv("'FCL Histórico'!" + col(k) + HR.uodi, R.H[k].uodi), j => pc(j) + PR.ebit + "-" + pc(j) + PR.tax, p => p.uodi);
    pp("da", "(+) D&A", fv("'FCL Histórico'!" + col(k) + HR.da, R.H[k].da), j => pc(j) + PR.rev + "*" + SU.dap, p => p.da);
    pp("kt", "KTNO", fv("'FCL Histórico'!" + col(k) + HR.kt, R.m.ktno), j => pc(j) + PR.rev + "*" + SU.ktp, p => p.kt);
    pp("dk", "(−) Variación del KTNO", null, j => pc(j) + PR.kt + "-" + (j ? pc(j - 1) : "B") + PR.kt, p => p.dk);
    pp("cx", "(−) CAPEX", null, j => pc(j) + PR.rev + "*" + SU.cxp, p => p.cx);
    pp("fcl", "Flujo de caja libre", null, j => pc(j) + PR.uodi + "+" + pc(j) + PR.da + "-" + pc(j) + PR.dk + "-" + pc(j) + PR.cx, p => p.fcl);
    pp("fd", "Factor de descuento", null, j => "1/(1+" + WACC + ")^" + (j + 1), (p, j) => 1 / Math.pow(1 + R.w, j + 1), "0.0000");
    pp("vp", "Valor presente del FCL", null, j => pc(j) + PR.fcl + "*" + pc(j) + PR.fd, (p, j) => p.fcl / Math.pow(1 + R.w, j + 1));
    const FR = pc(0) + PR.fcl + ":" + pc(4) + PR.fcl, f5 = pc(4) + PR.fcl;
    P_.push([]);
    const pv = (l, f, v, z) => { P_.push([l, fv(f, v, z)]); return "B" + P_.length; };
    const rW = pv("WACC", WACC, R.w, PC2), rG = pv("Crecimiento perpetuo (g)", SU.gp, R.g, PCT), rSum = pv("Suma VP de los FCL", "SUM(" + pc(0) + PR.vp + ":" + pc(4) + PR.vp + ")", R.V ? R.V.pv : 0), rTV = pv("Valor terminal (Gordon)", f5 + "*(1+" + rG + ")/(" + rW + "-" + rG + ")", R.V ? R.V.tv : 0), rPTV = pv("VP del valor terminal", rTV + "/(1+" + rW + ")^5", R.V ? R.V.pvtv : 0), rEV = pv("Valor de la empresa (EV)", rSum + "+" + rPTV, R.V ? R.V.ev : 0), rND = pv("(−) Deuda neta", B("debt", k) + "-" + B("cash", k), R.netDebt), rEQ = pv("Valor del patrimonio", rEV + "-" + rND, R.eqv || 0), rPS = pv("Valor por acción", "IFERROR(" + rEQ + "*" + SU.um + "/" + SU.sh + ",0)", R.ps || 0, "#,##0.00");
    pv("Precio de mercado", SU.px, +s.price || 0, "#,##0.00");
    pv("Potencial frente al precio", "IFERROR(" + rPS + "/" + SU.px + "-1,0)", s.price && R.ps ? R.ps / s.price - 1 : 0, PCT);
    P_.push([]);
    P_.push(["Sensibilidad del valor por acción · WACC \\ g"].concat(R.SG.map(dg => ({ v: R.g + dg / 100, z: PCT }))));
    const sr = P_.length;
    R.SW.forEach((dw, i) => { const r_ = P_.length + 1; P_.push([{ f: rW + "+(" + dw / 100 + ")", v: R.w + dw / 100, z: PC2 }].concat(R.SG.map((dg, j) => { const cc = C_(1 + j); return fv("IFERROR((NPV($A" + r_ + "," + FR + ")+" + f5 + "*(1+" + cc + "$" + sr + ")/($A" + r_ + "-" + cc + "$" + sr + ")/(1+$A" + r_ + ")^5-" + rND + ")*" + SU.um + "/" + SU.sh + ",0)", R.sens[i][j] || 0, "#,##0.00"); }))); });
    add("FCL Proyectado", P_, [40, 16].concat(R.Pj.map(() => 14)));
    // Apalancamiento
    const AP = [["Apalancamiento operativo, financiero y total"], [c.name + " · " + yrs[k]], [], ["Concepto", "Valor"]], AR = {};
    const pa = (key, l, f, v, z) => { AP.push([l, fv(f, v, z)]); AR[key] = "B" + AP.length; };
    pa("v", "Ventas", Pq("rev", k), R.m.rev);
    pa("cogs", "Costo de ventas (variable)", Pq("rev", k) + "-" + Pq("gp", k), R.m.cogs);
    pa("opx", "Gastos operativos", Pq("gp", k) + "-" + Pq("ebit", k), R.m.opex);
    pa("cv", "Costos variables", AR.cogs + "+" + AR.opx + "*(1-" + SU.fix + ")", R.lev.cv);
    pa("cf", "Costos fijos", AR.opx + "*" + SU.fix, R.lev.cf);
    pa("mc", "Margen de contribución", AR.v + "-" + AR.cv, R.lev.mc);
    pa("pmc", "% margen de contribución", AR.mc + "/" + AR.v, R.lev.mc / R.m.rev, PCT);
    pa("ebit", "EBIT", AR.mc + "-" + AR.cf, R.m.ebit);
    pa("pe", "Punto de equilibrio en ingresos", AR.cf + "/" + AR.pmc, R.lev.pe);
    pa("ms", "Margen de seguridad", "(" + AR.v + "-" + AR.pe + ")/" + AR.v, R.lev.ms, PCT);
    pa("gao", "GAO = MC / EBIT", AR.mc + "/" + AR.ebit, R.lev.gao || 0, "0.000");
    pa("i", "Gasto por intereses", Pq("iexp", k) ? "ABS(" + Pq("iexp", k) + ")" : "0", R.lev.I);
    pa("uai", "UAI = EBIT − intereses", AR.ebit + "-" + AR.i, R.m.ebit - R.lev.I);
    pa("gaf", "GAF = EBIT / UAI", AR.ebit + "/" + AR.uai, R.lev.gaf || 0, "0.000");
    pa("gat", "GAT = GAO × GAF", AR.gao + "*" + AR.gaf, R.lev.gat || 0, "0.000");
    AP.push([]);
    AP.push(["Comprobación: ventas × 2", "Base", "Ventas × 2"]);
    const b0 = AP.length + 1;
    AP.push(["Ventas", fv(AR.v, R.m.rev), fv(AR.v + "*2", R.m.rev * 2)]);
    AP.push(["Costos variables", fv(AR.cv, R.lev.cv), fv(AR.cv + "*2", R.lev.cv * 2)]);
    AP.push(["Costos fijos", fv(AR.cf, R.lev.cf), fv(AR.cf, R.lev.cf)]);
    AP.push(["EBIT", fv("B" + b0 + "-B" + (b0 + 1) + "-B" + (b0 + 2), R.m.ebit), fv("C" + b0 + "-C" + (b0 + 1) + "-C" + (b0 + 2), R.m.rev * 2 - R.lev.cv * 2 - R.lev.cf)]);
    AP.push(["GAO verificado = %ΔEBIT / %ΔVentas", fv("(C" + (b0 + 3) + "/B" + (b0 + 3) + "-1)/(C" + b0 + "/B" + b0 + "-1)", R.lev.gao || 0, "0.000")]);
    add("Apalancamiento", AP, [40, 16, 16]);
    // UPA
    const u = R.upa, UP = [["UPA: deuda o emisión de acciones"], [c.name], [], ["Concepto", "Valor"]], UR = {};
    const pu = (key, l, f, v, z) => { UP.push([l, fv(f, v, z)]); UR[key] = "B" + UP.length; };
    pu("F", "Financiación adicional", SU.fin, u.Fin);
    pu("kd", "Tasa de la deuda nueva", SU.kdn, u.kdNew, PC2);
    pu("px", "Precio de emisión", SU.ip, u.price, "#,##0.00");
    pu("nB", "Acciones actuales (opción deuda)", SU.sh, u.nB, "#,##0");
    pu("I", "Intereses actuales", "Apalancamiento!" + AR.i, u.IB - u.Fin * u.kdNew);
    pu("t", "Tasa de impuestos", SU.t, R.t, PC2);
    pu("IB", "Intereses con deuda nueva", UR.I + "+" + UR.F + "*" + UR.kd, u.IB);
    pu("nA", "Acciones con emisión (opción acciones)", UR.nB + "+" + UR.F + "*" + SU.um + "/" + UR.px, u.nA, "#,##0");
    pu("es", "EBIT de indiferencia", "(" + UR.IB + "*" + UR.nA + "-" + UR.I + "*" + UR.nB + ")/(" + UR.nA + "-" + UR.nB + ")", u.ebitStar);
    UP.push([]);
    UP.push(["EBIT", "UPA con acciones", "UPA con deuda"]);
    [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6].forEach(fr => { const e = R.m.ebit * fr, r_ = UP.length + 1; UP.push([{ v: e, z: NUM }, fv("(A" + r_ + "-" + UR.I + "-MAX(0,A" + r_ + "-" + UR.I + ")*" + UR.t + ")*" + SU.um + "/" + UR.nA, u.f(e, u.IB - u.Fin * u.kdNew, u.nA), "#,##0.00"), fv("(A" + r_ + "-" + UR.IB + "-MAX(0,A" + r_ + "-" + UR.IB + ")*" + UR.t + ")*" + SU.um + "/" + UR.nB, u.f(e, u.IB, u.nB), "#,##0.00")]); });
    add("UPA", UP, [38, 18, 18]);
    // EVA
    const EVs = [["Valor económico agregado (EVA)"], [c.name + " · " + c.unit], [], ["Concepto"].concat(yrs)], ER = {};
    const pe = (key, l, f, v, z) => { EVs.push([l].concat(yrs.map((y, i) => fv(f(i), v(i), z)))); ER[key] = EVs.length; };
    pe("nopat", "NOPAT (UODI)", i => "'FCL Histórico'!" + col(i) + HR.uodi, i => R.EV[i].nopat);
    pe("ic", "Capital invertido = deuda + patrimonio − caja", i => B("debt", i) + "+" + B("eq", i) + "-" + B("cash", i), i => R.EV[i].ic);
    pe("roic", "ROIC", i => col(i) + ER.nopat + "/" + col(i) + ER.ic, i => R.EV[i].roic, PCT);
    pe("w", "WACC", () => WACC, () => R.w, PC2);
    pe("sp", "Spread ROIC − WACC", i => col(i) + ER.roic + "-" + col(i) + ER.w, i => R.EV[i].roic - R.w, PCT);
    pe("eva", "EVA", i => col(i) + ER.nopat + "-" + col(i) + ER.w + "*" + col(i) + ER.ic, i => R.EV[i].eva);
    add("EVA", EVs, [42].concat(yrs.map(() => 14)));
    // Riesgo
    const RK = [["Riesgo crediticio"], [c.name], [], ["Concepto"].concat(yrs)];
    const az = yrs.map((y, i) => A.altz(c, i));
    RK.push(["X1 = (AC − PC) / AT"].concat(yrs.map((y, i) => fv("(" + B("tca", i) + "-" + B("tcl", i) + ")/" + B("ta", i), az[i].x1, "0.000"))));
    RK.push(["X2 = utilidades retenidas / AT"].concat(yrs.map((y, i) => fv(B("re", i) ? B("re", i) + "/" + B("ta", i) : "0", az[i].x2, "0.000"))));
    RK.push(["X3 = EBIT / AT"].concat(yrs.map((y, i) => fv(Pq("ebit", i) + "/" + B("ta", i), az[i].x3, "0.000"))));
    RK.push(["X4 = patrimonio / pasivo"].concat(yrs.map((y, i) => fv(B("eq", i) + "/" + B("tl", i), az[i].x4, "0.000"))));
    RK.push(["Z'' = 3,25 + 6,56·X1 + 3,26·X2 + 6,72·X3 + 1,05·X4"].concat(yrs.map((y, i) => { const cl = col(i); return fv("3.25+6.56*" + cl + "5+3.26*" + cl + "6+6.72*" + cl + "7+1.05*" + cl + "8", az[i].z, "0.00"); })));
    RK.push(["Rating equivalente (Altman)"].concat(az.map(a => a.r)));
    RK.push([]);
    RK.push(["Rating sintético por cobertura", R.rt[1]]);
    RK.push(["Rating estimado modelo Mirage", R.rm.r]);
    RK.push(["Probabilidad de incumplimiento a 1 año", { v: R.pd.pd, z: PC2 }]);
    add("Riesgo", RK, [48].concat(yrs.map(() => 12)));
    // Calidad y mapeo
    const QM = [["Calidad de datos y mapeo de cuentas"], [st.fname], [], ["Cuenta en el archivo", "Estado", "Campo Mirage", "Confianza"]];
    st.parsed.rows.filter(r => !r.hdr).forEach(r => QM.push([r.label, r.st === "bal" ? "Balance" : "Resultados", r.field ? FI[r.field].l : "(sin asignar)", r.field ? { v: r.conf, z: "0%" } : ""]));
    QM.push([]);
    QM.push(["Control", "Resultado"]);
    A.dq(c).list.forEach(d => QM.push([d.title, d.msg]));
    QM.push([], ["Fuentes API", datos.meta.corte, datos.meta.version]);
    datos.meta.fuentes.forEach(f => QM.push([f.nombre, f.url, f.licencia]));
    datos.metodo.pasos.forEach(p => QM.push(["Método", p]));
    add("Calidad y mapeo", QM, [52, 14, 36, 12]);
    wb.title = `Mirage DX · ${c.name}`;
    wb.creator = "Mirage · HyperTarget";
    wb.calcProperties.fullCalcOnLoad = true;
    wb.eachSheet(ws => {
        ws.getCell("A1").value = `${ws.getCell("A1").value} · ${c.name}`;
        ws.headerFooter.oddHeader = `&L${c.name.replace(/&/g, "&&")}&R${ws.name}`;
    });
    return wb;
}
