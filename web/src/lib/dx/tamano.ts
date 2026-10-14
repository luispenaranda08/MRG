// Tamaño de empresa con la misma regla que usa Mirage para las tablas sectoriales
// (ml/mirage/wacc/betas_colombia.py): Ley 905 de 2004, art. 2, por activos totales en SMMLV.
// Micro ≤ 500, pequeña 501–5.000, mediana 5.001–30.000, grande > 30.000.

// Salario mínimo mensual legal vigente por año (pesos). Mantener igual que SMMLV en betas_colombia.py.
export const SMMLV: Record<number, number> = {
    2016: 689_455, 2017: 737_717, 2018: 781_242, 2019: 828_116, 2020: 877_803, 2021: 908_526,
    2022: 1_000_000, 2023: 1_160_000, 2024: 1_300_000, 2025: 1_423_500,
};

export type Tamano = "Micro" | "Pequeña" | "Mediana" | "Grande";

/** Tamaño por activos en pesos colombianos del año de los estados. Años sin SMMLV en la tabla usan el
 *  más cercano disponible. Devuelve null si los activos no son positivos. */
export function tamanoPorActivos(activosCOP: number, anio: number): Tamano | null {
    if (!(activosCOP > 0)) return null;
    const anios = Object.keys(SMMLV).map(Number);
    const a = SMMLV[anio] ? anio : anios.reduce((x, y) => Math.abs(y - anio) < Math.abs(x - anio) ? y : x);
    const s = activosCOP / SMMLV[a];
    return s <= 500 ? "Micro" : s <= 5_000 ? "Pequeña" : s <= 30_000 ? "Mediana" : "Grande";
}
