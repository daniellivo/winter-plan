# 🔥 Guía: Configurar Firebase + n8n para Datos en Tiempo Real

Esta guía explica cómo configurar Firebase Firestore y n8n para enviar datos de turnos a la aplicación web en tiempo real.

## 📋 Resumen de la Arquitectura

```
┌─────────────┐     HTTP POST      ┌─────────────────┐     Real-time      ┌─────────────┐
│    n8n      │ ─────────────────► │    Firebase     │ ◄───────────────► │   Web App   │
│  Workflow   │                    │   Firestore     │                    │   (React)   │
└─────────────┘                    └─────────────────┘                    └─────────────┘
```

1. **n8n** envía datos de turnos a Firebase via HTTP POST
2. **Firebase Firestore** almacena los datos y notifica cambios
3. **La Web App** escucha cambios en tiempo real y actualiza la UI automáticamente

---

## 🔧 Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Clic en "Crear proyecto" (o "Add project")
3. Nombre del proyecto: `winter-plan` (o el que prefieras)
4. Desactiva Google Analytics (opcional)
5. Clic en "Crear proyecto"

---

## 🗄️ Paso 2: Configurar Firestore Database

1. En el panel lateral, ve a **Build > Firestore Database**
2. Clic en "Crear base de datos"
3. Selecciona **"Start in test mode"** (para desarrollo)
   - En producción, configura reglas de seguridad adecuadas
4. Selecciona la ubicación más cercana (ej: `europe-west1`)
5. Clic en "Habilitar"

### Reglas de Seguridad (Desarrollo)

Para desarrollo, usa estas reglas permisivas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura en la colección shifts
    match /shifts/{professionalId} {
      allow read, write: if true;
    }
  }
}
```

### Reglas de Seguridad (Producción)

Para producción, restringe el acceso:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shifts/{professionalId} {
      // Permitir lectura solo desde dominios autorizados
      allow read: if true;
      
      // Permitir escritura solo con API key válida
      // (En producción, usa Cloud Functions para validar)
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🔑 Paso 3: Obtener Credenciales de Firebase

1. En Firebase Console, ve a **Project Settings** (icono de engranaje)
2. Ve a la pestaña **"General"**
3. En "Your apps", clic en **"</>"** (icono de Web)
4. Nombre de la app: `winter-plan-web`
5. **NO** marques "Firebase Hosting" (usamos GitHub Pages)
6. Clic en "Registrar app"
7. Copia la configuración de Firebase:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "winter-plan.firebaseapp.com",
  projectId: "winter-plan",
  storageBucket: "winter-plan.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## ⚙️ Paso 4: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# .env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=winter-plan.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=winter-plan
VITE_FIREBASE_STORAGE_BUCKET=winter-plan.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Desactivar mocks para usar datos reales
VITE_USE_MOCKS=false
```

> ⚠️ **Importante**: No subas el archivo `.env` a git. Ya está en `.gitignore`.

---

## 📡 Paso 5: Configurar n8n para Enviar Datos

### Opción A: HTTP Request Node (Recomendado)

Usa el nodo **HTTP Request** para enviar datos directamente a Firebase REST API:

**URL:**
```
https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/shifts/{{$json.professionalId}}
```

