# 📡 Guía: Enviar Turnos desde n8n via HTTP POST

## 🎯 Objetivo

Enviar datos de turnos desde n8n a la aplicación web usando un **HTTP POST request**.

## 🚀 Opción 1: Servidor Proxy (Recomendado para Desarrollo)

### Paso 1: Instalar dependencias

```bash
npm install express cors http-proxy-middleware
```

### Paso 2: Iniciar el servidor proxy

```bash
# Terminal 1: Build y preview de la app
npm run build
npm run preview

# Terminal 2: Servidor proxy
npm run proxy
```

El proxy estará en: `http://localhost:3001`

### Paso 3: Configurar n8n

**Nodo HTTP Request:**

- **Method:** POST
- **URL:** `http://localhost:3001/api/receive-shifts?professionalId={{$json.professionalId}}`
- **Authentication:** None
- **Body Content Type:** JSON
- **Body:**

```json
{
  "data": "={{ $json.shifts }}"
}
```

**O directamente el array:**

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
```

### Paso 4: Respuesta del servidor

El servidor responderá con:

```json
{
  "status": "success",
  "count": 3,
  "professionalId": "pro_123",
  "message": "Shifts received and stored",
  "redirectUrl": "http://localhost:4173/winter-plan/calendar?professionalId=pro_123"
}
```

### Paso 5: Verificar datos

Los datos se almacenan automáticamente en `sessionStorage` y puedes:

1. **Ver en el calendario:**
   ```
   http://localhost:4173/winter-plan/calendar?professionalId=pro_123
   ```

2. **Obtener los datos almacenados via GET:**
   ```
   GET http://localhost:3001/api/shifts/pro_123
   ```

## 🌐 Opción 2: Sin Servidor Proxy (Producción)

Si no quieres usar un servidor proxy, puedes usar la página endpoint directamente:

### Paso 1: Abrir la página endpoint

```
http://localhost:4173/winter-plan/api/receive-shifts?professionalId=pro_123
```

### Paso 2: Desde n8n, usar un nodo "Execute JavaScript"

```javascript
// Nodo: Execute JavaScript
const shiftsData = $input.all()[0].json.shifts

// Abrir la página en un iframe oculto
const iframe = document.createElement('iframe')
iframe.style.display = 'none'
iframe.src = `http://your-domain.com/winter-plan/api/receive-shifts?professionalId=pro_123`

document.body.appendChild(iframe)

// Esperar a que cargue
iframe.onload = () => {
  // Enviar datos via postMessage
  iframe.contentWindow.postMessage(shiftsData, '*')
  
  // Esperar respuesta
  window.addEventListener('message', (event) => {
    if (event.data.status === 'success') {
      console.log('✅ Shifts received:', event.data.count)
      return { success: true, count: event.data.count }
    }
  })
}
```

### Paso 3: O usar función global

```javascript
// Si la página ya está abierta
window.receiveShiftsData(shiftsData)
  .then(result => {
    console.log('✅ Success:', result)
  })
  .catch(error => {
    console.error('❌ Error:', error)
  })
```

## 🔧 Opción 3: API REST Real (Producción)

Para producción, necesitarás un backend real. Aquí está la estructura:

### Backend (Node.js/Express ejemplo)

```javascript
// server.js
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// In-memory storage (usa DB en producción)
const shiftsDB = new Map()

app.post('/api/receive-shifts', (req, res) => {
  const { professionalId } = req.query
  const shiftsData = req.body

  // Validar
  if (!Array.isArray(shiftsData)) {
    return res.status(400).json({ error: 'Invalid data format' })
  }

  // Guardar
  shiftsDB.set(professionalId, {
    data: shiftsData,
    timestamp: new Date()
  })

  res.json({
    status: 'success',
    count: shiftsData.length
  })
})

app.get('/api/shifts/:professionalId', (req, res) => {
  const stored = shiftsDB.get(req.params.professionalId)
  
  if (!stored) {
    return res.status(404).json({ error: 'Not found' })
  }

  res.json(stored.data)
})

