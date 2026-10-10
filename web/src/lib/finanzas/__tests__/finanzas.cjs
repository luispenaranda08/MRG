/* eslint-disable @typescript-eslint/no-require-imports -- Runner CommonJS local para transpilar TypeScript sin instalar nada. */
// Ejecutar: node src/lib/finanzas/__tests__/finanzas.cjs
// Casos de control: valores en caché de las hojas del profesor Félix Gutiérrez ("Sistemas de Amortización",
// "Calculadora Financiera v9") y ejercicios resueltos de Ehrhardt y Brigham, cap. 10 (10-5, 10-6, 10-8).
const assert = require("node:assert/strict"), fs = require("node:fs"), ts = require("typescript");
require.extensions[".ts"] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, f);
const F = require("../index.ts");

let pruebas = 0;
const cerca = (a, b, tol, msg) => { pruebas++; assert.ok(a != null && Math.abs(a - b) <= tol, `${msg}: ${a} ≠ ${b} (tol ${tol})`); };
const igual = (a, b, msg) => { pruebas++; assert.equal(a, b, msg); };

// ---------- Tasas (ICNV y TPERIODOS) ----------
cerca(F.efectivaAnual(0.14, "NAMV"), 0.14934202920715767, 1e-12, "Simulador: 14 % NAMV → EA");
cerca(F.convertir(0.149342029207, "EA", "NAMV"), 0.14, 1e-9, "EA → NAMV (C14 del simulador)");
cerca(F.convertir(0.14, "NAMV", "EM"), 0.14 / 12, 1e-12, "NAMV → EM");
cerca(F.icnv({ nominal: 0.14, m: 12 }).efectiva, 0.14934202920715767, 1e-12, "ICNV nominal → efectiva");
cerca(F.icnv({ efectiva: 0.12, m: 4 }).nominal, (Math.pow(1.12, 0.25) - 1) * 4, 1e-12, "ICNV efectiva → nominal");
cerca(F.convertir(0.12, "NATA", "EA"), Math.pow(1 / (1 - 0.03), 4) - 1, 1e-12, "12 % NATA → EA");
cerca(F.convertir(F.convertir(0.2, "EA", "NAMA"), "NAMA", "EA"), 0.2, 1e-12, "ida y vuelta NAMA");
cerca(F.convertir(0.0925, "EA", "ED"), Math.pow(1.0925, 1 / 365) - 1, 1e-15, "Nu 9,25 % EA → diaria");
igual(F.equivalencias(0.12, "EA").tabla.length, 8, "tabla de equivalencias con 8 frecuencias");
cerca(F.real(0.1432, 0.0561), 1.1432 / 1.0561 - 1, 1e-15, "Fisher");
assert.throws(() => F.tipoTasa("XYZ"), /desconocido/); pruebas++;

// ---------- Valor del dinero (hoja TVM) ----------
cerca(F.pago(0.1, 4, -1000), 315.47080370609083, 1e-9, "PAGO(10 %, 4, −1000)");
cerca(F.va(0.01, 12, -100, 0, true), 1136.7628, 1e-4, "VA anticipada");
cerca(F.vf(0.01, 12, -100), 1268.2503, 1e-4, "VF vencida");
cerca(F.tasa(4, -315.47080370609083, 1000), 0.1, 1e-10, "TASA");
cerca(F.nper(0.1, -315.47080370609083, 1000), 4, 1e-9, "NPER");
cerca(F.pago(0.011666666666655168, 240, -100_000_000), 1_243_520.8110342363, 1e-6, "Simulador: cuota 100 M, 240 cuotas");
let r = F.resolver({ P: 80_000_000 * 0.9, F: 0, A: null, n: 72, i: 0.014 });
cerca(r.valor, F.pago(0.014, 72, 72_000_000), 1e-9, "Problema 1 (carro): incógnita A");
igual(r.incognita, "A", "incógnita marcada");
r = F.resolver({ P: -1_000_000, A: 0, n: 12, i: null, F: 1_120_000 });
cerca(r.valor, Math.pow(1.12, 1 / 12) - 1, 1e-12, "incógnita i");
assert.throws(() => F.resolver({ P: 1, F: null, A: null, n: 1, i: 0.1 }), /exactamente una/); pruebas++;
igual(F.nCuotas({ inicial: 0, final: 5, cuotas: null }).cuotas, 6, "nCuotas (Bases H39:H41)");
igual(F.nCuotas({ inicial: null, final: 24, cuotas: 12 }).inicial, 13, "nCuotas periodo inicial");