**Method:** `PATCH`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "fields": {
    "shifts": {
      "arrayValue": {
        "values": [
          {
            "mapValue": {
              "fields": {
                "shiftDetails": {
                  "mapValue": {
                    "fields": {
                      "id": { "stringValue": "shift_001" },
                      "professionalId": { "stringValue": "pro_123" },
                      "date": { "stringValue": "2025-12-05" },
                      "startTime": { "stringValue": "08:00" },
                      "endTime": { "stringValue": "15:00" },
                      "unit": { "stringValue": "Urgencias" },
                      "field": { "stringValue": "Medicina Interna" },
                      "facility": {
                        "mapValue": {
                          "fields": {
                            "id": { "stringValue": "fac_001" },
                            "name": { "stringValue": "Hospital Clínic" },
                            "rating": { "doubleValue": 4.5 },
                            "reviewsCount": { "integerValue": 28 },
                            "address": { "stringValue": "C. Villarroel 170" },
                            "city": { "stringValue": "Barcelona" },
                            "googleMapsUrl": { "stringValue": "https://maps.google.com" }
                          }
                        }
                      },
                      "remuneration": {
                        "mapValue": {
                          "fields": {
                            "facilityAmount": { "integerValue": 230 },
                            "bonusAmount": { "integerValue": 40 },
                            "total": { "integerValue": 270 }
                          }
                        }
                      },
                      "tags": {
                        "mapValue": {
                          "fields": {
                            "parking": { "booleanValue": true },
                            "food": { "booleanValue": true },
                            "cafeteria": { "booleanValue": true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    },
    "updatedAt": { "stringValue": "{{$now.toISO()}}" },
    "professionalId": { "stringValue": "{{$json.professionalId}}" }
  }
}
```

### Opción B: Firebase Admin SDK Node (Más Simple)

Si tienes la integración de Firebase en n8n:

1. Ve a **Credentials** en n8n
2. Añade **Firebase Admin SDK**
3. Usa el nodo **Firebase Realtime Database** o **Cloud Firestore**

**Configuración del nodo:**
- **Operation:** Create/Update
- **Collection:** `shifts`
- **Document ID:** `{{$json.professionalId}}`
- **Data:**

```json
{
  "shifts": {{ $json.shifts }},
  "updatedAt": "{{ $now.toISO() }}",
  "professionalId": "{{ $json.professionalId }}"
}
```

---

## 📊 Estructura de Datos en Firestore

### Colección: `shifts`

Cada documento representa los turnos de un profesional:

```
shifts/
  └── pro_123/                    # Document ID = professionalId
        ├── professionalId: "pro_123"
        ├── updatedAt: "2025-01-15T10:30:00Z"
        └── shifts: [             # Array de turnos
              {
                shiftDetails: {
                  id: "shift_001",
                  date: "2025-12-05",
                  startTime: "08:00",
                  endTime: "15:00",
                  unit: "Urgencias",
                  field: "Medicina Interna",
                  facility: {
                    name: "Hospital Clínic",
                    ...
                  },
                  remuneration: {
                    total: 270,
                    ...
                  },
                  tags: { ... }
                }
              },
              ...
            ]
```

---

## 🧪 Probar la Integración

### 1. Verificar Configuración

```bash
# Compilar y ejecutar la app
npm run build
npm run preview
```

Abre la consola del navegador. Deberías ver:
```
🔥 Firebase initialized successfully
```

### 2. Añadir Datos de Prueba desde Firebase Console

1. Ve a **Firestore Database**
2. Clic en **"Iniciar colección"**
3. ID de colección: `shifts`
4. ID de documento: `pro_123` (o tu professionalId)
5. Añade los campos según la estructura de arriba

### 3. Verificar Actualización en Tiempo Real

1. Abre la app en el navegador con `?professionalId=pro_123`
2. En Firebase Console, modifica algún turno
3. La app debería actualizarse automáticamente (sin recargar)

---

## 🔄 Flujo Completo

```
1. n8n recibe trigger (webhook, schedule, etc.)
         │
         ▼
2. n8n procesa datos de turnos
         │
         ▼
3. n8n envía HTTP PATCH a Firebase REST API
   POST https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents/shifts/{professionalId}
         │
         ▼
4. Firebase Firestore guarda los datos
         │
         ▼
5. Web App recibe actualización via listener onSnapshot()
         │
         ▼
6. React re-renderiza el calendario con los nuevos turnos
```

---

## 🛠️ Troubleshooting

### "Firebase not configured"
- Verifica que el archivo `.env` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### "Permission denied" en Firestore
- Verifica las reglas de seguridad en Firestore
- Para desarrollo, usa las reglas permisivas

### Los datos no se actualizan en tiempo real
- Verifica que el `professionalId` en la URL coincide con el documento en Firestore
- Abre la consola del navegador para ver logs de Firebase

### n8n no puede escribir en Firebase
- Usa la REST API con el formato correcto de Firestore
- Verifica que el proyecto ID es correcto
- Para operaciones más complejas, considera usar Cloud Functions

---

## 📚 Referencias

- [Firebase Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase REST API](https://firebase.google.com/docs/firestore/use-rest-api)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)

