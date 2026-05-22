# Teknon — Página de turnos disponibles

## Objetivo
Nueva página donde los profesionales ven todos los turnos abiertos de Hospitalización de Teknon (3 ámbitos: Adultos, Pediátrica, Materno) y pueden reservar múltiples a la vez. La página `/summer/teknon/hospitalizacion` actual no se toca.

## Ruta
`/summer/teknon/turnos-disponibles`

## Componentes
- **Nuevo**: `src/pages/TurnosDisponibles.tsx`
- **Reutilizados sin modificar**: `Calendar`, `MonthSelector`, `AvailabilitySelector`, `ShiftListModal`
- **Nuevo dato**: `src/data/teknonShifts.ts` (generado por `scripts/build-teknon-data.mjs` a partir de los 3 CSVs)

## Modelo de datos

### CSV → TS
Dataset bakeado en el bundle:
```ts
type Specialty = 'adultos' | 'pediatria' | 'materno'
type Slot = 'TM' | 'TT' | 'TN'
interface AvailableShift { date: string; slot: Slot; count: number }
export const TEKNON_SHIFTS: Record<Specialty, AvailableShift[]>
```

Horarios fijos (constantes en la página):
- TM: `07:10 – 14:10` (Mañanas)
- TT: `14:00 – 21:00` (Tardes)
- TN: `20:45 – 07:30` (Noches)

### Reservas (modelo por slot, no por turno individual)
Una reserva = `(professionalId, date, slot, specialty)`. Aunque el CSV diga "3 mañanas disponibles", se reserva como booleano por slot — el backend asigna luego el turno concreto.

### Supabase
Tabla nueva `teknon_shift_claims`:
```sql
create table teknon_shift_claims (
  id bigserial primary key,
  professional_id text not null,
  date date not null,
  slot text not null check (slot in ('TM','TT','TN')),
  specialty text not null check (specialty in ('adultos','pediatria','materno')),
  center text not null default 'teknon',
  unit text not null default 'Hospitalización',
  field text not null,
  price numeric not null default 100,
  created_at timestamptz not null default now(),
  unique (professional_id, date, slot, specialty)
);
```

### sessionStorage
Clave `teknon_disponibles_claims` con array JSON de claim keys (`{specialty}-{date}-{slot}`).

## UI

### Header
"🏖️ Turnos disponibles 🏖️" + botón soporte (chat Livo). Igual que summer.

### Dropdown de especialidad
Arriba, sin valor por defecto. Opciones: Adultos / Pediátrica / Materno. Hasta que el usuario elija, el calendario se oculta y se muestra un CTA "Elige una especialidad para ver los turnos disponibles".

### AvailabilitySelector
Reutilizado tal cual con `hideAllDay={true}` y `allowedCombinations={[['DAY'],['EVENING'],['NIGHT'],['DAY','EVENING']]}`. El botón "Guardar cambios" se oculta (`hideSaveButton={true}`).

### Calendar
Meses Junio–Septiembre 2026. Render:
- **Slot CSV con count ≥ 1** y no reservado → gris (reuso de `AvailabilityIndicator`).
- **Slot reservado** por el profesional → verde (reuso de `ShiftChip confirmed`).

Implementación: el page mantiene dos estructuras y las inyecta como `availability` (para los slots grises del CSV) y `pendingSlotsByDate`/`shiftClaims` no se usan. Se sintetizan `AvailabilitySlot` rows desde el CSV para que Calendar pinte el gris.

Para el verde, se sintetizan `ShiftClaim` rows desde sessionStorage. `Calendar` ya pinta esto como locked/confirmed.

### Click en día
- **Slot activo (Mañana/Tarde/Noche)** y CSV tiene ese slot ese día:
  - Si no estaba reservado → reserva (gris → verde).
  - Si ya estaba reservado → toggle off (verde → gris).
- **Slot activo "Borrar"**: quita todas las reservas del día.
- **Sin slot activo** y CSV tiene shifts ese día: abre `ShiftListModal` con shifts sintéticos.

### Modal (ShiftListModal reutilizado)
Shifts sintéticos:
```ts
{
  id: `teknon-{specialty}-{date}-{slot}`,
  label: 'TM'|'TT'|'TN',
  startTime, endTime,
  facilityName: 'Hospital Teknon',
  unit: 'Hospitalización',
  field: 'Adultos'|'Pediatría'|'Materno',
  price: 100,
  status: 'claimed' | 'pending',
}
```

`onSelect` (clic en cuerpo de card) → no-op. Solo el botón ✓ reserva. El botón ✗ se mantiene pero su click es no-op (no hay rechazo en este flujo). Como hay un sólo "shift" sintético por slot (modelo por-slot), el modal muestra una sola card por TM/TT/TN.

### Bottom CTA
"Solicita tus turnos" — disabled hasta ≥1 reserva. Al pulsar:
1. Upsert filas a `teknon_shift_claims`.
2. POST al webhook existente `ADD_AVAILABILITY_WEBHOOK_URL` con payload:
   ```json
   {
     "encodedId": "...",
     "timestamp": "...",
     "flow": "teknon-turnos-disponibles",
     "specialty": "adultos",
     "center": "teknon",
     "unit": "Hospitalización",
     "field": "Adultos",
     "claims": [
       {"date": "2026-06-01", "slot": "TM", "startTime": "07:10", "endTime": "14:10", "price": 100}
     ]
   }
   ```
3. Pantalla de éxito tipo summer + botón "Ir a la app".

## Lo que NO cambia
- `WinterPlanCalendar.tsx`, `Calendar.tsx`, `ShiftListModal.tsx`, `AvailabilitySelector.tsx`
- Ruta `/summer/teknon/hospitalizacion`
- Tabla `summer_planning`
- Webhooks/tracking del flujo invierno

## Decisiones explícitas
- Modelo por slot (no por turno individual): confirmado por el usuario, todos los turnos del mismo slot se ven idénticos.
- Precio fijo 100€ como placeholder; pendiente diferenciar TM/TT/TN/finde.
- Webhook envía `unit` y `field` (confirmado por usuario).
