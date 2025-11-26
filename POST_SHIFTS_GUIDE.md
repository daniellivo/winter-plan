# 📥 Guía: Método POST para Recibir Turnos

## 🎯 Resumen

La aplicación ahora puede **recibir y almacenar** datos de turnos directamente, sin necesidad de una API backend. Los datos se guardan en `sessionStorage` y se usan automáticamente en el calendario.

## 🚀 Métodos de Uso

### Método 1: Página de Utilidad (Más Fácil)

1. **Accede a la página:**
   ```
   http://localhost:4173/winter-plan/receive-data?professionalId=pro_123
   ```

2. **Pega tu JSON** en el campo de texto

3. **Haz clic en "Recibir y Almacenar Datos"**

4. **Ve al calendario** para ver los turnos pintados:
   ```
   http://localhost:4173/winter-plan/calendar?professionalId=pro_123
   ```

### Método 2: Desde JavaScript/Console

Abre la consola del navegador y ejecuta:

```javascript
// Importar la función
const { receiveShiftsData } = await import('/src/api/winterPlan.ts')

// Tu array de turnos
const shiftsData = [
  {
    "shiftDetails": {
      "id": "shift_101",
      "professionalId": "pro_123",
      "date": "2025-12-05",
      "startTime": "08:00",
      "endTime": "15:00",
      "unit": "Urgencias",
      "field": "Medicina Interna",
      "description": "Turno dinámico...",
      "facility": {
        "id": "fac_145",
        "name": "Hospital Clínic de Barcelona",
        "rating": 4.3,
        "reviewsCount": 28,
        "address": "C. Villarroel 170, 08036",
        "city": "Barcelona",
        "googleMapsUrl": "https://..."
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

// Enviar datos
const result = await receiveShiftsData(shiftsData, "pro_123")
console.log(result) // { status: "success", count: 1 }
```

### Método 3: Desde n8n (Webhook)

Puedes configurar n8n para inyectar los datos directamente en la página:

```javascript
// En el nodo "Code" de n8n
const shiftsData = $input.all()[0].json.shifts

// Script para inyectar en la página
const script = `
  (async () => {
    const { receiveShiftsData } = await import('/src/api/winterPlan.ts')
    const data = ${JSON.stringify(shiftsData)}
    const result = await receiveShiftsData(data)
    console.log('Turnos recibidos:', result)
  })()
`

return { script }
```

## 📊 Formato del JSON

El JSON debe ser un **array de objetos** con esta estructura:

```json
[
  {
    "shiftDetails": {
      "id": "string (requerido)",
      "professionalId": "string (requerido)",
      "date": "YYYY-MM-DD (requerido)",
      "startTime": "HH:MM (requerido)",
      "endTime": "HH:MM (requerido)",
      "unit": "string",
      "field": "string",
      "description": "string",
      
      "facility": {
        "id": "string",
        "name": "string",
        "rating": number,
        "reviewsCount": number,
        "address": "string",
        "city": "string",
        "googleMapsUrl": "string (opcional)"
      },
      
      "remuneration": {
        "facilityAmount": number,
        "bonusAmount": number,
        "total": number
      },
      
      "tags": {
        "parking": boolean,
        "food": boolean,
        "cafeteria": boolean,
        "programa": "string (ej: casiopea)"
      }
    }
  }
]
```

## 🔄 Flujo de Datos

1. **Recepción**: Los datos se reciben via `receiveShiftsData()`
2. **Validación**: Se valida que sea un array con estructura correcta
3. **Almacenamiento**: Se guarda en `sessionStorage` con clave `winter_plan_shifts_data`
4. **Uso automático**: 
   - `getWinterPlan()` primero busca en storage antes de llamar a la API
   - `getShiftDetails()` primero busca en storage antes de llamar a la API
5. **Transformación**: Los datos se transforman automáticamente al formato del calendario

## 🎨 Transformación Automática

El sistema calcula automáticamente:

- **Label del turno** según hora de inicio:
  - `TM` (Mañana): 07:00 - 13:59
  - `TT` (Tarde): 14:00 - 20:59
  - `TN` (Noche): 21:00 - 06:59

- **Agrupación** por mes (YYYY-MM) y fecha (YYYY-MM-DD)

- **Status** inicial: todos los turnos empiezan como `pending`

## 🧪 Ejemplo Completo

