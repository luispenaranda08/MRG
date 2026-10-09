window.HyperTargetSources = [
  {
    "id": "FT01",
    "product": "FinTarget",
    "name": "Damodaran",
    "url": "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datacurrent.html",
    "status": "Fuente verificada",
    "frequency": "Por dataset; guardar corte",
    "input": "Betas, ERP, CRP, spreads sintéticos",
    "limit": "Mapeo CIIU propio; comprobar términos de cada fichero. No es calibración colombiana."
  },
  {
    "id": "FT02",
    "product": "FinTarget",
    "name": "BanRep · TES",
    "url": "https://www.banrep.gov.co/en/node/50444",
    "status": "Fuente verificada",
    "frequency": "Serie de mercado; confirmar calendario en ingestión",
    "input": "Curvas cero cupón COP / UVR 1, 5, 10 años",
    "limit": "Breakeven contiene primas de liquidez e inflación; spread TES–Treasury no es CRP pura."
  },
  {
    "id": "FT03",
    "product": "FinTarget",
    "name": "FRED · DGS10 / T10YIE",
    "url": "https://fred.stlouisfed.org/series/DGS10",
    "status": "Fuente verificada",
    "frequency": "Diaria, días hábiles",
    "input": "Treasury e inflación implícita USD a 10 años",
    "limit": "DGS10 es constant maturity; alinear plazo y fecha. T10YIE es breakeven, no expectativa pura.",
    "extra": "https://fred.stlouisfed.org/series/T10YIE"
  },
  {
    "id": "FT04",
    "product": "FinTarget",
    "name": "Supersociedades · NIIF",
    "url": "https://www.datos.gov.co/Econom-a-y-Finanzas/Estados-Financieros-NIIF-Estado-de-Situaci-n-Finan/pfdp-zks5",
    "status": "Esquema pendiente",
    "frequency": "Anual; comprobar cobertura",
    "input": "Balances, deuda financiera y patrimonio por empresa/CIIU",
    "limit": "Página localizada; API de muestra no accesible en esta revisión. No confundir pasivo total con deuda ni D/E contable con D/E de mercado; resultados requieren otro dataset."
  },
  {
    "id": "FT05",
    "product": "FinTarget",
    "name": "SEC · EDGAR",
    "url": "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    "status": "Fuente verificada",
    "frequency": "Al publicarse el filing",
    "input": "Submissions, companyfacts y XBRL",
    "limit": "Verificar CIK actual, moneda, unidad, consolidación, duplicados y extensiones; no garantiza todos los datos trimestrales."
  },
  {
    "id": "FT06",
    "product": "FinTarget",
    "name": "Bolsas / nuam / proveedor",
    "url": "https://www.nuamx.com/",
    "status": "Acceso pendiente",
    "frequency": "Según contrato",
    "input": "Precios ajustados, acciones, dividendos y volúmenes",
    "limit": "No se comprobó API ni licencia comercial. Betas LatAm y cotizaciones quedan condicionadas a historia y derechos."
  },
  {
    "id": "FT07",
    "product": "FinTarget",
    "name": "Superfinanciera",
    "url": "https://www.superfinanciera.gov.co/",
    "status": "Esquema pendiente",
    "frequency": "Por serie",
    "input": "Tasas de crédito y estados financieros",
    "limit": "Portal localizado; dataset semanal y campos aún sin verificar. Tasa bancaria es contraste, no Kd específico."
  },
  {
    "id": "MI01",
    "product": "Miracle",
    "name": "SIPRI",
    "url": "https://www.sipri.org/databases/armstransfers",
    "status": "Licencia comercial requerida",
    "frequency": "Anual",
    "input": "Transferencias de armas convencionales principales, 1950–2025",
    "limit": "No equivale a inventario operativo; TIV no es precio. Uso comercial requiere autorización y licencia."
  },
  {
    "id": "MI02",
    "product": "Miracle",
    "name": "SECOP II · contratos",
    "url": "https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h",
    "status": "Fuente verificada",
    "frequency": "Catálogo declara diaria; medir rezago real",
    "input": "ID contrato, proveedor, entidad, objeto, fechas, valor",
    "limit": "85 campos en catálogo; no auditada muestra API. Reservas y contratación fuera de SECOP producen cobertura incompleta; no prueba costo de ciclo de vida."
  },
  {
    "id": "MI03",
    "product": "Miracle",
    "name": "DANE · importaciones",
    "url": "https://microdatos.dane.gov.co/index.php/catalog/473",
    "status": "Fuente verificada",
    "frequency": "Mensual; catálogo consultado 2012–2024",
    "input": "Partida, país de origen, aduana, departamento destino",
    "limit": "Validar ficheros recientes y subpartidas 8806, cambios HS desde 2022. Aduana no es lugar de uso ni importación evidencia de amenaza."
  },
  {
    "id": "MI04",
    "product": "Miracle",
    "name": "OFAC · SLS",
    "url": "https://ofac.treasury.gov/sanctions-list-service",
    "status": "Fuente verificada",
    "frequency": "Al actualizar la lista",
    "input": "Identificadores, nombres, alias y programas de sanciones",
    "limit": "Cruce de entidades y propiedad necesita revisión humana; ausencia en lista no significa ausencia de riesgo."
  },
  {
    "id": "MI05",
    "product": "Miracle",
    "name": "Base propia de eventos",
    "url": "https://www.gdeltproject.org/",
    "status": "Curación pendiente",
    "frequency": "Ingestión propuesta continua; salida mensual",
    "input": "Evento, fecha de ocurrencia/publicación, departamento, evidencia y confianza",
    "limit": "GDELT es descubrimiento de prensa, no verdad de terreno. Deduplicar y adjudicar; cero noticias no equivale a cero eventos. Términos de prensa por verificar."
  },
  {
    "id": "MI06",
    "product": "Miracle",
    "name": "Panel de sostenimiento",
    "url": "https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h",
    "status": "Etiquetas pendientes",
    "frequency": "Según evidencia",
    "input": "Plataforma–periodo, interrupciones, costos, disponibilidad, contratos",
    "limit": "Diez plataformas y dos episodios no sostienen un clasificador fiable. Requiere panel histórico más amplio, censura y costes comparables."
  },
  {
    "id": "MI07",
    "product": "Miracle",
    "name": "Eficacia / obsolescencia",
    "url": "https://www.sipri.org/databases/armstransfers",
    "status": "Evidencia pendiente",
    "frequency": "Por estudio",
    "input": "Evaluaciones públicas comparables por categoría",
    "limit": "SIPRI no aporta eficacia antidron. Cobertura y vida media serán escenarios explícitos hasta reunir evaluaciones; no afirmar eficacia operativa."
  }
];
