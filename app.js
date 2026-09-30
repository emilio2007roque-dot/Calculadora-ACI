/**
 * APP CONTROLLER & INTERFACE LOGIC
 * Calculadora de Mezclas ACI 211.1
 */

// Estado global de la aplicación
const AppState = {
  currentInput: Object.assign({}, ACI_DATA.examplePresets[0]),
  lastResult: null,
  deferredInstallPrompt: null,
  savedProjects: []
};

// Inicialización cuando carga el DOM
document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initPwaInstall();
  loadSavedProjects();
  initEventListeners();
  populateDropdowns();
  
  // Cargar estado guardado o preset por defecto
  const cached = localStorage.getItem('aci_current_state');
  if (cached) {
    try {
      AppState.currentInput = JSON.parse(cached);
    } catch (e) {
      console.warn('Error reading cached state, using default preset');
    }
  }
  
  syncFormFromState();
  runCalculation();
});

// Registrar Service Worker para PWA Offline
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('SW registrado con éxito:', reg.scope))
        .catch(err => console.log('SW falló:', err));
    });
  }
}

// Escuchar evento de instalación PWA
function initPwaInstall() {
  const installBtn = document.getElementById('btnInstallPwa');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    AppState.deferredInstallPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (AppState.deferredInstallPrompt) {
        AppState.deferredInstallPrompt.prompt();
        const { outcome } = await AppState.deferredInstallPrompt.userChoice;
        console.log('Resultado de instalación:', outcome);
        AppState.deferredInstallPrompt = null;
        installBtn.style.display = 'none';
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('App instalada como PWA');
    if (installBtn) installBtn.style.display = 'none';
  });
}

// Poblar selects dinámicos con datos ACI
function populateDropdowns() {
  // TMN select
  const tmnSelect = document.getElementById('inputTmn');
  if (tmnSelect) {
    tmnSelect.innerHTML = ACI_DATA.tmnOptions.map(t => 
      `<option value="${t.id}">${t.label}</option>`
    ).join('');
  }

  // Slump Presets
  const slumpSelect = document.getElementById('inputSlumpPreset');
  if (slumpSelect) {
    slumpSelect.innerHTML = ACI_DATA.slumpPresets.map(s => 
      `<option value="${s.id}">${s.label} (${s.min}-${s.max} cm)</option>`
    ).join('');
  }

  // Durability conditions
  const durSelect = document.getElementById('inputDurability');
  if (durSelect) {
    durSelect.innerHTML = ACI_DATA.durabilityConditions.map(d => 
      `<option value="${d.id}">${d.label} ${d.maxWc < 1 ? '(Max a/c: ' + d.maxWc + ')' : ''}</option>`
    ).join('');
  }

  // Presets select
  const presetSelect = document.getElementById('presetSelect');
  if (presetSelect) {
    presetSelect.innerHTML = `<option value="">-- Cargar mezcla tipo --</option>` + 
      ACI_DATA.examplePresets.map((p, idx) => 
        `<option value="${idx}">${p.name}</option>`
      ).join('');
  }
}