```javascript
// 1. Datos de ejemplo
const exampleShifts = [
  {
    "shiftDetails": {
      "id": "shift_101",
      "professionalId": "pro_123",
      "date": "2025-12-05",
      "startTime": "08:00",
      "endTime": "15:00",
      "unit": "Urgencias",
      "field": "Medicina Interna",
      "description": "Turno dinámico en un entorno de alta actividad.",
      "facility": {
        "id": "fac_145",
        "name": "Hospital Clínic de Barcelona",
        "rating": 4.3,
        "reviewsCount": 28,
        "address": "C. Villarroel 170, 08036",
        "city": "Barcelona",
        "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=hospital+clinic"
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
  },
  {
    "shiftDetails": {
      "id": "shift_102",
      "professionalId": "pro_123",
      "date": "2025-12-14",
      "startTime": "07:00",
      "endTime": "19:00",
      "unit": "UCI",
      "field": "Críticos",
      "description": "Turno de alta especialización en UCI.",
      "facility": {
        "id": "fac_067",
        "name": "Hospital del Mar",
        "rating": 4.0,
        "reviewsCount": 15,
        "address": "Passeig Marítim 25, 08003",
        "city": "Barcelona",
        "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=hospital+del+mar"
      },
      "remuneration": {
        "facilityAmount": 260,
        "bonusAmount": 35,
        "total": 295
      },
      "tags": {
        "parking": true,
        "food": false,
        "cafeteria": true,
        "programa": "casiopea"
      }
    }
  },
  {
    "shiftDetails": {
      "id": "shift_103",
      "professionalId": "pro_123",
      "date": "2025-12-22",
      "startTime": "15:00",
      "endTime": "23:00",
      "unit": "Hospitalización",
      "field": "Planta de Cirugía",
      "description": "Turno estable en planta.",
      "facility": {
        "id": "fac_203",
        "name": "Hospital Sant Pau",
        "rating": 4.4,
        "reviewsCount": 42,
        "address": "C. Sant Quintí 89, 08041",
        "city": "Barcelona",
        "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=hospital+sant+pau"
      },
      "remuneration": {
        "facilityAmount": 200,
        "bonusAmount": 30,
        "total": 230
      },
      "tags": {
        "parking": false,
        "food": false,
        "cafeteria": true,
        "programa": "casiopea"
      }
    }
  }
]

// 2. Enviar datos
const { receiveShiftsData } = await import('/src/api/winterPlan.ts')
const result = await receiveShiftsData(exampleShifts, "pro_123")
console.log('✅ Resultado:', result)

// 3. Verificar datos almacenados
const { getStoredShiftsData } = await import('/src/api/winterPlan.ts')
const stored = getStoredShiftsData()
console.log('📦 Turnos almacenados:', stored)

// 4. Limpiar datos (opcional)
const { clearStoredShiftsData } = await import('/src/api/winterPlan.ts')
clearStoredShiftsData()
```

## 🗑️ Limpiar Datos

Para limpiar los datos almacenados:

```javascript
// Desde la consola
const { clearStoredShiftsData } = await import('/src/api/winterPlan.ts')
clearStoredShiftsData()

// O manualmente
sessionStorage.removeItem('winter_plan_shifts_data')
```

## ⚙️ Funciones Disponibles

```typescript
// Recibir y almacenar turnos
receiveShiftsData(shiftsData: Array, professionalId?: string): Promise<{status, count}>

// Obtener turnos almacenados
getStoredShiftsData(): Array | null

// Limpiar turnos almacenados
clearStoredShiftsData(): void
```

## 📝 Notas Importantes

1. **SessionStorage**: Los datos persisten durante la sesión del navegador (hasta cerrar la pestaña)
2. **Prioridad**: Si hay datos en storage, se usan antes que llamar a la API
3. **Validación**: Se validan los campos requeridos (id, date, professionalId)
4. **Filtrado**: Si pasas `professionalId`, solo se almacenan turnos de ese profesional
5. **Desarrollo**: Esta funcionalidad es ideal para desarrollo y testing

## 🎯 Próximos Pasos

Una vez que tengas tu API o webhook de n8n listo, puedes:

1. Configurar n8n para enviar los datos automáticamente
2. O cambiar `VITE_USE_MOCKS=false` para usar la API real
3. Los datos del storage seguirán funcionando como fallback

