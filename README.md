# Livo – Winter Plan (Plan de Invierno)

Este README resume el contexto de producto y define cómo debe funcionar la **página web mobile** que se incrustará como WebView dentro de la app de Livo para el Plan de Invierno.

El objetivo:  
1. Mostrar una pantalla de introducción al plan.  
2. Mostrar un calendario con los **turnos propuestos** para el profesional tras procesar su disponibilidad.  
3. Permitir ver el detalle de cada turno, solicitarlo o rechazarlo, y consultar la política de cancelación.

---

## 1. Contexto general

- El flujo vive en **web mobile only** (375–430 px de ancho aprox.).  
- Se abrirá desde la app de Livo como una **URL** en un WebView.  
- El profesional ya ha hecho el flujo de “Comenzar a escribir la disponibilidad” en la app nativa.  
- Pasados **15 minutos** se ejecuta un proceso en backend que calcula los turnos propuestos.  
- Esta web solo **lee información** (no calcula el plan). Envía acciones simples: solicitar turno, rechazarlo, enviar feedback.

La app nativa nos pasará al menos:
- `professionalId`
- `authToken` (o similar) para consumir la API
- opcionalmente `month` / `year` si se quiere fijar un mes concreto

---

## 2. Páginas / pantallas

### 2.1. Pantalla 1 – Home “Planifica tu Invierno”

Ruta sugerida: `/winter-plan`  

Elementos principales (de arriba a abajo):

1. **Header**
   - Título: `🎄 Planifica tu Invierno 🎄`
   - Subtítulo: `Turnos en Diciembre y Enero`
   - Icono de información (`i`) en la esquina superior derecha que abre la pantalla de “Explicación Plan”.

2. **Texto introductorio**
   - Párrafos explicando que Livo prepara un plan de turnos según preferencias del profesional.
   - Copys fijos (texto estático, en castellano, idéntico al de Figma).

3. **Pasos numerados**
   1. `Marca tus días libres` – El profesional indica qué días puede trabajar.
   2. `Te preparamos tu plan` – Livo genera una propuesta de turnos.
   3. `Confirma y listo` – El enfermero revisa y solicita los turnos que le encajen.

4. **Botón principal**
   - Texto: `Preparar mi plan`
   - Acción: abrir una URL externa (placeholder), p. ej. `https://placeholder.livo.app/disponibilidad`.
   - Esta URL será sustituida más adelante por el flujo real de disponibilidad.

5. **Carta de agradecimiento**
   - Bloque visual con fondo tipo papel y texto de agradecimiento (copys del Figma).
   - Contenido totalmente estático.

6. **Calendario bloqueado**
   - Título: `Tus turnos de Invierno`
   - Icono de candado.
   - Texto: `Aquí aparecerá tu Plan de invierno`.
   - Debajo se muestra una **vista de calendario desenfocada / con overlay gris** simulando diciembre (imagen o componente con opacidad reducida).
   - No hay interacción: es puramente visual, para indicar que el calendario se desbloqueará cuando el plan esté listo.

7. **Botón “Preparar mi plan” (repetido)**
   - Mismo comportamiento que el botón superior.

#### 2.1.1. Pantalla “Explicación Plan”

Ruta sugerida: `/winter-plan/info`  

- Se abre al pulsar el icono `i` de la pantalla principal.  
- Contenido: preguntas y respuestas del Figma, por ejemplo:
  - “¿Qué tengo que hacer para entrar en el plan de invierno?”
  - “¿Cómo recibiré mis turnos?”
  - “¿Tengo que aceptar todos los turnos que me proponéis?”
- Un enlace en el texto (`1 de Diciembre`) puede ser un simple link HTML (placeholder) o texto estático.
- Botón o icono back para volver a `/winter-plan`.

---

### 2.2. Pantalla 2 – Calendario con turnos propuestos