// Vincular eventos de la interfaz
function initEventListeners() {
  // Cambio de pestañas
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
      
      // Si cambia a pestaña de gráficos, refrescar render
      if (targetId === 'tab-charts') {
        renderCharts();
      }
    });
  });

  // Selector de Presets
  const presetSelect = document.getElementById('presetSelect');
  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const idx = e.target.value;
      if (idx !== '') {
        const selected = ACI_DATA.examplePresets[parseInt(idx, 10)];
        if (selected) {
          AppState.currentInput = Object.assign({}, selected);
          syncFormFromState();
          runCalculation();
        }
      }
    });
  }

  // Cambio de unidad (kg/cm2 vs MPa)
  const unitKgcm2 = document.getElementById('unitKgcm2');
  const unitMpa = document.getElementById('unitMpa');
  const onUnitChange = (unit) => {
    if (unit === AppState.currentInput.unit) return;
    const oldUnit = AppState.currentInput.unit;
    AppState.currentInput.unit = unit;

    // Convertir fc actual
    if (unit === 'mpa' && oldUnit === 'kgcm2') {
      AppState.currentInput.fc = Math.round((AppState.currentInput.fc / 10.197) * 10) / 10;
      if (AppState.currentInput.stdDev) {
        AppState.currentInput.stdDev = Math.round((AppState.currentInput.stdDev / 10.197) * 10) / 10;
      }
    } else if (unit === 'kgcm2' && oldUnit === 'mpa') {
      AppState.currentInput.fc = Math.round(AppState.currentInput.fc * 10.197);
      if (AppState.currentInput.stdDev) {
        AppState.currentInput.stdDev = Math.round(AppState.currentInput.stdDev * 10.197);
      }
    }

    updateUnitLabels();
    syncFormFromState();
    runCalculation();
  };

  if (unitKgcm2) unitKgcm2.addEventListener('change', () => onUnitChange('kgcm2'));
  if (unitMpa) unitMpa.addEventListener('change', () => onUnitChange('mpa'));

  // Slump Preset Change
  const inputSlumpPreset = document.getElementById('inputSlumpPreset');
  if (inputSlumpPreset) {
    inputSlumpPreset.addEventListener('change', (e) => {
      const presetId = e.target.value;
      const found = ACI_DATA.slumpPresets.find(p => p.id === presetId);
      if (found) {
        AppState.currentInput.slumpPreset = presetId;
        AppState.currentInput.slumpCm = found.default;
        const slumpValInput = document.getElementById('inputSlumpCm');
        if (slumpValInput) slumpValInput.value = found.default;
        runCalculation();
      }
    });
  }

  // Slump Slider/Input sync
  const inputSlumpCm = document.getElementById('inputSlumpCm');
  if (inputSlumpCm) {
    inputSlumpCm.addEventListener('input', (e) => {
      AppState.currentInput.slumpCm = parseFloat(e.target.value) || 0;
      runCalculation();
    });
  }

  // Radio cards (Aire incorporado)
  const radioNonAir = document.getElementById('radioNonAir');
  const radioAir = document.getElementById('radioAir');
  const airExposureWrap = document.getElementById('airExposureWrap');

  const onAirChange = (isAir) => {
    AppState.currentInput.isAirEntrained = isAir;
    if (airExposureWrap) {
      airExposureWrap.style.display = isAir ? 'block' : 'none';
    }
    const cardNonAir = document.getElementById('cardNonAir');
    const cardAir = document.getElementById('cardAir');
    if (cardNonAir) cardNonAir.classList.toggle('selected', !isAir);
    if (cardAir) cardAir.classList.toggle('selected', isAir);
    runCalculation();
  };

  if (radioNonAir) radioNonAir.addEventListener('change', () => onAirChange(false));
  if (radioAir) radioAir.addEventListener('change', () => onAirChange(true));

  // Checkbox Desviación Estándar
  const checkStdDev = document.getElementById('checkStdDev');
  const stdDevWrap = document.getElementById('stdDevWrap');
  if (checkStdDev) {
    checkStdDev.addEventListener('change', (e) => {
      AppState.currentInput.hasStandardDev = e.target.checked;
      if (stdDevWrap) stdDevWrap.style.display = e.target.checked ? 'block' : 'none';
      runCalculation();
    });
  }

  // Checkbox Aditivo Reductor
  const checkAdditive = document.getElementById('checkAdditive');
  const additiveWrap = document.getElementById('additiveWrap');
  if (checkAdditive) {
    checkAdditive.addEventListener('change', (e) => {
      AppState.currentInput.useAdditive = e.target.checked;
      if (additiveWrap) additiveWrap.style.display = e.target.checked ? 'block' : 'none';
      runCalculation();
    });
  }

  // Todos los demás campos numéricos y selectores reactivos
  const reactiveIds = [
    'inputFc', 'inputStdDev', 'inputTmn', 'inputAirExposure', 'inputDurability',
    'inputWaterReduction', 'inputCementDensity', 'inputBagWeight',
    'inputSandDensity', 'inputSandAbsorption', 'inputSandMoisture', 'inputSandFineness',
    'inputGravelDensity', 'inputGravelAbsorption', 'inputGravelMoisture', 'inputGravelUnitWeight',
    'inputBatchVolume', 'inputBucketVolume'
  ];

  reactiveIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        readFormIntoState();
        runCalculation();
      });
      el.addEventListener('change', () => {
        readFormIntoState();
        runCalculation();
      });
    }
  });

  // Modal Abrir en Celular / QR
  const btnOpenMobileModal = document.getElementById('btnOpenMobileModal');
  const mobileModal = document.getElementById('mobileModal');
  const btnCloseMobileModal = document.getElementById('btnCloseMobileModal');
  const qrCodeImage = document.getElementById('qrCodeImage');
  const mobileUrlDisplay = document.getElementById('mobileUrlDisplay');

  if (btnOpenMobileModal && mobileModal) {
    btnOpenMobileModal.addEventListener('click', () => {
      // Determinar IP de red local
      const port = window.location.port || '3000';
      const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? '192.168.0.42'
        : window.location.hostname;
      const mobileUrl = `http://${host}:${port}`;

      if (mobileUrlDisplay) mobileUrlDisplay.textContent = mobileUrl;
      if (qrCodeImage) {
        qrCodeImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(mobileUrl)}`;
      }
      mobileModal.classList.add('active');
    });

    if (btnCloseMobileModal) {
      btnCloseMobileModal.addEventListener('click', () => {
        mobileModal.classList.remove('active');
      });
    }

    mobileModal.addEventListener('click', (e) => {
      if (e.target === mobileModal) {
        mobileModal.classList.remove('active');
      }
    });
  }

  // Botón Imprimir / PDF
  const btnPrint = document.getElementById('btnPrintReport');
  if (btnPrint) {
    btnPrint.addEventListener('click', () => {
      window.print();
    });
  }

  // Botones de Guardar / Cargar Proyecto
  const btnSaveProject = document.getElementById('btnSaveProject');
  if (btnSaveProject) {
    btnSaveProject.addEventListener('click', promptSaveProject);
  }

  const btnExportJson = document.getElementById('btnExportJson');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', exportProjectJson);
  }

  const fileImportJson = document.getElementById('fileImportJson');
  if (fileImportJson) {
    fileImportJson.addEventListener('change', importProjectJson);
  }

  // Quickbar en móvil abre la pestaña de dosificación
  const mobileQuickbar = document.getElementById('mobileQuickbar');
  if (mobileQuickbar) {
    mobileQuickbar.addEventListener('click', () => {
      const siteTab = document.querySelector('.nav-tab[data-tab="tab-site"]');
      if (siteTab) siteTab.click();
    });
  }
}

// Sincronizar etiquetas de unidades (kg/cm2 vs MPa)
function updateUnitLabels() {
  const isMpa = AppState.currentInput.unit === 'mpa';
  const labels = document.querySelectorAll('.unit-fc-label');
  labels.forEach(el => el.textContent = isMpa ? 'MPa' : 'kg/cm²');
}

// Sincronizar formulario HTML desde el objeto AppState
function syncFormFromState() {
  const inp = AppState.currentInput;

  // Radios de unidad
  const unitKgcm2 = document.getElementById('unitKgcm2');
  const unitMpa = document.getElementById('unitMpa');
  if (unitKgcm2) unitKgcm2.checked = inp.unit === 'kgcm2';
  if (unitMpa) unitMpa.checked = inp.unit === 'mpa';
  updateUnitLabels();

  // Valores numéricos
  setVal('inputFc', inp.fc);
  setVal('inputStdDev', inp.stdDev || 0);
  setVal('inputSlumpCm', inp.slumpCm);
  setVal('inputSlumpPreset', inp.slumpPreset || 'vigas_columnas');
  setVal('inputTmn', inp.tmn);
  
  // Desviación estándar
  const checkStdDev = document.getElementById('checkStdDev');
  const stdDevWrap = document.getElementById('stdDevWrap');
  if (checkStdDev) checkStdDev.checked = !!inp.hasStandardDev;
  if (stdDevWrap) stdDevWrap.style.display = inp.hasStandardDev ? 'block' : 'none';

  // Aire
  const radioNonAir = document.getElementById('radioNonAir');
  const radioAir = document.getElementById('radioAir');
  const cardNonAir = document.getElementById('cardNonAir');
  const cardAir = document.getElementById('cardAir');
  const airExposureWrap = document.getElementById('airExposureWrap');

  if (radioNonAir) radioNonAir.checked = !inp.isAirEntrained;
  if (radioAir) radioAir.checked = !!inp.isAirEntrained;
  if (cardNonAir) cardNonAir.classList.toggle('selected', !inp.isAirEntrained);
  if (cardAir) cardAir.classList.toggle('selected', !!inp.isAirEntrained);
  if (airExposureWrap) airExposureWrap.style.display = inp.isAirEntrained ? 'block' : 'none';
  setVal('inputAirExposure', inp.airExposure || 'mild');

  // Durabilidad
  setVal('inputDurability', inp.durabilityId || 'none');

  // Aditivo
  const checkAdditive = document.getElementById('checkAdditive');
  const additiveWrap = document.getElementById('additiveWrap');
  if (checkAdditive) checkAdditive.checked = !!inp.useAdditive;
  if (additiveWrap) additiveWrap.style.display = inp.useAdditive ? 'block' : 'none';
  setVal('inputWaterReduction', inp.waterReductionPct || 0);

  // Materiales
  setVal('inputCementDensity', inp.cementDensity || 3.15);
  setVal('inputBagWeight', inp.bagWeight || 42.5);
  setVal('inputSandDensity', inp.sandDensity || 2.65);
  setVal('inputSandAbsorption', inp.sandAbsorption || 1.5);
  setVal('inputSandMoisture', inp.sandMoisture || 4.0);
  setVal('inputSandFineness', inp.sandFineness || 2.70);
  setVal('inputGravelDensity', inp.gravelDensity || 2.68);
  setVal('inputGravelAbsorption', inp.gravelAbsorption || 0.8);
  setVal('inputGravelMoisture', inp.gravelMoisture || 1.5);
  setVal('inputGravelUnitWeight', inp.gravelUnitWeight || 1600);

  // Tanda en obra
  setVal('inputBatchVolume', inp.batchVolumeM3 || 0.15);
  setVal('inputBucketVolume', inp.bucketVolumeLiters || 19);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// Leer valores del formulario y depositarlos en AppState
function readFormIntoState() {
  const getFloat = (id, def = 0) => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) || def : def;
  };
  const getStr = (id, def = '') => {
    const el = document.getElementById(id);
    return el ? el.value : def;
  };

  AppState.currentInput.fc = getFloat('inputFc', 210);
  AppState.currentInput.stdDev = getFloat('inputStdDev', 0);
  AppState.currentInput.hasStandardDev = document.getElementById('checkStdDev')?.checked || false;
  AppState.currentInput.slumpCm = getFloat('inputSlumpCm', 8.0);
  AppState.currentInput.slumpPreset = getStr('inputSlumpPreset', 'vigas_columnas');
  AppState.currentInput.tmn = getStr('inputTmn', '3/4');

  const radioAir = document.getElementById('radioAir');
  AppState.currentInput.isAirEntrained = radioAir ? radioAir.checked : false;
  AppState.currentInput.airExposure = getStr('inputAirExposure', 'mild');

  AppState.currentInput.durabilityId = getStr('inputDurability', 'none');
  AppState.currentInput.useAdditive = document.getElementById('checkAdditive')?.checked || false;
  AppState.currentInput.waterReductionPct = getFloat('inputWaterReduction', 0);

  AppState.currentInput.cementDensity = getFloat('inputCementDensity', 3.15);
  AppState.currentInput.bagWeight = getFloat('inputBagWeight', 42.5);

  AppState.currentInput.sandDensity = getFloat('inputSandDensity', 2.65);
  AppState.currentInput.sandAbsorption = getFloat('inputSandAbsorption', 1.5);
  AppState.currentInput.sandMoisture = getFloat('inputSandMoisture', 4.0);
  AppState.currentInput.sandFineness = getFloat('inputSandFineness', 2.70);

  AppState.currentInput.gravelDensity = getFloat('inputGravelDensity', 2.68);
  AppState.currentInput.gravelAbsorption = getFloat('inputGravelAbsorption', 0.8);
  AppState.currentInput.gravelMoisture = getFloat('inputGravelMoisture', 1.5);
  AppState.currentInput.gravelUnitWeight = getFloat('inputGravelUnitWeight', 1600);

  AppState.currentInput.batchVolumeM3 = getFloat('inputBatchVolume', 0.15);
  AppState.currentInput.bucketVolumeLiters = getFloat('inputBucketVolume', 19);

  // Guardar en localStorage para persistencia
  try {
    localStorage.setItem('aci_current_state', JSON.stringify(AppState.currentInput));
  } catch (e) {}
}

// Ejecutar el motor de cálculo y actualizar todas las vistas
function runCalculation() {
  const calc = new AciMixCalculator(AppState.currentInput);
  const res = calc.calculate();
  AppState.lastResult = res;

  updateResultsSidebar(res);
  updateResultsTable(res);
  updateSiteBatchingTab(res);
  updateCalculationMemoryTab(res);
  renderCharts();
}

// Actualizar tarjeta lateral resumen
function updateResultsSidebar(res) {
  const isMpa = AppState.currentInput.unit === 'mpa';
  const fcrVal = isMpa ? `${res.step1.fcrMpa} MPa` : `${res.step1.fcrKg} kg/cm²`;

  setText('resRatioDry', res.step9.ratioDry.str);
  setText('resRatioWet', res.step9.ratioWet.str);
  setText('resFcr', fcrVal);
  setText('resWc', res.step4.finalWc.toFixed(3));
  setText('resWcGov', `(Por ${res.step4.governedBy})`);
  setText('resCement', `${res.step5.cementWeight} kg`);
  setText('resBags', `${res.step5.cementBags} bolsas de ${res.step5.bagWeight} kg`);
  setText('resEffectiveWater', `${res.step8.effectiveWater} L`);
  setText('resDesignWater', `${res.step3.designWater} L (diseño)`);

  // Actualizar quickbar en móvil
  setText('quickbarRatio', res.step9.ratioWet.str);
  setText('quickbarCement', `${res.step5.cementWeight} kg/m³ (${res.step5.cementBags} bols)`);

  // Alerta de durabilidad
  const alertBox = document.getElementById('durabilityAlertBox');
  if (alertBox) {
    if (res.step4.durabilityAlert) {
      alertBox.textContent = res.step4.durabilityAlert;
      alertBox.style.display = 'block';
    } else {
      alertBox.style.display = 'none';
    }
  }
}

// Actualizar tabla comparativa de materiales (Seco vs Húmedo / Volumen Absoluto)
function updateResultsTable(res) {
  const s3 = res.step3;
  const s5 = res.step5;
  const s6 = res.step6;
  const s7 = res.step7;
  const s8 = res.step8;

  // Cemento
  setText('tblCemDry', s5.cementWeight.toFixed(1));
  setText('tblCemVol', s7.volCement.toFixed(4));
  setText('tblCemWet', s5.cementWeight.toFixed(1));

  // Agua
  setText('tblWaterDry', s3.designWater.toFixed(1));
  setText('tblWaterVol', s7.volWater.toFixed(4));
  setText('tblWaterWet', s8.effectiveWater.toFixed(1));

  // Aire
  setText('tblAirVol', s7.volAir.toFixed(4));
  setText('tblAirPct', `${s3.airPct}%`);

  // Grava
  setText('tblGravelDry', s6.gravelDryWeight.toFixed(1));
  setText('tblGravelVol', s7.volGravel.toFixed(4));
  setText('tblGravelWet', s8.gravelWetWeight.toFixed(1));

  // Arena
  setText('tblSandDry', s7.sandDryWeight.toFixed(1));
  setText('tblSandVol', s7.volSand.toFixed(4));
  setText('tblSandWet', s8.sandWetWeight.toFixed(1));

  // Totales
  setText('tblTotalDry', s7.totalDryWeight.toFixed(1));
  setText('tblTotalVol', res.yieldM3.toFixed(4));
  setText('tblTotalWet', s8.totalWetWeight.toFixed(1));
}

// Actualizar Pestaña de Dosificación en Obra
function updateSiteBatchingTab(res) {
  const p = res.step9.perBag;
  const b = res.step9.batch;

  // Por saco
  setText('siteBagWeightTitle', `Por 1 Bolsa de Cemento (${p.bagWeight} kg)`);
  setText('siteBagCement', `${p.cementKg} kg (1 bolsa)`);
  setText('siteBagSandWet', `${p.wetSandKg} kg (${res.step9.sandBucketsPerBag} baldes de 19L)`);
  setText('siteBagGravelWet', `${p.wetGravelKg} kg (${res.step9.gravelBucketsPerBag} baldes de 19L)`);
  setText('siteBagWater', `${p.effectiveWaterLiters} L (${res.step9.waterBucketsPerBag} baldes de 19L)`);
  setText('siteBagRatio', res.step9.ratioWet.str);

  // Por Tanda
  setText('siteBatchVolTitle', `Tanda Personalizada (${b.volumeM3} m³)`);
  setText('siteBatchCement', `${b.cementKg} kg (~${b.cementBags} bolsas)`);
  setText('siteBatchSand', `${b.wetSandKg} kg (~${b.sandBuckets} baldes)`);
  setText('siteBatchGravel', `${b.wetGravelKg} kg (~${b.gravelBuckets} baldes)`);
  setText('siteBatchWater', `${b.effectiveWaterLiters} L (~${b.waterBuckets} baldes)`);

  // Por m3
  setText('siteM3Cement', `${res.step5.cementWeight} kg (${res.step5.cementBags} bolsas)`);
  setText('siteM3Sand', `${res.step8.sandWetWeight} kg`);
  setText('siteM3Gravel', `${res.step8.gravelWetWeight} kg`);
  setText('siteM3Water', `${res.step8.effectiveWater} L`);
}

// Actualizar Memoria de Cálculo Detallada con todas las fórmulas ACI
function updateCalculationMemoryTab(res) {
  const mem = document.getElementById('calcMemoryContainer');
  if (!mem) return;

  const isMpa = AppState.currentInput.unit === 'mpa';
  const fcText = isMpa ? `${res.step1.fcMpa} MPa` : `${res.step1.fcKg} kg/cm²`;
  const fcrText = isMpa ? `${res.step1.fcrMpa} MPa` : `${res.step1.fcrKg} kg/cm²`;

  let html = `
    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">1</span>
        <h3 class="memory-step-title">Resistencia Media Requerida (f'cr) - ACI 318 / 211</h3>
      </div>
      <p>Resistencia especificada: <strong>${fcText}</strong></p>
      <div class="formula-box">
        ${res.step1.formula}<br>
        Cálculo: ${res.step1.details}
      </div>
      <p>Resistencia de diseño obtenida: <strong>f'cr = ${fcrText}</strong></p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">2</span>
        <h3 class="memory-step-title">Asentamiento (Slump) y Tamaño Máximo Nominal (TMN)</h3>
      </div>
      <p>Revenimiento de diseño: <strong>${res.step2.slumpCm} cm (~${res.step2.slumpInches}")</strong></p>
      <p>Tamaño Máximo Nominal del agregado grueso: <strong>${res.step2.tmnLabel}</strong></p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">3</span>
        <h3 class="memory-step-title">Estimación del Agua de Mezclado y Aire (Tabla 6.3.3)</h3>
      </div>
      <p>Tipo de concreto: <strong>${res.step3.isAirEntrained ? 'Con Aire Incorporado' : 'Sin Aire Incorporado'}</strong></p>
      <p>Contenido de aire: <strong>${res.step3.airPct}%</strong></p>
      <div class="formula-box">
        Agua base por tabla ACI = ${res.step3.baseWater} L/m³
        ${res.step3.useAdditive ? `<br>Reducción por aditivo (${res.step3.waterReductionPct}%): -${res.step3.waterReductionLiters} L<br>Agua de diseño = ${res.step3.designWater} L/m³` : ''}
      </div>
      <p>Agua neta de diseño: <strong>${res.step3.designWater} L/m³</strong></p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">4</span>
        <h3 class="memory-step-title">Selección de la Relación Agua/Cemento (a/c) (Tablas 6.3.4(a) y 6.3.4(b))</h3>
      </div>
      <div class="formula-box">
        a/c por Resistencia (f'cr = ${fcrText}) = ${res.step4.wcStrength.toFixed(3)}<br>
        a/c máxima por Durabilidad (${res.step4.durabilityCondition.label}) = ${res.step4.wcDurability.toFixed(3)}<br>
        a/c de diseño = min(a/c resistencia, a/c durabilidad) = ${res.step4.finalWc.toFixed(3)}
      </div>
      <p>La relación a/c queda gobernada por: <strong>${res.step4.governedBy} (a/c = ${res.step4.finalWc.toFixed(3)})</strong></p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">5</span>
        <h3 class="memory-step-title">Cálculo del Contenido de Cemento</h3>
      </div>
      <div class="formula-box">
        Cemento = Agua / (a/c) = ${res.step3.designWater} / ${res.step4.finalWc.toFixed(3)} = ${res.step5.cementWeight} kg/m³<br>
        Bolsas (${res.step5.bagWeight} kg) = ${res.step5.cementWeight} / ${res.step5.bagWeight} = ${res.step5.cementBags} bolsas
      </div>
      <p>Contenido de cemento: <strong>${res.step5.cementWeight} kg/m³ (${res.step5.cementBags} bolsas/m³)</strong></p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">6</span>
        <h3 class="memory-step-title">Estimación del Agregado Grueso (Grava) (Tabla 6.3.6)</h3>
      </div>
      <p>Módulo de Finura de la arena: <strong>${res.step6.finenessModulus}</strong> | PVCS Grava: <strong>${res.step6.gravelUnitWeight} kg/m³</strong></p>
      <div class="formula-box">
        Factor b/b0 (Tabla 6.3.6) = ${res.step6.b_b0_ratio}<br>
        Peso seco Grava = (b/b0) · PVCS = ${res.step6.b_b0_ratio} · ${res.step6.gravelUnitWeight} = ${res.step6.gravelDryWeight} kg/m³<br>
        Volumen absoluto Grava = ${res.step6.gravelDryWeight} / (${res.step6.gravelDensity} · 1000) = ${res.step6.gravelAbsVolume.toFixed(4)} m³
      </div>
      <p>Grava seca: <strong>${res.step6.gravelDryWeight} kg/m³</strong> (Volumen: ${res.step6.gravelAbsVolume.toFixed(4)} m³)</p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">7</span>
        <h3 class="memory-step-title">Estimación del Agregado Fino (Arena) - Método Volúmenes Absolutos</h3>
      </div>
      <div class="formula-box">
        Volumen de Agua = ${res.step3.designWater} / 1000 = ${res.step7.volWater.toFixed(4)} m³<br>
        Volumen de Cemento = ${res.step5.cementWeight} / (${AppState.currentInput.cementDensity} · 1000) = ${res.step7.volCement.toFixed(4)} m³<br>
        Volumen de Aire = ${res.step3.airPct} / 100 = ${res.step7.volAir.toFixed(4)} m³<br>
        Volumen de Grava = ${res.step7.volGravel.toFixed(4)} m³<br>
        Suma de volúmenes conocidos = ${res.step7.sumKnownVolumes.toFixed(4)} m³<br>
        Volumen de Arena = 1.0000 - ${res.step7.sumKnownVolumes.toFixed(4)} = ${res.step7.volSand.toFixed(4)} m³<br>
        Peso seco Arena = ${res.step7.volSand.toFixed(4)} · (${res.step7.sandDensity} · 1000) = ${res.step7.sandDryWeight} kg/m³
      </div>
      <p>Arena seca: <strong>${res.step7.sandDryWeight} kg/m³</strong> (Volumen: ${res.step7.volSand.toFixed(4)} m³)</p>
    </div>

    <div class="memory-step">
      <div class="memory-step-header">
        <span class="step-number">8</span>
        <h3 class="memory-step-title">Corrección por Humedad y Absorción de Agregados</h3>
      </div>
      <div class="formula-box">
        Arena húmeda (${res.step8.sandMoisture}%): ${res.step7.sandDryWeight} · (1 + ${res.step8.sandMoisture}/100) = ${res.step8.sandWetWeight} kg/m³<br>
        Grava húmeda (${res.step8.gravelMoisture}%): ${res.step6.gravelDryWeight} · (1 + ${res.step8.gravelMoisture}/100) = ${res.step8.gravelWetWeight} kg/m³<br>
        Aporte libre Arena (${res.step8.sandMoisture}% - ${res.step8.sandAbsorption}%): ${res.step8.sandFreeWater >= 0 ? '+' : ''}${res.step8.sandFreeWater} L<br>
        Aporte libre Grava (${res.step8.gravelMoisture}% - ${res.step8.gravelAbsorption}%): ${res.step8.gravelFreeWater >= 0 ? '+' : ''}${res.step8.gravelFreeWater} L<br>
        Aporte total de agua libre = ${res.step8.totalFreeWater >= 0 ? '+' : ''}${res.step8.totalFreeWater} L<br>
        Agua efectiva a añadir = ${res.step3.designWater} - (${res.step8.totalFreeWater}) = ${res.step8.effectiveWater} L/m³
      </div>
      <p>Agua real de mezclado corregida: <strong>${res.step8.effectiveWater} L/m³</strong></p>
    </div>
  `;

  mem.innerHTML = html;
}

// Renderizar gráficos SVG reactivos e interactivos
function renderCharts() {
  const res = AppState.lastResult;
  if (!res) return;

  const pieBox = document.getElementById('svgPieChart');
  const barBox = document.getElementById('svgBarChart');

  if (pieBox) {
    // Gráfico de torta de volúmenes absolutos
    const vCem = res.step7.volCement;
    const vWater = res.step7.volWater;
    const vAir = res.step7.volAir;
    const vSand = res.step7.volSand;
    const vGravel = res.step7.volGravel;
    const total = vCem + vWater + vAir + vSand + vGravel;

    const data = [
      { name: 'Cemento', val: vCem, color: '#64748b' },
      { name: 'Agua', val: vWater, color: '#0284c7' },
      { name: 'Aire', val: vAir, color: '#94a3b8' },
      { name: 'Arena', val: vSand, color: '#d97706' },
      { name: 'Grava', val: vGravel, color: '#334155' }
    ];

    let currentAngle = 0;
    const cx = 130, cy = 130, r = 100;
    let paths = '';

    data.forEach(item => {
      const angle = (item.val / total) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(currentAngle);
      const y1 = cy + r * Math.sin(currentAngle);
      const x2 = cx + r * Math.cos(currentAngle + angle);
      const y2 = cy + r * Math.sin(currentAngle + angle);
      const largeArc = angle > Math.PI ? 1 : 0;

      const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      const pct = ((item.val / total) * 100).toFixed(1);
      paths += `<path d="${pathData}" fill="${item.color}" stroke="#ffffff" stroke-width="2">
        <title>${item.name}: ${item.val.toFixed(4)} m³ (${pct}%)</title>
      </path>`;

      currentAngle += angle;
    });

    // Donut hole
    paths += `<circle cx="${cx}" cy="${cy}" r="45" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />`;
    paths += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">1.0 m³</text>`;
    paths += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#64748b">Concreto</text>`;

    pieBox.innerHTML = `
      <svg width="260" height="260" viewBox="0 0 260 260">
        ${paths}
      </svg>
    `;
  }

  if (barBox) {
    // Gráfico comparativo de barras (Seco vs Húmedo)
    const dry = [
      { name: 'Cemento', val: res.step5.cementWeight },
      { name: 'Agua', val: res.step3.designWater },
      { name: 'Arena', val: res.step7.sandDryWeight },
      { name: 'Grava', val: res.step6.gravelDryWeight }
    ];

    const wet = [
      { name: 'Cemento', val: res.step5.cementWeight },
      { name: 'Agua', val: res.step8.effectiveWater },
      { name: 'Arena', val: res.step8.sandWetWeight },
      { name: 'Grava', val: res.step8.gravelWetWeight }
    ];

    const maxVal = Math.max(...wet.map(d => d.val), 1200);
    const chartHeight = 180;
    const chartWidth = 320;

    let barsHtml = '';
    const barWidth = 24;
    const groupGap = 72;
    const startX = 35;

    dry.forEach((item, idx) => {
      const gx = startX + idx * groupGap;
      const hDry = (item.val / maxVal) * chartHeight;
      const hWet = (wet[idx].val / maxVal) * chartHeight;
      const yDry = chartHeight - hDry + 20;
      const yWet = chartHeight - hWet + 20;

      barsHtml += `
        <!-- Barra Seca -->
        <rect x="${gx}" y="${yDry}" width="${barWidth}" height="${hDry}" rx="3" fill="#94a3b8">
          <title>${item.name} Seco: ${item.val.toFixed(1)} kg</title>
        </rect>
        <text x="${gx + barWidth/2}" y="${yDry - 4}" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">${Math.round(item.val)}</text>

        <!-- Barra Húmeda -->
        <rect x="${gx + barWidth + 4}" y="${yWet}" width="${barWidth}" height="${hWet}" rx="3" fill="#2563eb">
          <title>${item.name} Húmedo: ${wet[idx].val.toFixed(1)} kg</title>
        </rect>
        <text x="${gx + barWidth + 4 + barWidth/2}" y="${yWet - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="#1d4ed8">${Math.round(wet[idx].val)}</text>

        <!-- Etiqueta Material -->
        <text x="${gx + barWidth + 2}" y="${chartHeight + 35}" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">${item.name}</text>
      `;
    });

    barBox.innerHTML = `
      <svg width="${chartWidth}" height="230" viewBox="0 0 ${chartWidth} 230">
        <!-- Grid baseline -->
        <line x1="20" y1="${chartHeight + 20}" x2="${chartWidth - 10}" y2="${chartHeight + 20}" stroke="#cbd5e1" stroke-width="1.5" />
        ${barsHtml}
      </svg>
    `;
  }
}

// Helpers de texto en DOM
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// Gestión de Proyectos Guardados en LocalStorage
function loadSavedProjects() {
  try {
    const raw = localStorage.getItem('aci_saved_projects');
    AppState.savedProjects = raw ? JSON.parse(raw) : [];
  } catch (e) {
    AppState.savedProjects = [];
  }
  renderSavedProjectsList();
}

function renderSavedProjectsList() {
  const list = document.getElementById('savedProjectsList');
  if (!list) return;

  if (AppState.savedProjects.length === 0) {
    list.innerHTML = `<p class="helper-text" style="text-align:center; padding: 2rem;">No tienes mezclas guardadas aún. Realiza un cálculo y haz clic en "Guardar Mezcla Actual".</p>`;
    return;
  }

  let html = '';
  AppState.savedProjects.forEach((proj, idx) => {
    html += `
      <div class="card" style="margin-bottom: 0.75rem;">
        <div class="card-body" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; padding: 0.85rem 1.25rem;">
          <div>
            <h4 style="font-size: 0.95rem; font-weight:700; color:#0f172a;">${proj.name}</h4>
            <div style="font-size: 0.75rem; color:#64748b;">
              f'c: ${proj.input.fc} ${proj.input.unit === 'mpa' ? 'MPa' : 'kg/cm²'} | Slump: ${proj.input.slumpCm} cm | TMN: ${proj.input.tmn}" | Fecha: ${proj.date}
            </div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="loadProject(${idx})">Cargar</button>
            <button class="btn btn-outline btn-sm" style="color:#ef4444;" onclick="deleteProject(${idx})">Eliminar</button>
          </div>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function promptSaveProject() {
  const name = prompt('Nombre para identificar este diseño de mezcla (ej: Zapata Bloque A):', `Mezcla f'c ${AppState.currentInput.fc} - ${new Date().toLocaleDateString()}`);
  if (!name || name.trim() === '') return;

  const project = {
    id: Date.now().toString(),
    name: name.trim(),
    date: new Date().toLocaleString(),
    input: Object.assign({}, AppState.currentInput)
  };

  AppState.savedProjects.unshift(project);
  localStorage.setItem('aci_saved_projects', JSON.stringify(AppState.savedProjects));
  renderSavedProjectsList();
  alert('¡Diseño guardado exitosamente!');
}

window.loadProject = function(idx) {
  const proj = AppState.savedProjects[idx];
  if (!proj) return;
  AppState.currentInput = Object.assign({}, proj.input);
  syncFormFromState();
  runCalculation();
  // Regresar a la pestaña principal
  document.querySelector('.nav-tab[data-tab="tab-calc"]')?.click();
};

window.deleteProject = function(idx) {
  if (confirm('¿Estás seguro de eliminar esta mezcla guardada?')) {
    AppState.savedProjects.splice(idx, 1);
    localStorage.setItem('aci_saved_projects', JSON.stringify(AppState.savedProjects));
    renderSavedProjectsList();
  }
};

function exportProjectJson() {
  const exportData = {
    app: 'Calculadora Mezclas ACI 211.1',
    exportDate: new Date().toISOString(),
    currentDesign: AppState.currentInput,
    calculationResult: AppState.lastResult,
    allSavedProjects: AppState.savedProjects
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `Mezcla_ACI_${AppState.currentInput.fc}_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importProjectJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.currentDesign) {
        AppState.currentInput = data.currentDesign;
        if (Array.isArray(data.allSavedProjects)) {
          AppState.savedProjects = data.allSavedProjects;
          localStorage.setItem('aci_saved_projects', JSON.stringify(AppState.savedProjects));
          renderSavedProjectsList();
        }
        syncFormFromState();
        runCalculation();
        alert('¡Datos importados con éxito!');
      } else {
        alert('Archivo JSON no compatible');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON');
    }
  };
  reader.readAsText(file);
}