app.listen(3001, () => console.log('API running on :3001'))
```

### Frontend (actualizar winterPlan.ts)

```typescript
// src/api/winterPlan.ts
const API_BASE_URL = 'http://localhost:3001'

export async function getWinterPlan(professionalId: string): Promise<WinterPlan> {
  // Primero intentar obtener desde el servidor
  try {
    const response = await fetch(`${API_BASE_URL}/api/shifts/${professionalId}`)
    if (response.ok) {
      const data = await response.json()
      return transformShiftsToWinterPlan(data, professionalId)
    }
  } catch (error) {
    console.log('No data from server, using mocks')
  }

  // Fallback a mocks
  return buildMockWinterPlan()
}
```

## 📋 Flujo Completo desde n8n

```
┌─────────────┐
│   n8n       │
│  Workflow   │
└──────┬──────┘
       │
       │ 1. Procesar turnos
       │    (tu lógica de negocio)
       │
       ▼
┌─────────────────────┐
│  HTTP Request Node  │
│  POST /api/receive  │
│  -shifts            │
└──────┬──────────────┘
       │
       │ 2. Enviar JSON
       │
       ▼
┌─────────────────────┐
│  Proxy Server       │
│  (localhost:3001)   │
└──────┬──────────────┘
       │
       │ 3. Almacenar en
       │    sessionStorage
       │
       ▼
┌─────────────────────┐
│  React App          │
│  (localhost:4173)   │
└──────┬──────────────┘
       │
       │ 4. Mostrar en
       │    calendario
       │
       ▼
┌─────────────────────┐
│  Usuario ve turnos  │
└─────────────────────┘
```

## 🧪 Probar con curl

```bash
# Enviar turnos
curl -X POST "http://localhost:3001/api/receive-shifts?professionalId=pro_123" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "shiftDetails": {
        "id": "shift_101",
        "professionalId": "pro_123",
        "date": "2025-12-05",
        "startTime": "08:00",
        "endTime": "15:00",
        "unit": "Urgencias",
        "field": "Medicina Interna",
        "description": "Test shift",
        "facility": {
          "id": "fac_145",
          "name": "Hospital Test",
          "rating": 4.5,
          "reviewsCount": 10,
          "address": "Test St 123",
          "city": "Barcelona",
          "googleMapsUrl": "https://maps.google.com"
        },
        "remuneration": {
          "facilityAmount": 200,
          "bonusAmount": 50,
          "total": 250
        },
        "tags": {
          "parking": true,
          "food": true,
          "cafeteria": true,
          "programa": "casiopea"
        }
      }
    }
  ]'

# Obtener turnos almacenados
curl "http://localhost:3001/api/shifts/pro_123"
```

## 📝 Notas Importantes

1. **CORS**: El servidor proxy tiene CORS habilitado para desarrollo. En producción, configura los orígenes permitidos.

2. **Seguridad**: En producción, añade:
   - Autenticación (tokens, API keys)
   - Validación de datos más estricta
   - Rate limiting
   - HTTPS

3. **Persistencia**: El servidor proxy guarda datos en memoria. En producción, usa una base de datos.

4. **professionalId**: Es **obligatorio** en la query string.

5. **Formato**: El body debe ser un array de objetos con `shiftDetails`.

## 🎯 Siguiente Paso

Una vez que funcione con el proxy local, puedes:

1. Desplegar el backend en un servidor real
2. Actualizar las URLs en n8n
3. Configurar HTTPS y autenticación
4. Usar una base de datos real

## 🆘 Troubleshooting

**Error: CORS**
- Asegúrate de que el servidor proxy esté corriendo
- Verifica que n8n pueda acceder a localhost:3001

**Error: 404**
- Verifica que la URL incluya `?professionalId=xxx`
- Confirma que el servidor proxy esté en el puerto 3001

**Error: Invalid data**
- Verifica que el body sea un array
- Confirma que cada elemento tenga `shiftDetails`

**No se ven los turnos**
- Abre la consola del navegador
- Verifica que los datos estén en sessionStorage: `sessionStorage.getItem('winter_plan_shifts_data')`