// ---------- Sistemas de amortización (valores en caché de la hoja del profesor) ----------
const base = { principal: 1000, cuotas: 4, tasaPeriodica: 0.1, periodosPorAnio: 1 };
const s1 = F.amortizar({ ...base, sistema: "cuota_fija" });
cerca(s1.cuotaInicial, 315.4708, 1e-4, "SISTEMA1 cuota");
[784.5292, 547.5113, 286.7916, 0].forEach((v, k) => cerca(s1.filas[k + 1].saldoFinal, v, 1e-4, `SISTEMA1 saldo ${k + 1}`));
[215.4708, 237.0179, 260.7197, 286.7916].forEach((v, k) => cerca(s1.filas[k + 1].abonoCapital, v, 1e-4, `SISTEMA1 abono ${k + 1}`));
cerca(s1.costoEA, 0.1, 1e-10, "costo EA = 10 %");
const s2 = F.amortizar({ ...base, sistema: "abono_constante" });
[350, 325, 300, 275].forEach((v, k) => cerca(s2.filas[k + 1].egreso, v, 1e-9, `SISTEMA2 egreso ${k + 1}`));
const s3 = F.amortizar({ ...base, sistema: "bono_cupon" });
[100, 100, 100, 1100].forEach((v, k) => cerca(s3.filas[k + 1].egreso, v, 1e-9, `SISTEMA3 egreso ${k + 1}`));
const s4 = F.amortizar({ ...base, sistema: "cero_cupon" });
[1100, 1210, 1331].forEach((v, k) => cerca(s4.filas[k + 1].saldoFinal, v, 1e-9, `SISTEMA4 saldo ${k + 1}`));
cerca(s4.filas[4].egreso, 1464.1, 1e-9, "SISTEMA4 pago final");
cerca(s4.totalIntereses, 464.1, 1e-9, "SISTEMA4 intereses");
F.compararSistemas(base).forEach(c => { igual(c.controles.saldoFinalCero, true, `${c.sistema} salda`); cerca(c.costoEA, 0.1, 1e-9, `${c.sistema} cuesta 10 %`); });
const sim = F.amortizar({ principal: 100_000_000, cuotas: 240, tasaPeriodica: 0.011666666666655168, sistema: "cuota_fija", periodosPorAnio: 12, desembolso: "2025-09-10" });
cerca(sim.cuotaInicial, 1_243_520.8110342363, 1e-6, "Simulador cuota");
igual(sim.filas[240].fecha, "2045-09-10", "Simulador: fecha última cuota (C20)");
cerca(sim.costoEA, 0.149342029207, 1e-9, "Simulador: costo EA");
const g = F.amortizar({ ...base, sistema: "cuota_fija", gracia: 1 });
cerca(g.filas[1].egreso, 100, 1e-9, "gracia: solo intereses");
cerca(g.filas[2].egreso, F.pago(0.1, 3, -1000), 1e-9, "gracia: cuota sobre 3 periodos");
const variable = F.amortizar({ principal: 1000, cuotas: 4, tasaPeriodica: [0.1, 0.12, 0.12, 0.12], sistema: "cuota_fija", periodosPorAnio: 1 });
igual(variable.controles.saldoFinalCero, true, "IBR: la última cuota recoge el saldo");
const recal = F.amortizar({ principal: 1000, cuotas: 4, tasaPeriodica: [0.1, 0.12, 0.12, 0.12], sistema: "cuota_fija", periodosPorAnio: 1, tasaVariable: "recalcular" });
cerca(recal.filas[3].egreso, recal.filas[4].egreso, 1e-9, "IBR recalculada: cuota constante después del cambio");
const uvr = F.amortizar({ principal: 1000, cuotas: 4, tasaPeriodica: 0.06, sistema: "cuota_fija", periodosPorAnio: 1, indexacion: { unidad: "UVR", valorInicial: 400, variacionAnual: 0.05 } });
cerca(uvr.costoEAPesos, 1.06 * 1.05 - 1, 1e-9, "UVR: costo en pesos = real + inflación (Fisher)");