Una vez el profesional ha enviado su disponibilidad y el backend ha generado el plan (a los ~15 minutos), cuando vuelve a entrar en el Plan de Invierno se le muestra directamente el calendario con sus turnos.

Ruta sugerida: `/winter-plan/calendar`  

1. **Header**
   - Título: `🎄 Aquí está tu Calendario 🎄`
   - Subtítulo: `Turnos en Diciembre y Enero`.

2. **Texto introductorio**
   - Mensaje corto explicando que ese invierno Livo ha preparado los turnos según sus preferencias.

3. **Selector de mes**
   - Muestra el mes actual del plan, p. ej. `Diciembre 2025`.
   - Flechas izquierda/derecha para navegar (mínimo diciembre y enero).
   - El estado de navegación se guarda en el front.

4. **Calendario mensual**
   - Vista grid (7 columnas, semanas en filas).
   - Cada día puede mostrar:
     - Sin contenido (sin propuesta).
     - Uno o varios “chips” con códigos de turno (ej.: `TN`, `TM`, etc.), tal como se ve en el Figma.
   - Interacción:
     - **Día sin turnos** → no hace nada (o muestra un pequeño tooltip vacío).
     - **Día con 1 turno** → al pulsar, navega directamente a Detalle de Turno.
     - **Día con >1 turno** → abre un pequeño modal o bottom sheet con la lista de turnos de ese día para elegir uno (id + horario + centro). Al elegir, navega a Detalle de Turno.

5. **Estados de carga**
   - `loading`: skeleton sobre el calendario.
   - `error`: mensaje sencillo + botón “Reintentar”.
   - `empty / plan not_ready`: mensaje del tipo “Estamos preparando tu plan. Vuelve a intentarlo en unos minutos.” (por si el usuario entra antes de que el job de 15 minutos termine).

---

### 2.3. Pantalla 3 – Detalle de turno (Shift details)

Ruta sugerida: `/winter-plan/shifts/:shiftId`  

Elementos (referencia directa al diseño “Shift details”):

1. **Header**
   - Título: `Detalles del Turno`.
   - Back para volver al calendario.

2. **Bloque de centro**
   - Nombre del hospital (ej.: `Hospital General de Catalunya`).
   - Rating + nº de valoraciones (ej.: `4.1 (10 valoraciones)`).
   - Especialidad/servicio (ej.: `Quirófano - Instrumentista`).
   - Unidad (ej.: `Cardiología`).
   - Fecha y horario del turno (ej.: `Lunes, 27 de Abr · 07:00 - 16:00`).

3. **Remuneración**
   - Etiqueta `Remuneración`.
   - Línea 1: `Hospital` + importe (ej.: `250€`).
   - Línea 2: `Livo Bonus` + importe (ej.: `50€`).
   - Línea 3: `Total` + importe total (ej.: `300€`).

4. **Detalles (chips)**
   - Chips con icono y texto (ej.: `Parking de pago`, `Dieta no incluida`, `Acceso cafetería`, etc.).
   - Estos textos pueden venir de backend o ser estáticos.

5. **Descripción**
   - Párrafo corto con copy del turno, como en Figma.

6. **Sobre el centro**
   - Dirección y ciudad (Ej.: `C. de Cartagena 340, 08025 Barcelona`).
   - Flecha indicando que podría abrir otra pantalla o Google Maps (en esta primera versión puede no tener acción).

7. **Política de cancelación**
   - Fila con título `Política de cancelación`.
   - Al pulsar, se abre la pantalla 4 (Política de cancelación).

8. **Datos de turno**
   - `Turno Nº` + identificador (ej.: `HEP24335ft-01`).
   - Icono para copiar o compartir (opcional).

9. **Botones inferior (bottom bar)**
   - Botón secundario: `No me convence`
     - Al pulsar, abre un modal / action sheet con dos opciones:
       - `No quiero trabajar este día`  (`reason = not_available`)
       - `No me convence`              (`reason = not_interested`)
     - Cada opción llama al endpoint correspondiente (ver sección APIs).
   - Botón primario: `Solicitar por 300€`
     - Lanza el POST para solicitar el turno (claim).
     - Después se puede mostrar un toast o redirigir al calendario.

