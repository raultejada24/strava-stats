# Training Dashboard

![Captura del dashboard](public/image.png)

Panel personal para ver tus estadísticas de entrenamiento: actividades, zonas de FC, fitness (CTL/ATL/TSB), VO2Max, récords y más.

Los datos se sincronizan desde **Intervals.icu** (gratis, conecta con Strava automáticamente) y se guardan en JSON locales. No hay servidor en la nube ni base de datos.

---

## Qué necesitas

| Programa | Versión | Comprobar |
|----------|---------|-----------|
| **Node.js** | v18 o superior | `node --version` |
| **Python** | v3.10 o superior | `python --version` |
| **Cuenta de Intervals.icu** | gratuita | [intervals.icu](https://intervals.icu) |

> **Node.js:** [nodejs.org](https://nodejs.org) → descarga LTS.  
> **Python:** [python.org/downloads](https://python.org/downloads) → en Mac/Linux suele venir instalado.

---

## Guía rápida

### 1. Descargar el proyecto

```bash
cd ruta/donde/está/training-dashboard
```

---

### 2. Conectar Intervals.icu con Strava

Intervals.icu se sincroniza con tu Strava automáticamente y tiene API gratuita. Una vez conectado, no necesitas descargar ningún ZIP.

1. Ve a [intervals.icu](https://intervals.icu) y crea una cuenta gratuita.
2. En el panel de Intervals.icu, haz clic en **"Connect Strava"** (aparece en el onboarding o en Settings → Connections). Tus actividades se importarán solas.

---

### 3. Obtener tu API key y athlete ID

Necesitas dos datos de tu cuenta de Intervals.icu:

#### Athlete ID

Está visible en la **URL** cuando abres Intervals.icu:

```
https://intervals.icu/athlete/i123456
                                ^^^^^^
                          Este es tu athlete ID
```

Por ejemplo: `i57633915`, `i12345`, etc. Siempre empieza por `i`.

#### API Key

1. En Intervals.icu, haz clic en tu foto de perfil (esquina superior derecha) → **Settings**.
2. Desplázate hasta el final de la página hasta la sección **"API Access"**.
3. Copia el valor del campo **"API Key"**.

---

### 4. Configurar el .env

Copia el fichero de ejemplo y rellénalo con tus datos:

```bash
cp .env.example .env
```

Abre `.env` y sustituye los valores:

```env
INTERVALS_ATHLETE_ID=i123456          ← tu athlete ID (de la URL)
INTERVALS_API_KEY=tu_api_key_aqui     ← tu API key (Settings → API Access)
```

> El fichero `.env` nunca se sube a GitHub (ya está en `.gitignore`). Es solo tuyo.

---

### 5. Instalar dependencias de Python

```bash
cd fetch
pip install -r requirements.txt
cd ..
```

---

### 6. Sincronizar los datos

```bash
python fetch/intervals_sync.py
```

La primera vez descarga todas las actividades del último año. Para pruebas rápidas:

```bash
python fetch/intervals_sync.py --limit 30
```

**Opciones disponibles:**

```bash
# Solo actividades desde una fecha concreta
python fetch/intervals_sync.py --since 2024-01-01

# Las 50 más recientes
python fetch/intervals_sync.py --limit 50

# Sin descargar laps (más rápido)
python fetch/intervals_sync.py --no-laps
```

> El script guarda cada actividad en `public/data/`. La segunda vez que lo ejecutes, las actividades que ya existan se saltan automáticamente (caché).

---

### 7. Instalar dependencias de la app

```bash
npm install
```

Solo hace falta la primera vez.

---

### 8. Abrir la app

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

---

## Actualizar con nuevos entrenamientos

Cada vez que hagas nuevas actividades en Strava (Intervals.icu las importa automáticamente), ejecuta:

```bash
python fetch/intervals_sync.py --since 2024-01-01
```

O sin `--since` para descargar todo lo que falte. Las actividades ya procesadas no se vuelven a descargar.

---

## Ajustes de la app

En la barra lateral, entra en **Ajustes** para configurar:

- **FC Máxima** — para el cálculo de zonas Z1-Z5
- **FTP** (ciclismo) — para el cálculo de TSS e IF
- **FC y ritmo en umbral** (running) — para TSS de running

Se guardan en tu navegador y afectan retroactivamente a todos los cálculos.

---

## Tooltips de métricas

Cada métrica del dashboard tiene un pequeño botón `i` al lado. Haz clic para ver:
- Qué mide exactamente esa métrica
- Cómo se calcula (fórmula)
- Rangos de referencia

---

## Qué datos proporciona Intervals.icu

| Dato | Disponible |
|------|-----------|
| Nombre, deporte, fecha | ✓ |
| Distancia, duración, elevación | ✓ |
| FC media y máxima | ✓ |
| Potencia media y normalizada | ✓ (si tienes potenciómetro) |
| Cadencia | ✓ |
| Calorías | ✓ |
| **TSS real** (calculado por Intervals.icu) | ✓ |
| **VO2Max** estimado | ✓ |
| Training Effect aeróbico/anaeróbico | ✓ (si usas Garmin) |
| Historial CTL/ATL/TSB | ✓ |
| **Track GPS / mapa** | ✗ (ver nota) |

> **Nota sobre GPS:** Intervals.icu no almacena los tracks GPS. Si necesitas los mapas de ruta, usa el export de Strava (ZIP) con `fetch/sync.py`. Los dos scripts son compatibles — puedes usar `intervals_sync.py` para las métricas y `sync.py` para enriquecer el GPS.

---

## Estructura del proyecto

```
training-dashboard/
├── .env                        ← Tus credenciales (NO subir a GitHub)
├── fetch/
│   ├── intervals_sync.py       ← Sync principal desde Intervals.icu
│   ├── sync.py                 ← Sync alternativo desde export ZIP de Strava
│   ├── normalizer.py           ← Mapeo de datos al formato de la app
│   ├── fit_reader.py           ← Parseo de archivos .fit / .gpx
│   └── requirements.txt        ← Dependencias Python
├── public/
│   └── data/                   ← Datos JSON (NO subir a GitHub)
└── src/                        ← Código de la app (React + TypeScript)
```

---

## Privacidad

Estos ficheros contienen datos personales y **no se suben a GitHub** (ya están en `.gitignore`):

| Fichero | Contenido |
|---------|-----------|
| `.env` | Tus credenciales de Intervals.icu |
| `public/data/` | Actividades procesadas, GPS, FC, etc. |
| `export_*.zip` | El export bruto de Strava (si lo usas) |

Antes de hacer `git push`, comprueba con `git status` que no aparezca ninguno de estos ficheros.

---

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia la app en modo desarrollo |
| `npm run build` | Genera versión optimizada en `dist/` |
| `npm run lint` | Revisa el código |
| `python fetch/intervals_sync.py` | Sincroniza datos de Intervals.icu |
| `python fetch/sync.py --export export.zip` | Sincroniza desde export ZIP de Strava |

---

## Problemas frecuentes

### "ERROR: Faltan INTERVALS_ATHLETE_ID o INTERVALS_API_KEY en el .env"
Revisa el paso 3 y 4. Asegúrate de que el fichero se llama `.env` (con el punto) y no `.env.example`.

### "ERROR: API key inválida o athlete ID incorrecto"
Comprueba que el athlete ID empieza por `i` (ej: `i57633915`) y que la API key es exactamente la que aparece en Settings → API Access.

### La app muestra "Sin datos"
Ejecuta primero `python fetch/intervals_sync.py`. Los datos deben estar en `public/data/` antes de abrir la app.

### Puerto 5173 ya en uso
Cierra otras ventanas donde tengas `npm run dev` abierto, o Vite usará automáticamente el siguiente puerto disponible.
