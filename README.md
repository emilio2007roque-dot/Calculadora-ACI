# 🏗️ Calculadora de Mezclas de Concreto - Método ACI 211.1

Aplicación Web Progresiva (**PWA**) profesional y de alta precisión para el diseño y dosificación de mezclas de concreto según las normas **ACI 211.1** (Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete) y **ACI 318** (Requisitos de durabilidad y resistencia).

Diseñada para funcionar en **PC** y en **teléfonos móviles (Android e iOS)** con capacidad de trabajo **100% Offline** (sin conexión a internet).

---

## 🚀 Inicio Rápido

### En tu Computadora (PC):
1. Haz doble clic en el archivo **`INICIAR_APP.bat`** (o ejecuta `npm start` en tu terminal).
2. Se abrirá automáticamente tu navegador en `http://localhost:3000`.
3. *(Opcional)* También puedes abrir directamente el archivo `index.html` en cualquier navegador sin necesidad de servidor.

### En tu Celular (Android / iPhone):
1. Asegúrate de que tu celular esté conectado a la **misma red Wi-Fi** que tu PC.
2. En la app abierta en tu PC, haz clic en el botón superior **📱 En Celular** para ver el código QR.
3. Escanea el QR con tu cámara o abre el navegador en tu teléfono e ingresa a:
   ```text
   http://192.168.0.42:3000
   ```
4. **Instálala como App:**
   - **En Android:** Toca los 3 puntos de Chrome y elige *"Agregar a la pantalla principal"* o *"Instalar aplicación"*.
   - **En iPhone:** Toca el botón de Compartir en Safari y selecciona *"Añadir a pantalla de inicio"*.
5. ¡Listo! La tendrás como una aplicación en tu pantalla de inicio que abre a pantalla completa y funciona en obra sin internet.

---

## 📋 Características Principales

1. **Flujo Normativo ACI 211.1 Completo:**
   - **Paso 1:** Elección de $f'_c$ y cálculo de resistencia media requerida $f'_{cr}$ (con desviación estándar o tablas de incremento ACI 318).
   - **Paso 2:** Selección de revenimiento (slump) según elemento estructural y tamaño máximo nominal (TMN de 3/8" a 3").
   - **Paso 3:** Estimación de agua de mezclado y contenido de aire atrapado/incluido (Tabla 6.3.3) con soporte para aditivos plastificantes (% reducción de agua).
   - **Paso 4:** Determinación de la relación agua/cemento ($a/c$) por resistencia (interpolación lineal exacta) y por durabilidad (congelación, sulfatos, agua de mar, baja permeabilidad).
   - **Paso 5:** Contenido de cemento en $kg/m^3$ y en bolsas (conmutador de sacos de **42.5 kg** o **50 kg**).
   - **Paso 6:** Estimación de grava por volumen seco compactado (factor $b/b_0$ interpolado según el Módulo de Finura de la arena de 2.40 a 3.00).
   - **Paso 7:** Contenido de arena por el **Método de los Volúmenes Absolutos** (y comparativa por método de pesos).
   - **Paso 8:** **Corrección por Humedad y Absorción de Agregados** (cálculo de agua libre real y pesos húmedos de obra).

2. **Dosificación en Obra Práctica:**
   - Cantidades por **1 bolsa de cemento** (en peso y en baldes de 19 L / 5 galones).
   - Calculadora de tanda para mezcladora tipo trompito (volumen personalizable, ej. 0.15 $m^3$).
   - Cantidades por metro cúbico ($1\text{ m}^3$).

3. **Memoria de Cálculo Técnico:**
   - Detalle matemático de cada paso con fórmulas explícitas y sustitución numérica listo para presentar a supervisión técnica.

4. **Gráficos Vectoriales Integrados (SVG):**
   - Gráfico de torta con la composición volumétrica de $1\text{ m}^3$ de concreto.
   - Gráfico de barras comparativo de pesos secos de laboratorio vs. pesos húmedos de obra.

5. **Guardado y Exportación:**
   - Guarda tus mezclas localmente en tu dispositivo.
   - Exporta e importa respaldos en formato `.json`.
   - Botón de **Imprimir / Exportar a PDF** con plantilla limpia adaptada a hojas de cálculo de ingeniería.

---

## 📂 Estructura del Proyecto

```text
Calculadora de Mezclas/
├── index.html              # Interfaz principal responsive
├── manifest.webmanifest    # Manifiesto para instalación como PWA
├── sw.js                   # Service Worker (Caché y funcionamiento Offline)
├── server.js               # Servidor local con detección de IP de red
├── INICIAR_APP.bat         # Acceso directo para Windows
├── package.json            # Configuración de dependencias
├── css/
│   └── styles.css          # Estilos profesionales y hoja de impresión
├── js/
│   ├── aci-data.js         # Tablas normalizadas ACI e interpolación
│   ├── calculator.js       # Motor de cálculo matemático ACI 211.1
│   └── app.js              # Controlador, gráficos y persistencia
└── icons/
    ├── icon-192.png        # Icono PWA 192x192
    ├── icon-512.png        # Icono PWA 512x512
    ├── icon-192.svg        # Vectorial 192px
    └── icon-512.svg        # Vectorial 512px
```

---

## 📦 ¿Cómo empaquetar como APK o EXE en el futuro?

Si más adelante necesitas un archivo `.apk` o `.exe` para distribuir:
- **Para APK (Android):** Puedes usar [PWABuilder](https://www.pwabuilder.com/) ingresando la URL o empaquetando con Capacitor (`npx cap init`, `npx cap add android`).
- **Para EXE (Windows):** Puedes envolver la carpeta en Electron o Tauri ejecutando `npx electron .` o instalando el navegador Edge / Chrome que crea el acceso directo en el escritorio.