---

### 2.4. Pantalla 4 – Política de cancelación

Ruta sugerida: `/winter-plan/cancellation-policy/:policyId` (o `/winter-plan/cancellation-policy` si solo hay una).

- Título: `Política de cancelación`.
- Texto con secciones, siguiendo el diseño:
  - Intro: “Antes de solicitar el turno queremos confirmar que estás de acuerdo con la política de cancelación.”
  - Recordatorio de que cancelas:
    - **Turno sin confirmar:** Puedes cancelar desde la app en cualquier momento.
    - **A menos de 7 días de iniciar el turno:** Debes contactar con soporte e indicar que deseas cancelar el turno.
    - **A menos de 7 días de iniciar el turno:** (texto de restricciones, tal cual en Figma).
    - **Si no te presentas al turno de acogida:** Se cancela automáticamente el turno de cobertura.
- Todo texto estático en esta primera versión, pero dejamos preparado soporte para cargarlo desde API.

---

## 3. Stack y arquitectura frontend (propuesta)

Se puede adaptar, pero estas son las suposiciones de partida para que Cursor tenga contexto:

- **Framework:** React + TypeScript.
- **Bundler:** Vite o Next.js (SPA orientada solo a mobile).
- **Estilos:** TailwindCSS o CSS Modules, siguiendo el diseño de Figma.
- **Ruteo:** `react-router-dom` (si Vite/SPA) o router nativo de Next (si Next.js).
- **Estado y datos:** React Query / TanStack Query para manejar llamadas a la API (loading, error, cache).

Estructura de carpetas sugerida:

src/
api/
winterPlan.ts // funciones para llamar a los endpoints definidos abajo
components/
Calendar/
ShiftCard/
Buttons/
Layout/
pages/
WinterPlanIntro.tsx
WinterPlanCalendar.tsx
ShiftDetails.tsx
CancellationPolicy.tsx
types/
winterPlan.ts // tipos TS de Professional, Shift, Policy...


---

## 4. APIs y endpoints

> Nombres y estructuras orientativos. Se pueden renombrar en backend, pero el README detalla qué información necesita el front.

### 4.1. Notas generales

- Base URL placeholder: `{{API_BASE_URL}}` (ej.: `https://api.livo.app`).
- Todas las peticiones llevan cabecera:
  - `Authorization: Bearer <authToken>`
  - `X-Professional-Id: <professionalId>` (o el `professionalId` se pasa en la ruta).

### 4.2. Obtener plan de invierno del profesional

**Endpoint 1 – GET plan completo por profesional**

- **URL:** `GET {{API_BASE_URL}}/winter-plan/professionals/:professionalId`
- **Query params opcionales:**
  - `month` (YYYY-MM) – para pedir un mes concreto (ej.: `2025-12`).
- **Cuándo se usa:**
  - Al entrar en `/winter-plan/calendar`.
  - Se asume que el backend ya ha calculado el plan **15 minutos** después de que el profesional hiciera clic en “Comenzar a escribir la disponibilidad”.
- **Respuesta (ejemplo):**

