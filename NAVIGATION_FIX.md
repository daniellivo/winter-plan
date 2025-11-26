# 🔗 Fix: Preservar professionalId en todas las navegaciones

## ✅ Problema Resuelto

Antes, al navegar entre páginas, se perdía el parámetro `professionalId` de la URL.

**Antes:**
```
http://localhost:4173/winter-plan/calendar?professionalId=pro_123
↓ Click en turno
http://localhost:4173/winter-plan/shifts/shift_001  ❌ Se pierde professionalId
```

**Ahora:**
```
http://localhost:4173/winter-plan/calendar?professionalId=pro_123
↓ Click en turno
http://localhost:4173/winter-plan/shifts/shift_001?professionalId=pro_123  ✅ Se preserva
```

## 🔧 Solución Implementada

### 1. Hook personalizado: `useAppNavigation`

Creado en `src/hooks/useAppNavigation.ts`:

```typescript
export function useAppNavigation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const navigateWithParams = useCallback((path: string) => {
    const professionalId = searchParams.get('professionalId')
    const token = searchParams.get('token')
    
    // Build query string
    const params = new URLSearchParams()
    if (professionalId) params.set('professionalId', professionalId)
    if (token) params.set('token', token)
    
    const queryString = params.toString()
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    navigate(fullPath)
  }, [navigate, searchParams])

  return navigateWithParams
}
```

### 2. Páginas actualizadas

Todas las páginas ahora usan `useAppNavigation` en lugar de `useNavigate`:

- ✅ `WinterPlanIntro.tsx`
- ✅ `WinterPlanCalendar.tsx`
- ✅ `ShiftDetails.tsx`
- ✅ `Header.tsx` (componente)

### 3. Uso en el código

**Antes:**
```typescript
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate('/winter-plan/shifts/shift_001') // ❌ Pierde params
```

**Ahora:**
```typescript
import { useAppNavigation } from '../hooks/useAppNavigation'

const navigate = useAppNavigation()
navigate('/winter-plan/shifts/shift_001') // ✅ Preserva params automáticamente
```

## 📋 Todas las rutas con professionalId

Ahora todas estas rutas mantienen el `professionalId`:

```
✅ /winter-plan?professionalId=pro_123
✅ /winter-plan/info?professionalId=pro_123
✅ /winter-plan/calendar?professionalId=pro_123
✅ /winter-plan/shifts/:shiftId?professionalId=pro_123
✅ /winter-plan/cancellation-policy?professionalId=pro_123
✅ /winter-plan/receive-data?professionalId=pro_123
```

## 🎯 Flujo completo preservando professionalId

```
1. Usuario entra con:
   http://localhost:4173/winter-plan?professionalId=pro_123

2. Click en "i" (info):
   → /winter-plan/info?professionalId=pro_123

3. Back al intro:
   → /winter-plan?professionalId=pro_123

4. Ve al calendario (desde App o directamente):
   → /winter-plan/calendar?professionalId=pro_123

5. Click en un turno:
   → /winter-plan/shifts/shift_001?professionalId=pro_123

6. Click en "Política de cancelación":
   → /winter-plan/cancellation-policy?professionalId=pro_123

7. Back al turno:
   → /winter-plan/shifts/shift_001?professionalId=pro_123

8. Solicitar turno → vuelve al calendario:
   → /winter-plan/calendar?professionalId=pro_123
```

## 🔄 Navegación del navegador (Back/Forward)

El botón "atrás" del navegador **también preserva** los parámetros porque:
- Los parámetros están en la URL
- El historial del navegador guarda URLs completas
- No necesita tratamiento especial

## 🧪 Cómo probar

1. **Inicia el preview:**
   ```bash
   npm run preview
   ```

2. **Abre con professionalId:**
   ```
   http://localhost:4173/winter-plan?professionalId=pro_123
   ```

3. **Navega por todas las páginas:**
   - Info
   - Calendario
   - Detalle de turno
   - Política de cancelación

4. **Verifica que TODAS las URLs tienen:**
   ```
   ?professionalId=pro_123
   ```

## 📝 Notas importantes

1. **Token también se preserva**: Si la URL tiene `&token=xxx`, también se mantiene en todas las navegaciones.

2. **SessionStorage como fallback**: Aunque se pierda el param de la URL, el `professionalId` también se guarda en sessionStorage como respaldo (ver `App.tsx`).

3. **Compatibilidad**: El hook es compatible con todas las navegaciones existentes, solo reemplaza `useNavigate` por `useAppNavigation`.

4. **Futuras páginas**: Cualquier nueva página debe usar `useAppNavigation` en lugar de `useNavigate` directamente.

## ✨ Beneficios

- ✅ El `professionalId` nunca se pierde
- ✅ Las APIs reciben siempre el ID correcto
- ✅ El webhook registra el profesional correcto
- ✅ Los datos se filtran por profesional
- ✅ Mejor experiencia de usuario
- ✅ Código más mantenible

