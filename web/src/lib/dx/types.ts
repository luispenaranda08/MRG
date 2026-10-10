export interface MappedRow {
    label: string;
    st: string;
    hdr?: number;
    field?: string | null;
    conf: number;
    v: (number | null)[];
    sheet: string;
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
}
