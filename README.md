# 🎄 Livo – Winter Plan

Una webapp móvil para que los profesionales sanitarios gestionen sus turnos de invierno (Diciembre y Enero).

## ¿Qué es el Winter Plan?

El **Plan de Invierno** de Livo ayuda a los profesionales sanitarios a organizar sus turnos durante los meses de mayor demanda. El flujo es sencillo:

1. **Indica tu disponibilidad** → El profesional marca qué días y franjas horarias puede trabajar (mañana, tarde, noche)
2. **Livo prepara tu plan** → Generamos una propuesta de turnos personalizada
3. **Revisa y confirma** → El profesional ve su calendario, solicita los turnos que le interesan o rechaza los que no. La principal ventaja del Winter Plan es que los profesionales pueden solicitar varios turnos a la vez.

---

## Funcionalidades principales

### 📅 Calendario de turnos
- Vista mensual con navegación entre Diciembre y Enero
- Cada día muestra los turnos propuestos con chips de colores (TM, TT, TN)
- Indica disponibilidad registrada y turnos confirmados

### ✏️ Editor de disponibilidad
- Selector de franjas horarias: **Todo el día**, **Mañana**, **Tarde**, **Noche**, **Borrar**
- Interfaz intuitiva: selecciona una franja y toca los días para aplicarla
- Guarda los cambios con un solo clic

### 📋 Detalle de turnos
- Información completa: hospital, horario, remuneración, ubicación
- Botón para solicitar el turno directamente
- Opción de rechazar con feedback

### ℹ️ Información del plan
- FAQ con preguntas frecuentes
- Política de cancelación detallada

---

## Stack técnico

- **Framework:** React 18 + TypeScript
- **Bundler:** Vite
- **Estilos:** TailwindCSS
- **Ruteo:** react-router-dom
- **Iconos:** @tabler/icons-react

---

## Desarrollo local

### Requisitos
- Node.js 18+ 
- npm 8+

### Instalación

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

La app estará en **http://localhost:3000**

### Build de producción

```bash
npm run build
```

---

## Rutas de la app

| Ruta | Descripción |
|------|-------------|
| `/winter-plan` | Pantalla de bienvenida |
| `/winter-plan/info` | FAQ y explicación del plan |
| `/winter-plan/calendar` | Calendario con turnos y editor de disponibilidad |
| `/winter-plan/shifts/:shiftId` | Detalle de un turno |
| `/winter-plan/cancellation-policy` | Política de cancelación |

### Parámetros de URL

```
?professionalId=xxx    → ID del profesional
?entry=calendar        → Abre directamente el calendario
?entry=intro           → Abre la pantalla de bienvenida
```

---

## APIs

### Base URL
```
https://api.getlivo.com
```

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/professional/winter-plan/available-shifts?professionalId=xxx` | Obtener turnos disponibles |
| GET | `/professional/winter-plan/availability?professionalId=xxx` | Obtener disponibilidad actual |
| POST | `/professional/winter-plan/availability` | Actualizar disponibilidad |
| POST | `/winter-plan/shifts/:shiftId/claim` | Solicitar un turno |
| POST | `/winter-plan/shifts/:shiftId/feedback` | Rechazar un turno |

### Ejemplo: Actualizar disponibilidad

```json
POST /professional/winter-plan/availability

{
  "professionalId": "abc123",
  "addedSlots": [
    { "date": "2025-12-02", "slots": ["DAY", "EVENING", "NIGHT"] },
    { "date": "2025-12-05", "slots": ["DAY"] }
  ],
  "removedSlots": [
    { "date": "2025-12-01", "slots": ["NIGHT"] }
  ]
}
```

---

## Estructura del proyecto

```
src/
├── api/
│   └── winterPlan.ts          # Llamadas a API
├── components/
│   ├── AvailabilitySelector.tsx  # Editor de disponibilidad
│   ├── AvailabilityPopup.tsx     # Popup informativo
│   ├── Buttons/                  # Botones reutilizables
│   ├── Calendar/                 # Componentes del calendario
│   ├── Layout/                   # Header y layout
│   └── ShiftCard/                # Modal de lista de turnos
├── hooks/
│   ├── useAppNavigation.ts       # Navegación entre pantallas
│   └── useFirebaseShifts.ts      # Integración Firebase
├── pages/
│   ├── WinterPlanIntro.tsx       # Pantalla de bienvenida
│   ├── WinterPlanInfo.tsx        # FAQ
│   ├── WinterPlanCalendar.tsx    # Calendario principal
│   ├── ShiftDetails.tsx          # Detalle de turno
│   ├── AvailableShifts.tsx       # Lista de turnos disponibles
│   └── CancellationPolicy.tsx    # Política de cancelación
├── types/
│   └── winterPlan.ts             # Tipos TypeScript
├── App.tsx
├── main.tsx
└── index.css
```

---

## Despliegue

### GitHub Pages (automático)

Cada push a `main` despliega automáticamente via GitHub Actions.

### Manual

```bash
npm run deploy
```

---

## Variables de entorno

```env
VITE_API_BASE_URL=https://api.getlivo.com
```