```json
{
  "professionalId": "pro_123",
  "status": "ready",          // "ready" | "processing" | "not_started"
  "generatedAt": "2025-11-20T10:30:00Z",
  "months": [
    {
      "month": "2025-12",
      "days": [
        {
          "date": "2025-12-17",
          "shifts": [
            {
              "id": "shift_001",
              "label": "TN",                         // código breve para pintar en el calendario
              "startTime": "07:00",
              "endTime": "16:00",
              "facilityName": "Hospital General de Catalunya"
            }
          ]
        }
      ]
    },
    {
      "month": "2026-01",
      "days": [ /* misma estructura */ ]
    }
  ]
}

4.3. Obtener detalle de un turno

Endpoint 2 – GET detalles de turno

URL: GET {{API_BASE_URL}}/winter-plan/shifts/:shiftId

Uso:

Al entrar en /winter-plan/shifts/:shiftId.

Respuesta (ejemplo):

{
  "id": "shift_001",
  "professionalId": "pro_123",
  "facility": {
    "id": "fac_001",
    "name": "Hospital General de Catalunya",
    "rating": 4.1,
    "reviewsCount": 10,
    "address": "C. de Cartagena 340, 08025 Barcelona",
    "city": "Barcelona",
    "images": {
      "logo": "https://assets.livo.app/facilities/hgc-logo.png"
    }
  },
  "specialty": "Quirófano - Instrumentista",
  "unit": "Cardiología",
  "date": "2025-04-27",
  "startTime": "07:00",
  "endTime": "16:00",
  "remuneration": {
    "facilityAmount": 250,
    "bonusAmount": 50,
    "currency": "EUR",
    "total": 300
  },
  "tags": [
    "Parking de pago",
    "Dieta no incluida",
    "Acceso cafetería",
    "CASIOPEA"
  ],
  "description": "Trabaja cuando, donde y como quieras usando la App de Livo para conseguir los turnos que mejor se ajustan a tus necesidades.",
  "cancellationPolicyId": "winter_default"
}

4.4. Solicitar turno (botón “Solicitar por 300€”)

Endpoint 3 – POST solicitar turno

URL: POST {{API_BASE_URL}}/winter-plan/shifts/:shiftId/claim

Body (ejemplo):

{
  "professionalId": "pro_123",
  "source": "winter_plan"
}


Respuesta (ejemplo):

{
  "status": "success",
  "claimId": "claim_987",
  "shiftId": "shift_001"
}


En caso de error (turno ya no disponible, etc.), devolver un código de error y mensaje para mostrar un toast en el front.

4.5. Rechazar turno / enviar feedback (botón “No me convence”)

Endpoint 4 – POST feedback de rechazo

URL: POST {{API_BASE_URL}}/winter-plan/shifts/:shiftId/feedback

Body:

{
  "professionalId": "pro_123",
  "reason": "not_available",   // "not_available" | "not_interested"
  "source": "winter_plan"
}


reason = "not_available" → opción “No quiero trabajar este día”.

reason = "not_interested" → opción “No me convence”.

Respuesta (ejemplo):

{
  "status": "ok"
}

4.6. Política de cancelación

Hay dos opciones:

Texto incluido en el endpoint de turno

cancellationPolicyId + cancellationPolicyText en el propio GET /winter-plan/shifts/:shiftId.

Endpoint separado (más flexible)

Endpoint 5 – GET política de cancelación

URL: GET {{API_BASE_URL}}/winter-plan/cancellation-policies/:policyId

Respuesta (ejemplo):

{
  "id": "winter_default",
  "title": "Política de cancelación",
  "sections": [
    {
      "title": "Turno sin confirmar",
      "body": "Podrás cancelar desde la app en cualquier momento."
    },
    {
      "title": "A menos de 7 días de iniciar el turno",
      "body": "Deberás contactar con soporte e indicar que deseas cancelar el turno."
    },
    {
      "title": "A menos de 7 días de iniciar el turno",
      "body": "Deberás contactar con soporte y dar una causa razon mayor. De lo contrario tu cuenta podría recibir restricciones."
    },
    {
      "title": "Si no te presentas al turno de acogida",
      "body": "Se cancelará automáticamente el turno de cobertura."
    }
  ]
}


El front pinta el contenido siguiendo el layout del Figma.

5. Assets (imágenes y recursos)

Todas las imágenes (logos de centros, fondos, iconos personalizados, etc.) se recibirán como URLs.

Se pueden gestionar de varias formas:

Archivo de configuración assets.ts con un objeto:

export const winterPlanAssets = {
  gratitudeLetterBg: "https://assets.livo.app/winter/letter-bg.png",
  lockedCalendarBg: "https://assets.livo.app/winter/locked-calendar.png"
};


O bien la API puede devolver las URLs de imágenes dentro de las respuestas (ej.: facility.images.logo).

Iconos de interfaz genéricos (flechas, info, candado) se pueden usar desde una librería de iconos (Heroicons, Lucide, etc.) o SVGs locales.

6. Parametrización vía URL

La app nativa abrirá la WebView con una URL del tipo:

https://winter-plan.livo.app?professionalId=pro_123&token=JWT_XYZ&entry=calendar


Variables a considerar:

- professionalId – obligatorio.

- token – token de autenticación o de sesión.

- entry – intro o calendar según la pantalla desde la que se abra.

- month – opcional, para abrir directamente un mes del calendario.

- El front debe leer estos parámetros y decidir:

Si entry = intro → mostrar /winter-plan.

Si entry = calendar → intentar ir directo a /winter-plan/calendar y llamar al Endpoint 1.


7. Próximos pasos sugeridos para Cursor

- Crear el proyecto base (React + TS + router + sistema de estilos). ✅
- Implementar las 4 pantallas en estático, replicando el diseño de Figma. ✅
- Definir los tipos TypeScript (Professional, WinterPlanMonth, Shift, CancellationPolicy). ✅
- Implementar las llamadas a los endpoints descritos (con mocks de momento). ✅
- Conectar calendario ↔ detalle de turno ↔ feedback. ✅
- Añadir manejo de estados (loading, error, processing/not_ready). ✅

---

## 8. Desarrollo local

### Requisitos previos

- Node.js 18+ 
- npm 8+

### Instalación

```bash
# Clonar/descargar el proyecto y entrar en el directorio
cd winter_plan