// ---------- Proyectos (Brigham cap. 10, resueltos en el curso) ----------
const S = [-10000, 3000, 3000, 3000, 3000, 3000], L = [-25000, 7400, 7400, 7400, 7400, 7400];
const iS = F.indicadores(S, 0.12), iL = F.indicadores(L, 0.12);
cerca(iS.vpn, 814.33, 0.005, "10-5 VPN S"); cerca(iL.vpn, 1675.34, 0.005, "10-5 VPN L");
cerca(iS.tir, 0.1524, 5e-5, "10-5 TIR S"); cerca(iL.tir, 0.1467, 5e-5, "10-5 TIR L");
cerca(iS.tirm, 0.1377, 5e-5, "10-5 TIRM S"); cerca(iL.tirm, 0.1346, 5e-5, "10-5 TIRM L");
cerca(iS.indiceRentabilidad, 1.0814, 5e-5, "10-5 IR S"); cerca(iL.indiceRentabilidad, 1.0670, 5e-5, "10-5 IR L");
cerca(F.tasaCruce(S, L), 0.1429, 5e-5, "10-5 tasa de cruce");
cerca(iS.saldoFinal, -iS.vpn * Math.pow(1.12, 5), 1e-9, "identidad LastBalance");
cerca(iS.recuperacion, 3 + 1000 / 3000, 1e-12, "recuperación simple S");
const X = [-1000, 100, 300, 400, 700], Y = [-1000, 1000, 100, 50, 50];
cerca(F.indicadores(X, 0.12).tirm, 0.1359, 5e-5, "10-6 TIRM X"); cerca(F.indicadores(Y, 0.12).tirm, 0.1310, 5e-5, "10-6 TIRM Y");
cerca(F.indicadores(X, 0.12).vpn, 58.02, 0.005, "10-6 VPN X"); cerca(F.indicadores(Y, 0.12).vpn, 39.94, 0.005, "10-6 VPN Y");
cerca(F.tasaCruce(X, Y), 0.1309, 5e-5, "10-6 tasa de cruce");
const A = [-300, -387, -193, -100, 600, 600, 850, -180], B = [-405, 134, 134, 134, 134, 134, 134, 0];
cerca(F.tir(A), 0.1810, 5e-5, "10-8 TIR A"); cerca(F.tir(B), 0.2397, 5e-5, "10-8 TIR B");
igual(F.indicadores(A, 0.1).tirMultiple, true, "10-8 A: flujos no convencionales");
cerca(F.tasaCruce(A, B), 0.1453, 5e-5, "10-8 tasa de cruce");
cerca(F.vae(1000, 0.1, 5), 1000 * 0.1 / (1 - Math.pow(1.1, -5)), 1e-12, "VAE");

// ---------- Modelo de FCL ----------
const p = F.modeloProyecto({
    horizonte: 5, ventas: 1_000_000_000, crecimiento: 0.05, costoVentas: 0.55, gastosAdmonVentas: 0.15,
    activos: [{ nombre: "Maquinaria y Equipos", valor: 520_000_000, vidaUtil: 10 }, { nombre: "Muebles y Enseres", valor: 80_000_000, vidaUtil: 10 },
        { nombre: "Vehículos", valor: 110_000_000, vidaUtil: 5 }, { nombre: "Equipos de Cómputo", valor: 45_000_000, vidaUtil: 5 }],
    diferidos: { valor: 30_000_000, anios: 5 }, ktnoSobreVentas: 0.1, tasaImpuesto: 0.35,
    deuda: [{ nombre: "Banco 1", proporcion: 0.2, tasaEA: 0.1001 / 0.65, plazo: 5, sistema: "cuota_fija" },
        { nombre: "Banco 2", proporcion: 0.25, tasaEA: 0.1009 / 0.65, plazo: 5, sistema: "abono_constante" }],
    tmrr: 0.25,
});
cerca(p.anios[1].depreciacion, 91_000_000, 1e-6, "FCL: depreciación anual de la plantilla (X7)");
cerca(p.costoCapital, 0.2 * 0.1001 + 0.25 * 0.1009 + 0.55 * 0.25, 1e-12, "FCL: CK de la plantilla (S6 = 18,28 %)");
igual(p.controles.deudaPagada, true, "FCL: la deuda se paga en el horizonte");
const fp = p.anios.map(a => a.fclProyecto), fi = p.anios.map(a => a.fclInversionista);
cerca(fi[0], fp[0] * 0.55, 1e-6, "FCL inversionista año 0 = aporte de patrimonio");
cerca(p.evaluaciones.proyectoConFinanciacion.vpn, F.vpn(p.costoCapital, fp), 1e-6, "FCL: VPN(CK)");
const ktnoTotal = p.anios.reduce((s, a) => s + a.inversionKTNO, 0);
cerca(ktnoTotal + p.anios[0].ktno, 0, 1e-6, "FCL: el KTNO se recupera completo");
// Coherencia: el FCL del proyecto = FCL del inversionista + servicio de la deuda neto de escudo
p.anios.forEach(a => cerca(a.fclProyecto, a.fclInversionista + a.intereses + a.abonoCapital - a.escudoFiscal - a.desembolsoDeuda, 1e-6, `FCL: puente año ${a.anio}`));

console.log(`OK: ${pruebas} comprobaciones de la calculadora financiera (tasas, TVM, amortización, proyectos, FCL).`);
