/**
 * CALCULADORA DE DISEÑO DE MEZCLAS SEGÚN MÉTODO ACI 211.1
 * Motor de cálculo de alta precisión con soporte para unidades métricas (kg/cm², MPa)
 */

class AciMixCalculator {
  constructor(inputData) {
    this.input = Object.assign({
      fc: 210, // kg/cm2 o MPa según unit
      unit: 'kgcm2', // 'kgcm2' o 'mpa'
      hasStandardDev: false,
      stdDev: 0,
      slumpCm: 8.0,
      slumpPreset: 'vigas_columnas',
      tmn: '3/4', // clave TMN
      isAirEntrained: false,
      airExposure: 'mild',
      durabilityId: 'none',
      useAdditive: false,
      waterReductionPct: 0,
      
      // Propiedades de los materiales
      cementDensity: 3.15, // g/cm3 o kg/L
      bagWeight: 42.5, // kg (42.5 o 50)
      
      sandDensity: 2.65, // Peso específico de masa (seco)
      sandAbsorption: 1.5, // %
      sandMoisture: 4.0, // %
      sandFineness: 2.70, // Módulo de finura (MF)
      
      gravelDensity: 2.68, // Peso específico de masa (seco)
      gravelAbsorption: 0.8, // %
      gravelMoisture: 1.5, // %
      gravelUnitWeight: 1600, // PVCS - Peso volumétrico compactado seco (kg/m3)
      
      // Parámetros de tanda en obra
      batchVolumeM3: 0.15, // Volumen de tanda para mezcladora trompito (m3)
      bucketVolumeLiters: 19 // Balde de obra estándar (19 L / 5 galones)
    }, inputData);
  }

