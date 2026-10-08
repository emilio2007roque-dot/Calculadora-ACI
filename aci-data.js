/**
 * ACI DATA & TABLES
 * Tablas normalizadas según ACI 211.1 y ACI 318
 */

const ACI_DATA = {
  // Tabla 6.3.1: Revenimientos recomendados para varios tipos de construcción
  slumpPresets: [
    { id: 'vigas_columnas', label: 'Vigas y columnas de edificios', min: 2.5, max: 10.0, default: 7.5, minIn: 1, maxIn: 4 },
    { id: 'muros_zapatas', label: 'Muros de cimentación y zapatas reforzadas', min: 2.5, max: 7.5, default: 5.0, minIn: 1, maxIn: 3 },
    { id: 'zapatas_simples', label: 'Zapatas simples, cajones y subestructuras', min: 2.5, max: 7.5, default: 5.0, minIn: 1, maxIn: 3 },
    { id: 'pavimentos_losas', label: 'Pavimentos y losas de piso', min: 2.5, max: 7.5, default: 5.0, minIn: 1, maxIn: 3 },
    { id: 'concreto_masivo', label: 'Concreto masivo', min: 2.5, max: 5.0, default: 3.5, minIn: 1, maxIn: 2 },
    { id: 'custom', label: 'Personalizado...', min: 2.0, max: 18.0, default: 8.0, minIn: 1, maxIn: 7 }
  ],

  // Tamaños Máximos Nominales (TMN)
  tmnOptions: [
    { id: '3/8', label: '3/8" (9.5 mm)', mm: 9.5, inches: 0.375 },
    { id: '1/2', label: '1/2" (12.5 mm)', mm: 12.5, inches: 0.50 },
    { id: '3/4', label: '3/4" (19.0 mm)', mm: 19.0, inches: 0.75 },
    { id: '1', label: '1" (25.0 mm)', mm: 25.0, inches: 1.00 },
    { id: '1_1/2', label: '1 1/2" (37.5 mm)', mm: 37.5, inches: 1.50 },
    { id: '2', label: '2" (50.0 mm)', mm: 50.0, inches: 2.00 },
    { id: '3', label: '3" (75.0 mm)', mm: 75.0, inches: 3.00 }
  ],

  // Tabla 6.3.3: Requisitos aproximados de agua de mezclado (kg/m3 o L/m3) y contenido de aire
  waterAndAirTable: {
    // Slump ranges:
    // low: 2.5 - 5.0 cm (1 - 2 in)
    // med: 7.5 - 10.0 cm (3 - 4 in)
    // high: 15.0 - 18.0 cm (6 - 7 in)
    nonAir: {
      '3/8':   { low: 207, med: 228, high: 243, airPct: 3.0 },
      '1/2':   { low: 199, med: 216, high: 231, airPct: 2.5 },
      '3/4':   { low: 190, med: 205, high: 216, airPct: 2.0 },
      '1':     { low: 179, med: 193, high: 202, airPct: 1.5 },
      '1_1/2': { low: 166, med: 181, high: 187, airPct: 1.0 },
      '2':     { low: 154, med: 169, high: 178, airPct: 0.5 },
      '3':     { low: 130, med: 145, high: 160, airPct: 0.3 }
    },
    airEntrained: {
      '3/8':   { low: 181, med: 202, high: 216, mildAir: 4.5, modAir: 6.0, sevAir: 7.5 },
      '1/2':   { low: 175, med: 193, high: 205, mildAir: 4.0, modAir: 5.5, sevAir: 7.0 },
      '3/4':   { low: 168, med: 184, high: 197, mildAir: 3.5, modAir: 5.0, sevAir: 6.0 },
      '1':     { low: 160, med: 175, high: 184, mildAir: 3.0, modAir: 4.5, sevAir: 6.0 },
      '1_1/2': { low: 150, med: 165, high: 174, mildAir: 2.5, modAir: 4.5, sevAir: 5.5 },
      '2':     { low: 142, med: 157, high: 166, mildAir: 2.0, modAir: 4.0, sevAir: 5.0 },
      '3':     { low: 122, med: 133, high: 154, mildAir: 1.5, modAir: 3.5, sevAir: 4.5 }
    }
  },

  // Tabla 6.3.4(a): Correspondencia entre relación agua/cemento y resistencia a la compresión (28 días)
  wcStrengthPoints: [
    { fcMpa: 45, fcKg: 459, nonAirWc: 0.38, airWc: 0.30 },
    { fcMpa: 40, fcKg: 408, nonAirWc: 0.43, airWc: 0.35 },
    { fcMpa: 35, fcKg: 357, nonAirWc: 0.48, airWc: 0.40 },
    { fcMpa: 30, fcKg: 306, nonAirWc: 0.55, airWc: 0.46 },
    { fcMpa: 25, fcKg: 255, nonAirWc: 0.62, airWc: 0.53 },
    { fcMpa: 20, fcKg: 204, nonAirWc: 0.70, airWc: 0.61 },
    { fcMpa: 15, fcKg: 153, nonAirWc: 0.80, airWc: 0.71 }
  ],

  // Tabla ACI 318 / 211 Durabilidad
  durabilityConditions: [
    { id: 'none', label: 'Condición normal (Sin exposición severa)', maxWc: 1.0, minFcKg: 0, desc: 'Estructuras protegidas en interiores o sin agresividad química' },
    { id: 'f1_freeze', label: 'Congelación y deshielo (Humedad moderada)', maxWc: 0.55, minFcKg: 210, desc: 'Expuesto a ciclos de congelamiento y deshielo ocasional' },
    { id: 'f2_freeze_sat', label: 'Congelación severa (Saturación continua)', maxWc: 0.45, minFcKg: 280, desc: 'En contacto continuo con humedad antes de congelación' },
    { id: 'f3_deicing', label: 'Congelación con sales descongelantes', maxWc: 0.45, minFcKg: 350, desc: 'Pavimentos y puentes con uso de cloruros para nieve' },
    { id: 's1_sulfate_mod', label: 'Sulfatos moderados (150-1500 ppm SO4 / Agua de mar)', maxWc: 0.50, minFcKg: 280, desc: 'Suelos moderadamente agresivos o contacto con agua salada' },
    { id: 's2_sulfate_sev', label: 'Sulfatos severos (1500-10000 ppm SO4)', maxWc: 0.45, minFcKg: 315, desc: 'Suelos con alto contenido de yeso o aguas residuales agresivas' },
    { id: 's3_sulfate_vsev', label: 'Sulfatos muy severos (> 10000 ppm SO4)', maxWc: 0.45, minFcKg: 350, desc: 'Ambientes industriales extremos (Cemento Tipo V + puzolana)' },
    { id: 'w1_low_perm', label: 'Baja permeabilidad requerida (Tanques / Piscinas)', maxWc: 0.50, minFcKg: 280, desc: 'Estructuras en contacto permanente con agua a presión' },
    { id: 'c2_chlorides', label: 'Protección contra corrosión por cloruros', maxWc: 0.40, minFcKg: 350, desc: 'Estructuras marinas o expuestas a sales agresivas' }
  ],

  // Tabla 6.3.6: Volumen de agregado grueso seco y varillado por unidad de volumen de concreto (b / b0)
  // según el Módulo de Finura (MF) de la arena
  coarseAggregateVolumeTable: {
    finenessModuli: [2.40, 2.60, 2.80, 3.00],
    ratios: {
      '3/8':   [0.50, 0.48, 0.46, 0.44],
      '1/2':   [0.59, 0.57, 0.55, 0.53],
      '3/4':   [0.66, 0.64, 0.62, 0.60],
      '1':     [0.71, 0.69, 0.67, 0.65],
      '1_1/2': [0.75, 0.73, 0.71, 0.69],
      '2':     [0.78, 0.76, 0.74, 0.72],
      '3':     [0.82, 0.80, 0.78, 0.76]
    }
  },

  // Tabla 6.3.7.1: Primera estimación del peso del concreto fresco (kg/m3) para el Método por Peso
  firstEstimateWeightTable: {
    nonAir: {
      '3/8': 2280, '1/2': 2310, '3/4': 2345, '1': 2380, '1_1/2': 2410, '2': 2445, '3': 2490
    },
    airEntrained: {
      '3/8': 2190, '1/2': 2230, '3/4': 2275, '1': 2295, '1_1/2': 2350, '2': 2345, '3': 2405
    }
  },

  // Mezclas de ejemplo precargadas para probar con 1 clic
  examplePresets: [
    {
      name: 'Vigas y Columnas 210 kg/cm² (Estándar)',
      fc: 210,
      unit: 'kgcm2',
      hasStandardDev: false,
      stdDev: 0,
      slumpPreset: 'vigas_columnas',
      slumpValue: 8.0, // cm (~3.1 in)
      tmn: '3/4',
      airType: 'nonAir',
      airExposure: 'mild',
      durability: 'none',
      useAdditive: false,
      waterReductionPct: 0,
      cementDensity: 3.15,
      sandDensity: 2.65,
      sandAbsorption: 1.5,
      sandMoisture: 4.0,
      sandFineness: 2.70,
      gravelDensity: 2.68,
      gravelAbsorption: 0.8,
      gravelMoisture: 1.5,
      gravelUnitWeight: 1600, // PVCS kg/m3
      bagWeight: 42.5
    },
    {
      name: 'Zapatas y Cimientos 175 kg/cm²',
      fc: 175,
      unit: 'kgcm2',
      hasStandardDev: false,
      stdDev: 0,
      slumpPreset: 'muros_zapatas',
      slumpValue: 6.0,
      tmn: '1',
      airType: 'nonAir',
      airExposure: 'mild',
      durability: 'none',
      useAdditive: false,
      waterReductionPct: 0,
      cementDensity: 3.15,
      sandDensity: 2.62,
      sandAbsorption: 1.8,
      sandMoisture: 3.5,
      sandFineness: 2.80,
      gravelDensity: 2.66,
      gravelAbsorption: 1.0,
      gravelMoisture: 1.2,
      gravelUnitWeight: 1580,
      bagWeight: 42.5
    },
    {
      name: 'Pavimento Rígido 280 kg/cm² (Con Plastificante)',
      fc: 280,
      unit: 'kgcm2',
      hasStandardDev: false,
      stdDev: 0,
      slumpPreset: 'pavimentos_losas',
      slumpValue: 5.0,
      tmn: '1_1/2',
      airType: 'nonAir',
      airExposure: 'mild',
      durability: 'none',
      useAdditive: true,
      waterReductionPct: 10,
      cementDensity: 3.15,
      sandDensity: 2.66,
      sandAbsorption: 1.2,
      sandMoisture: 3.8,
      sandFineness: 2.65,
      gravelDensity: 2.70,
      gravelAbsorption: 0.6,
      gravelMoisture: 1.0,
      gravelUnitWeight: 1650,
      bagWeight: 50.0
    },
    {
      name: 'Estructura Marina / Sulfatos 350 kg/cm² (Aire Incluido)',
      fc: 350,
      unit: 'kgcm2',
      hasStandardDev: false,
      stdDev: 0,
      slumpPreset: 'vigas_columnas',
      slumpValue: 8.0,
      tmn: '3/4',
      airType: 'airEntrained',
      airExposure: 'modAir',
      durability: 's2_sulfate_sev',
      useAdditive: true,
      waterReductionPct: 8,
      cementDensity: 3.15,
      sandDensity: 2.64,
      sandAbsorption: 1.4,
      sandMoisture: 4.2,
      sandFineness: 2.75,
      gravelDensity: 2.67,
      gravelAbsorption: 0.7,
      gravelMoisture: 1.3,
      gravelUnitWeight: 1620,
      bagWeight: 50.0
    }
  ]
};

