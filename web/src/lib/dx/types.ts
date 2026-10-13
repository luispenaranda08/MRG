export interface MappedRow {
    label: string;
    st: string;
    hdr?: number;
    field?: string | null;
    conf: number;
    v: (number | null)[];
    sheet: string;
    /** Veredicto de presentación (JEV): la fila no se muestra en los estados del informe. */
    oculta?: boolean;
    motivo?: string;
}
export interface Parsed {
    years: number[];
    rows: MappedRow[];
    aux: Record<string, (number | null)[] | string>;
    unit: string;
    cur: string;
    name: string;
    fname: string;
    sheets: string[];
    bs: string;
    ps: string;
    revision?: Revision;
    textos?: string[];
}
export interface Revision { formato: string; veredicto: string; alertas: string[]; cambios: number }
