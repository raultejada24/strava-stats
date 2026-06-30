# Training Dashboard

![Captura del dashboard](public/image.png)

Panel personal para ver tus estadísticas de entrenamiento: actividades con mapa GPS, zonas de FC, fitness (CTL/ATL/TSB), récords, análisis de rendimiento y más.

Los datos se leen desde el **export gratuito de Strava** — sin suscripción, sin API de pago. La app corre entera en local: no hay servidor, no hay base de datos.

---

## Qué necesitas

| Programa | Versión mínima | Comprobar |
|----------|----------------|-----------|
| **Node.js** | v18 | `node --version` |
| **Python** | v3.10 | `python --version` |

> **¿No los tienes?** Node.js: [nodejs.org](https://nodejs.org) → LTS. Python: [python.org/downloads](https://python.org/downloads).

---

## Guía rápida

### 1. Pedir el export de Strava

Strava te deja descargar todo tu historial gratis, sin API ni contraseñas:

1. Abre Strava en el navegador → haz clic en tu foto de perfil → **Ajustes**.
2. En el menú lateral, entra en **"Mi cuenta"** → **"Descargar o eliminar tu cuenta"**.
3. Pulsa **"Obtener archivo"** → confirma con tu contraseña → **"Solicitar mis archivos"**.
4. Recibirás un email de Strava (puede tardar desde minutos hasta unas horas).
5. Descarga el `.zip` y guárdalo en la carpeta del proyecto.

El ZIP contiene un `activities.csv` con todos tus entrenamientos más los archivos `.fit` / `.gpx` con los tracks GPS.

---

### 2. Instalar dependencias de Python

```bash
pip install -r fetch/requirements.txt
```

Solo hace falta la primera vez.

---

### 3. Configurar el .env

Abre el fichero `.env` en la raíz del proyecto y pon la ruta a tu ZIP:

```env
STRAVA_EXPORT_PATH=./export_57633915.zip
```

Cambia `export_57633915.zip` por el nombre real de tu archivo.

---

### 4. Procesar el export

```bash
python fetch/sync.py
```

El script lee el ZIP, parsea los archivos `.fit` / `.gpx` y genera los JSON en `public/data/`. Las actividades ya procesadas se guardan en caché, así que las ejecuciones siguientes son rápidas.

**Opciones útiles:**

```bash
# Solo las últimas 50 (para prueba rápida)
python fetch/sync.py --limit 50

# Solo actividades desde una fecha
python fetch/sync.py --since 2024-01-01

# Sin tracks GPS (más rápido, no hay mapa de ruta)
python fetch/sync.py --no-gpx
```

---

### 5. Instalar dependencias de la app

```bash
npm install
```

Solo hace falta la primera vez.

---

### 6. Abrir la app

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

> **Auto-sync:** cada vez que arranques `npm run dev`, el servidor procesa automáticamente en segundo plano las actividades nuevas que haya en el ZIP pero no estén aún en caché. No hace falta ejecutar `sync.py` manualmente.

---

## Actualizar con nuevas actividades

Cuando tengas nuevos entrenamientos que añadir:

1. Pide un nuevo export de Strava (paso 1) y descarga el ZIP.
2. Sustituye el ZIP antiguo por el nuevo (o cambia `STRAVA_EXPORT_PATH` en `.env`).
3. Ejecuta `python fetch/sync.py` — solo procesará las actividades nuevas.

---

## Ajustes de la app

En la barra lateral → **Ajustes** puedes configurar:

| Ajuste | Para qué sirve |
|--------|----------------|
| **FC Máxima** | Cálculo de zonas Z1–Z5 |
| **FTP** (ciclismo) | TSS e Intensity Factor en ciclismo |
| **FC y ritmo umbral** (running) | TSS de running |

Los ajustes se guardan en tu navegador y afectan retroactivamente a todos los cálculos de zonas y TSS.

---

## Tooltips de métricas

Cada métrica tiene un pequeño botón `i` al lado. Haz clic para ver:

- Qué mide exactamente
- Fórmula de cálculo
- Rangos de referencia

---

## Qué datos tiene la app

| Sección | Qué muestra |
|---------|-------------|
| **Dashboard** | VO2Max, CTL/ATL/TSB, racha, volumen por deporte, resumen semanal, zonas FC, últimas actividades |
| **Actividades** | Lista completa con filtros por deporte y búsqueda |
| **Detalle** | Mapa GPS, laps, gráfico de FC, métricas completas |
| **Análisis Fitness** | Evolución CTL/ATL/TSB en el tiempo |
| **Zonas FC** | Distribución de tiempo por zona (Z1–Z5) |
| **Récords** | Mejores marcas por deporte y distancia |
| **Rendimiento** | Eficiencia aeróbica, cadencia, tendencia VO2Max, carga semanal, consistencia |

---

## Privacidad

Estos ficheros contienen datos personales y **no se suben a GitHub** (ya están en `.gitignore`):

| Fichero | Contenido |
|---------|-----------|
| `.env` | Ruta al export (sin credenciales) |
| `public/data/` | Actividades procesadas, GPS, FC |
| `export_*.zip` | El export bruto de Strava |

---

## Comandos de referencia

```bash
npm run dev          # Inicia la app (+ sync automático en segundo plano)
npm run build        # Genera versión optimizada en dist/
npm run lint         # Revisa el código

python fetch/sync.py                        # Procesa el export completo
python fetch/sync.py --limit 50             # Solo las 50 más recientes
python fetch/sync.py --since 2024-01-01     # Desde una fecha
python fetch/sync.py --no-gpx               # Sin GPS (más rápido)
```

---

## Problemas frecuentes

**"ERROR: Pass --export ... or set STRAVA_EXPORT_PATH"**
→ Abre `.env` y asegúrate de que `STRAVA_EXPORT_PATH` apunta al ZIP correcto.

**"ERROR: export.zip does not exist"**
→ La ruta del ZIP no es correcta. Usa ruta absoluta si la relativa no funciona.

**La app muestra "Sin datos"**
→ Ejecuta `python fetch/sync.py` antes de abrir la app. Los JSON deben estar en `public/data/`.

**Puerto 5173 ya en uso**
→ Cierra otras terminales con `npm run dev` activo, o Vite usará el siguiente puerto libre automáticamente.