// Interpolación lineal de 2 puntos
function linearInterpolate(x, x0, x1, y0, y1) {
  if (Math.abs(x1 - x0) < 1e-9) return y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

// Obtener agua y aire según slump y TMN
function getAciWaterAndAir(tmnKey, slumpCm, isAirEntrained, airExposure) {
  const table = isAirEntrained ? ACI_DATA.waterAndAirTable.airEntrained : ACI_DATA.waterAndAirTable.nonAir;
  const row = table[tmnKey] || table['3/4'];

  // Slump:
  // Low range center: 3.75 cm (1.5 in)
  // Med range center: 8.75 cm (3.5 in)
  // High range center: 16.5 cm (6.5 in)
  let water;
  if (slumpCm <= 5.0) {
    if (slumpCm <= 2.5) {
      water = row.low;
    } else {
      water = linearInterpolate(slumpCm, 2.5, 5.0, row.low, (row.low + row.med) / 2);
    }
  } else if (slumpCm <= 10.0) {
    water = linearInterpolate(slumpCm, 5.0, 10.0, row.low, row.med);
  } else if (slumpCm <= 17.5) {
    water = linearInterpolate(slumpCm, 10.0, 17.5, row.med, row.high);
  } else {
    // Más de 17.5 cm
    water = row.high + (slumpCm - 17.5) * 2.0;
  }

  // Contenido de aire
  let airPct = 2.0;
  if (!isAirEntrained) {
    airPct = row.airPct;
  } else {
    if (airExposure === 'sevAir') airPct = row.sevAir;
    else if (airExposure === 'modAir') airPct = row.modAir;
    else airPct = row.mildAir;
  }

  return {
    waterKg: Math.round(water * 10) / 10,
    airPct: airPct,
    baseWater: Math.round(water * 10) / 10
  };
}

// Obtener relación a/c por resistencia según tabla 6.3.4(a)
function getAciWcFromStrength(fcrKg, isAirEntrained) {
  const points = ACI_DATA.wcStrengthPoints; // Ordenados descendentemente por fcKg (459 a 153)

  // Si es mayor que el máximo de la tabla
  if (fcrKg >= points[0].fcKg) {
    return isAirEntrained ? points[0].airWc : points[0].nonAirWc;
  }
  // Si es menor que el mínimo de la tabla
  if (fcrKg <= points[points.length - 1].fcKg) {
    const last = points[points.length - 1];
    return isAirEntrained ? last.airWc : last.nonAirWc;
  }

  // Encontrar el segmento donde cae fcrKg
  for (let i = 0; i < points.length - 1; i++) {
    const pUpper = points[i];
    const pLower = points[i + 1];
    if (fcrKg <= pUpper.fcKg && fcrKg >= pLower.fcKg) {
      const yUpper = isAirEntrained ? pUpper.airWc : pUpper.nonAirWc;
      const yLower = isAirEntrained ? pLower.airWc : pLower.nonAirWc;
      const wc = linearInterpolate(fcrKg, pLower.fcKg, pUpper.fcKg, yLower, yUpper);
      return Math.round(wc * 1000) / 1000;
    }
  }

  return 0.50;
}

// Obtener volumen de grava (b / b0) según MF de la arena y TMN (Tabla 6.3.6)
function getAciCoarseAggregateVolumeRatio(tmnKey, finenessModulus) {
  const table = ACI_DATA.coarseAggregateVolumeTable;
  const values = table.ratios[tmnKey] || table.ratios['3/4'];
  const moduli = table.finenessModuli; // [2.40, 2.60, 2.80, 3.00]

  // Limitar MF entre 2.40 y 3.00 si está fuera
  const mf = Math.max(2.40, Math.min(3.00, finenessModulus));

  for (let i = 0; i < moduli.length - 1; i++) {
    if (mf >= moduli[i] && mf <= moduli[i + 1]) {
      const ratio = linearInterpolate(mf, moduli[i], moduli[i + 1], values[i], values[i + 1]);
      return Math.round(ratio * 1000) / 1000;
    }
  }

  return values[2]; // default 2.80
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ACI_DATA,
    linearInterpolate,
    getAciWaterAndAir,
    getAciWcFromStrength,
    getAciCoarseAggregateVolumeRatio
  };
}