# Instalar dependencias
npm install
```

### Ejecutar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en **http://localhost:3000**

### Rutas disponibles

| Ruta | Descripción |
|------|-------------|
| `/winter-plan` | Pantalla de introducción (plan bloqueado) |
| `/winter-plan/info` | FAQ - Explicación del plan |
| `/winter-plan/calendar` | Calendario con turnos propuestos |
| `/winter-plan/shifts/:shiftId` | Detalle de un turno específico |
| `/winter-plan/cancellation-policy` | Política de cancelación |

### Parámetros de URL

La app soporta los siguientes query params:

- `entry=calendar` → Abre directamente el calendario
- `entry=intro` → Abre la pantalla de introducción
- `professionalId=xxx` → ID del profesional (usa `pro_123` por defecto en mocks)

**Ejemplos:**

```
http://localhost:3000?entry=calendar
http://localhost:3000?entry=intro&professionalId=pro_456
```

### Build de producción

```bash
npm run build
```

Los archivos estáticos se generan en el directorio `dist/`.

### Previsualizar build

```bash
npm run preview
```

### Estructura del proyecto

```
src/
├── api/
│   └── winterPlan.ts      # Llamadas a API + mocks
├── components/
│   ├── Buttons/           # PrimaryButton, SecondaryButton
│   ├── Calendar/          # Calendar, MonthSelector, ShiftChip
│   ├── Layout/            # Header
│   └── ShiftCard/         # ShiftListModal
├── pages/
│   ├── WinterPlanIntro.tsx
│   ├── WinterPlanInfo.tsx
│   ├── WinterPlanCalendar.tsx
│   ├── ShiftDetails.tsx
│   └── CancellationPolicy.tsx
├── types/
│   └── winterPlan.ts      # Tipos TypeScript
├── App.tsx
├── main.tsx
└── index.css
```

### Variables de entorno

Crear un archivo `.env` en la raíz (opcional):

```env
VITE_API_BASE_URL=https://api.livo.app
```

> **Nota:** Actualmente la app usa mocks de datos. Para conectar con una API real, editar `USE_MOCKS = false` en `src/api/winterPlan.ts`.