  calculate() {
    const r = {}; // Resultados y memoria paso a paso

    // ==========================================
    // PASO 1: Resistencia de diseño (f'cr)
    // ==========================================
    const unitFactor = this.input.unit === 'mpa' ? 10.197 : 1.0; // 1 MPa = ~10.197 kg/cm2
    const fcKg = this.input.unit === 'mpa' ? this.input.fc * 10.197 : this.input.fc;
    const stdDevKg = this.input.unit === 'mpa' ? (this.input.stdDev || 0) * 10.197 : (this.input.stdDev || 0);

    let fcrKg = fcKg;
    let fcrFormula = '';
    let fcrDetails = '';

    if (this.input.hasStandardDev && stdDevKg > 0) {
      if (fcKg <= 350) {
        const fcr1 = fcKg + 1.34 * stdDevKg;
        const fcr2 = fcKg + 2.33 * stdDevKg - 35;
        fcrKg = Math.max(fcr1, fcr2);
        fcrFormula = `f'cr = max(f'c + 1.34·s, f'c + 2.33·s - 35)`;
        fcrDetails = `f'cr1 = ${fcKg.toFixed(1)} + 1.34·(${stdDevKg.toFixed(1)}) = ${fcr1.toFixed(1)} kg/cm²; f'cr2 = ${fcKg.toFixed(1)} + 2.33·(${stdDevKg.toFixed(1)}) - 35 = ${fcr2.toFixed(1)} kg/cm²`;
      } else {
        const fcr1 = fcKg + 1.34 * stdDevKg;
        const fcr2 = 0.90 * fcKg + 2.33 * stdDevKg;
        fcrKg = Math.max(fcr1, fcr2);
        fcrFormula = `f'cr = max(f'c + 1.34·s, 0.90·f'c + 2.33·s)`;
        fcrDetails = `f'cr1 = ${fcKg.toFixed(1)} + 1.34·(${stdDevKg.toFixed(1)}) = ${fcr1.toFixed(1)} kg/cm²; f'cr2 = 0.90·(${fcKg.toFixed(1)}) + 2.33·(${stdDevKg.toFixed(1)}) = ${fcr2.toFixed(1)} kg/cm²`;
      }
    } else {
      // Sin desviación estándar (Tablas de incremento ACI 318 / 211)
      if (fcKg < 210) {
        fcrKg = fcKg + 70;
        fcrFormula = `f'cr = f'c + 70 kg/cm² (f'c < 210)`;
        fcrDetails = `${fcKg.toFixed(1)} + 70.0 = ${fcrKg.toFixed(1)} kg/cm²`;
      } else if (fcKg <= 350) {
        fcrKg = fcKg + 84;
        fcrFormula = `f'cr = f'c + 84 kg/cm² (210 ≤ f'c ≤ 350)`;
        fcrDetails = `${fcKg.toFixed(1)} + 84.0 = ${fcrKg.toFixed(1)} kg/cm²`;
      } else {
        fcrKg = 1.10 * fcKg + 50;
        fcrFormula = `f'cr = 1.10·f'c + 50 kg/cm² (f'c > 350)`;
        fcrDetails = `1.10·(${fcKg.toFixed(1)}) + 50.0 = ${fcrKg.toFixed(1)} kg/cm²`;
      }
    }

    r.step1 = {
      fcInput: this.input.fc,
      unit: this.input.unit,
      fcKg: Math.round(fcKg * 10) / 10,
      fcMpa: Math.round((fcKg / 10.197) * 10) / 10,
      fcrKg: Math.round(fcrKg * 10) / 10,
      fcrMpa: Math.round((fcrKg / 10.197) * 10) / 10,
      formula: fcrFormula,
      details: fcrDetails
    };

    // ==========================================
    // PASO 2: Asentamiento (Slump) y TMN
    // ==========================================
    const tmnObj = ACI_DATA.tmnOptions.find(t => t.id === this.input.tmn) || ACI_DATA.tmnOptions[2];
    const slumpCm = parseFloat(this.input.slumpCm);
    const slumpInches = Math.round((slumpCm / 2.54) * 10) / 10;

    r.step2 = {
      slumpCm: slumpCm,
      slumpInches: slumpInches,
      tmnKey: tmnObj.id,
      tmnLabel: tmnObj.label,
      tmnMm: tmnObj.mm
    };

    // ==========================================
    // PASO 3: Agua de mezclado y Contenido de Aire
    // ==========================================
    const waterAirData = getAciWaterAndAir(
      this.input.tmn,
      slumpCm,
      this.input.isAirEntrained,
      this.input.airExposure
    );

    let designWater = waterAirData.waterKg;
    let waterReductionLiters = 0;
    if (this.input.useAdditive && this.input.waterReductionPct > 0) {
      waterReductionLiters = (waterAirData.waterKg * this.input.waterReductionPct) / 100;
      designWater = waterAirData.waterKg - waterReductionLiters;
    }

    r.step3 = {
      baseWater: waterAirData.baseWater,
      isAirEntrained: this.input.isAirEntrained,
      airExposure: this.input.airExposure,
      airPct: waterAirData.airPct,
      useAdditive: this.input.useAdditive,
      waterReductionPct: this.input.waterReductionPct,
      waterReductionLiters: Math.round(waterReductionLiters * 10) / 10,
      designWater: Math.round(designWater * 10) / 10 // L/m3 o kg/m3
    };

    // ==========================================
    // PASO 4: Relación Agua/Cemento (a/c)
    // ==========================================
    const wcStrength = getAciWcFromStrength(fcrKg, this.input.isAirEntrained);
    
    // Condición de durabilidad
    const durCondition = ACI_DATA.durabilityConditions.find(c => c.id === this.input.durabilityId) || ACI_DATA.durabilityConditions[0];
    const wcDurability = durCondition.maxWc;
    const finalWc = Math.min(wcStrength, wcDurability);
    const governedBy = wcStrength <= wcDurability ? 'Resistencia' : 'Durabilidad';

    // Verificación de resistencia mínima por durabilidad
    let durabilityAlert = null;
    if (durCondition.minFcKg > 0 && fcKg < durCondition.minFcKg) {
      durabilityAlert = `Advertencia: La resistencia especificada (${fcKg.toFixed(0)} kg/cm²) es menor que la mínima exigida por durabilidad (${durCondition.minFcKg} kg/cm²). Se recomienda subir f'c.`;
    }

    r.step4 = {
      wcStrength: wcStrength,
      wcDurability: wcDurability,
      finalWc: finalWc,
      governedBy: governedBy,
      durabilityCondition: durCondition,
      durabilityAlert: durabilityAlert
    };

    // ==========================================
    // PASO 5: Contenido de Cemento
    // ==========================================
    const cementWeight = designWater / finalWc;
    const bagWeight = parseFloat(this.input.bagWeight) || 42.5;
    const cementBags = cementWeight / bagWeight;

    r.step5 = {
      cementWeight: Math.round(cementWeight * 10) / 10, // kg/m3
      bagWeight: bagWeight,
      cementBags: Math.round(cementBags * 100) / 100
    };

    // ==========================================
    // PASO 6: Contenido de Agregado Grueso (Grava)
    // ==========================================
    const b_b0_ratio = getAciCoarseAggregateVolumeRatio(this.input.tmn, parseFloat(this.input.sandFineness));
    const gravelDryWeight = b_b0_ratio * parseFloat(this.input.gravelUnitWeight);
    const gravelAbsVolume = gravelDryWeight / (parseFloat(this.input.gravelDensity) * 1000);

    r.step6 = {
      finenessModulus: parseFloat(this.input.sandFineness),
      gravelUnitWeight: parseFloat(this.input.gravelUnitWeight),
      gravelDensity: parseFloat(this.input.gravelDensity),
      b_b0_ratio: b_b0_ratio,
      gravelDryWeight: Math.round(gravelDryWeight * 10) / 10, // kg/m3
      gravelAbsVolume: Math.round(gravelAbsVolume * 10000) / 10000 // m3
    };

    // ==========================================
    // PASO 7: Contenido de Agregado Fino (Arena) - Método Volúmenes Absolutos
    // ==========================================
    const volWater = designWater / 1000;
    const volCement = cementWeight / (parseFloat(this.input.cementDensity) * 1000);
    const volAir = waterAirData.airPct / 100;
    const volGravel = gravelAbsVolume;

    const sumKnownVolumes = volWater + volCement + volAir + volGravel;
    const volSand = Math.max(0, 1.000 - sumKnownVolumes);
    const sandDryWeight = volSand * (parseFloat(this.input.sandDensity) * 1000);

    // Comparación: Método por peso (Tabla 6.3.7.1)
    const weightTable = this.input.isAirEntrained ? ACI_DATA.firstEstimateWeightTable.airEntrained : ACI_DATA.firstEstimateWeightTable.nonAir;
    const estFreshWeight = weightTable[this.input.tmn] || 2350;
    const sandWeightByWeightMethod = Math.max(0, estFreshWeight - (designWater + cementWeight + gravelDryWeight));

    r.step7 = {
      volWater: Math.round(volWater * 10000) / 10000,
      volCement: Math.round(volCement * 10000) / 10000,
      volAir: Math.round(volAir * 10000) / 10000,
      volGravel: Math.round(volGravel * 10000) / 10000,
      sumKnownVolumes: Math.round(sumKnownVolumes * 10000) / 10000,
      volSand: Math.round(volSand * 10000) / 10000,
      sandDensity: parseFloat(this.input.sandDensity),
      sandDryWeight: Math.round(sandDryWeight * 10) / 10, // kg/m3
      estFreshWeight: estFreshWeight,
      sandWeightByWeightMethod: Math.round(sandWeightByWeightMethod * 10) / 10
    };

    // Total peso seco unitario
    const totalDryWeight = designWater + cementWeight + gravelDryWeight + sandDryWeight;
    r.step7.totalDryWeight = Math.round(totalDryWeight * 10) / 10;

    // ==========================================
    // PASO 8: Corrección por Humedad y Absorción
    // ==========================================
    const sandMoisture = parseFloat(this.input.sandMoisture) || 0;
    const sandAbsorption = parseFloat(this.input.sandAbsorption) || 0;
    const gravelMoisture = parseFloat(this.input.gravelMoisture) || 0;
    const gravelAbsorption = parseFloat(this.input.gravelAbsorption) || 0;

    // Pesos húmedos
    const sandWetWeight = sandDryWeight * (1 + sandMoisture / 100);
    const gravelWetWeight = gravelDryWeight * (1 + gravelMoisture / 100);

    // Aportes de agua libre (Humedad - Absorción)
    // Si W - Abs > 0 aporta agua; si W - Abs < 0 absorbe agua
    const sandFreeWater = sandDryWeight * ((sandMoisture - sandAbsorption) / 100);
    const gravelFreeWater = gravelDryWeight * ((gravelMoisture - gravelAbsorption) / 100);
    const totalFreeWater = sandFreeWater + gravelFreeWater;

    // Agua efectiva a añadir a la mezcladora
    const effectiveWater = designWater - totalFreeWater;

    const totalWetWeight = effectiveWater + cementWeight + sandWetWeight + gravelWetWeight;

    r.step8 = {
      sandMoisture: sandMoisture,
      sandAbsorption: sandAbsorption,
      gravelMoisture: gravelMoisture,
      gravelAbsorption: gravelAbsorption,
      sandWetWeight: Math.round(sandWetWeight * 10) / 10,
      gravelWetWeight: Math.round(gravelWetWeight * 10) / 10,
      sandFreeWater: Math.round(sandFreeWater * 10) / 10,
      gravelFreeWater: Math.round(gravelFreeWater * 10) / 10,
      totalFreeWater: Math.round(totalFreeWater * 10) / 10,
      effectiveWater: Math.round(effectiveWater * 10) / 10,
      totalWetWeight: Math.round(totalWetWeight * 10) / 10
    };

    // ==========================================
    // PASO 9: Dosificaciones Prácticas en Obra
    // ==========================================
    // 1) Proporción en peso seco: 1 : (Sand/Cem) : (Gravel/Cem) / (Water/Cem)
    const ratioDrySand = sandDryWeight / cementWeight;
    const ratioDryGravel = gravelDryWeight / cementWeight;
    const ratioDryWater = designWater / cementWeight;

    // 2) Proporción en peso húmedo (corregido):
    const ratioWetSand = sandWetWeight / cementWeight;
    const ratioWetGravel = gravelWetWeight / cementWeight;
    const ratioWetWater = effectiveWater / cementWeight;

    // 3) Por bolsa de cemento (peso real en obra):
    const perBag = {
      bagWeight: bagWeight,
      cementKg: bagWeight,
      drySandKg: Math.round((ratioDrySand * bagWeight) * 10) / 10,
      dryGravelKg: Math.round((ratioDryGravel * bagWeight) * 10) / 10,
      designWaterLiters: Math.round((ratioDryWater * bagWeight) * 10) / 10,
      wetSandKg: Math.round((ratioWetSand * bagWeight) * 10) / 10,
      wetGravelKg: Math.round((ratioWetGravel * bagWeight) * 10) / 10,
      effectiveWaterLiters: Math.round((ratioWetWater * bagWeight) * 10) / 10
    };

    // 4) Dosificación en Volumen de Obra (Baldes y Carretillas)
    // Densidad suelta de arena húmeda aprox ~ 1500-1600 kg/m3 (o 1.5 kg/L)
    // Densidad suelta de grava aprox ~ 1450-1550 kg/m3 (o 1.5 kg/L)
    const bucketLiters = parseFloat(this.input.bucketVolumeLiters) || 19;
    
    // Estimación en litros de arena húmeda y grava húmeda por bolsa
    const sandLooseDensity = (parseFloat(this.input.sandDensity) * 1000) * 0.58; // Estimado suelto ~ 1530 kg/m3
    const gravelLooseDensity = (parseFloat(this.input.gravelUnitWeight)) * 0.90; // Estimado suelto ~ 1440 kg/m3

    const sandLitersPerBag = (perBag.wetSandKg / sandLooseDensity) * 1000;
    const gravelLitersPerBag = (perBag.wetGravelKg / gravelLooseDensity) * 1000;

    const sandBucketsPerBag = Math.round((sandLitersPerBag / bucketLiters) * 10) / 10;
    const gravelBucketsPerBag = Math.round((gravelLitersPerBag / bucketLiters) * 10) / 10;
    const waterBucketsPerBag = Math.round((perBag.effectiveWaterLiters / bucketLiters) * 10) / 10;

    // 5) Tanda personalizada (para trompito o volumen específico)
    const batchVol = parseFloat(this.input.batchVolumeM3) || 0.15;
    const batch = {
      volumeM3: batchVol,
      cementKg: Math.round((cementWeight * batchVol) * 10) / 10,
      cementBags: Math.round(((cementWeight * batchVol) / bagWeight) * 100) / 100,
      wetSandKg: Math.round((sandWetWeight * batchVol) * 10) / 10,
      wetGravelKg: Math.round((gravelWetWeight * batchVol) * 10) / 10,
      effectiveWaterLiters: Math.round((effectiveWater * batchVol) * 10) / 10,
      sandBuckets: Math.round((sandBucketsPerBag * ((cementWeight * batchVol) / bagWeight)) * 10) / 10,
      gravelBuckets: Math.round((gravelBucketsPerBag * ((cementWeight * batchVol) / bagWeight)) * 10) / 10,
      waterBuckets: Math.round((waterBucketsPerBag * ((cementWeight * batchVol) / bagWeight)) * 10) / 10
    };

    r.step9 = {
      ratioDry: {
        cement: 1,
        sand: Math.round(ratioDrySand * 100) / 100,
        gravel: Math.round(ratioDryGravel * 100) / 100,
        water: Math.round(ratioDryWater * 100) / 100,
        str: `1 : ${ratioDrySand.toFixed(2)} : ${ratioDryGravel.toFixed(2)} / ${ratioDryWater.toFixed(2)}`
      },
      ratioWet: {
        cement: 1,
        sand: Math.round(ratioWetSand * 100) / 100,
        gravel: Math.round(ratioWetGravel * 100) / 100,
        water: Math.round(ratioWetWater * 100) / 100,
        str: `1 : ${ratioWetSand.toFixed(2)} : ${ratioWetGravel.toFixed(2)} / ${ratioWetWater.toFixed(2)}`
      },
      perBag: perBag,
      bucketLiters: bucketLiters,
      sandBucketsPerBag: sandBucketsPerBag,
      gravelBucketsPerBag: gravelBucketsPerBag,
      waterBucketsPerBag: waterBucketsPerBag,
      batch: batch
    };

    // Rendimiento teórico del concreto (m3)
    const yieldM3 = volWater + volCement + volAir + volGravel + volSand;
    r.yieldM3 = Math.round(yieldM3 * 1000) / 1000;

    return r;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AciMixCalculator };
}
