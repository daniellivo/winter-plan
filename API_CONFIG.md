# 🔧 Configuración de la API

## URL Base

La URL base de la API está configurada en: `src/api/winterPlan.ts`

```typescript
const API_BASE_URL = 'https://api.livo.app/winter-plan'
```

## 📥 Método POST para Recibir Datos

### Función JavaScript: `receiveShiftsData()`

La aplicación incluye una función para **recibir y almacenar** datos de turnos directamente en el navegador:

```typescript
import { receiveShiftsData } from './api/winterPlan'

// Ejemplo de uso
const shiftsArray = [
  { shiftDetails: { id: "shift_101", ... } },
  { shiftDetails: { id: "shift_102", ... } }
]

const result = await receiveShiftsData(shiftsArray, "pro_123")
// Retorna: { status: "success", count: 2 }
```

### Página de Utilidad: `/winter-plan/receive-data`

Puedes acceder a una interfaz visual en:
```
http://localhost:4173/winter-plan/receive-data?professionalId=pro_123
```

Esta página permite:
- ✅ Pegar JSON de turnos y almacenarlos
- ✅ Ver cuántos turnos están almacenados
- ✅ Cargar datos de ejemplo
- ✅ Limpiar datos almacenados
- ✅ Los datos se guardan en `sessionStorage`

### Uso desde n8n o Webhook

Puedes usar `window.receiveShiftsData()` desde un script inyectado:

```javascript
// En n8n o cualquier script que se ejecute en el contexto de la página
window.receiveShiftsData = async (data) => {
  const { receiveShiftsData } = await import('./api/winterPlan')
  return receiveShiftsData(data)
}
```

## Endpoints que debe implementar tu API

### 1. Obtener turnos del profesional (Calendario)

**GET** `{API_BASE_URL}/professionals/{professionalId}`

**Query params opcionales:**
- `month` (string): Filtrar por mes en formato YYYY-MM (ej: "2025-12")

**Respuesta esperada:**
```json
[
  {
    "shiftDetails": {
      "id": "shift_101",
      "professionalId": "pro_123",
      "date": "2025-12-05",
      "startTime": "08:00",
      "endTime": "15:00",
      "unit": "Urgencias",
      "field": "Medicina Interna",
      "description": "Descripción del turno...",
      "facility": {
        "id": "fac_145",
        "name": "Hospital Clínic de Barcelona",
        "rating": 4.3,
        "reviewsCount": 28,
        "address": "C. Villarroel 170, 08036",
        "city": "Barcelona",
        "googleMapsUrl": "https://www.google.com/maps/..."
      },
      "remuneration": {
        "facilityAmount": 230,
        "bonusAmount": 40,
        "total": 270
      },
      "tags": {
        "parking": false,
        "food": true,
        "cafeteria": true,
        "programa": "casiopea"
      }
    }
  }
]
```

### 2. Obtener detalle de un turno específico

**GET** `{API_BASE_URL}/shifts/{shiftId}`

**Respuesta esperada:**
```json
{
  "shiftDetails": {
    "id": "shift_101",
    "professionalId": "pro_123",
    "date": "2025-12-05",
    "startTime": "08:00",
    "endTime": "15:00",
    "unit": "Urgencias",
    "field": "Medicina Interna",
    "description": "Descripción del turno...",
    "facility": { ... },
    "remuneration": { ... },
    "tags": { ... }
  }
}
```

### 3. Solicitar un turno (Claim)

**POST** `{API_BASE_URL}/shifts/{shiftId}/claim`

**Body:**
```json
{
  "professionalId": "pro_123",
  "source": "winter_plan"
}
```

**Respuesta esperada:**
```json
{
  "status": "success",
  "claimId": "claim_12345"
}
```

### 4. Rechazar un turno (Feedback)

**POST** `{API_BASE_URL}/shifts/{shiftId}/feedback`

**Body:**
```json
{
  "professionalId": "pro_123",
  "reason": "not_available",  // o "not_interested"
  "source": "winter_plan"
}
```

**Respuesta esperada:**
```json
{
  "status": "ok"
}
```

### 5. Obtener política de cancelación

**GET** `{API_BASE_URL}/cancellation-policies/{policyId}`

**Respuesta esperada:**
```json
{
  "id": "winter_default",
  "title": "Política de cancelación",
  "sections": [
    {
      "title": "Turno sin confirmar",
      "body": "Podrás cancelar desde la app en cualquier momento."
    }
  ]
}
```

## Headers de autenticación

Todas las peticiones incluyen:
```
Authorization: Bearer {token}
```

El token se obtiene del `sessionStorage` con la clave `winter_plan_token`.

## Cómo cambiar entre Mocks y API Real

### Opción 1: Variable de entorno (Recomendado)

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Usar API real
VITE_USE_MOCKS=false
VITE_API_BASE_URL=https://tu-api-real.com/winter-plan
```

### Opción 2: Cambiar directamente en el código

Edita `src/api/winterPlan.ts`:

```typescript
// Cambiar de true a false
const USE_MOCKS = false
```

## Transformación automática de datos

El código incluye una función `transformShiftsToWinterPlan()` que:
- Agrupa los turnos por mes y fecha
- Calcula automáticamente el label (TM, TT, TN) según la hora de inicio
- Convierte el formato de la API al formato interno del calendario

## Notas importantes

- Los turnos se agrupan automáticamente por mes (YYYY-MM) y fecha (YYYY-MM-DD)
- El label del turno se calcula así:
  - **TM** (Mañana): 07:00 - 13:59
  - **TT** (Tarde): 14:00 - 20:59
  - **TN** (Noche): 21:00 - 06:59
- El campo `programa` en tags puede ser "casiopea" u otros programas
- Por defecto, todos los turnos tienen status "pending"

