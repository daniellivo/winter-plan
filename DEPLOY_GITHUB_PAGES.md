# Guía de Despliegue en GitHub Pages

Esta guía te ayudará a desplegar el proyecto Winter Plan en GitHub Pages paso a paso.

## 📋 Requisitos previos

- Git instalado en tu computadora
- Una cuenta de GitHub
- Node.js 18+ instalado

## 🚀 Pasos para el despliegue

### 1. Preparar el repositorio local

Si aún no has inicializado git en el proyecto:

```bash
cd /ruta/a/winter-plan
git init
```

### 2. Configurar el nombre del repositorio en Vite

**⚠️ MUY IMPORTANTE:** Antes de continuar, edita el archivo `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/nombre-exacto-de-tu-repositorio/', // Ejemplo: '/winter-plan/'
  // ...resto de la configuración
})
```

El valor de `base` debe ser:
- `/nombre-repo/` para repositorios de proyecto
- `/` si vas a usar un dominio personalizado

### 3. Crear repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"New repository"** (o el ícono `+` → New repository)
3. Configura el repositorio:
   - **Repository name:** `winter-plan` (o el nombre que prefieras)
   - **Visibility:** Public o Private (GitHub Pages funciona con ambos)
   - **NO marques** "Initialize this repository with a README"
4. Haz clic en **"Create repository"**

### 4. Conectar tu proyecto local con GitHub

GitHub te mostrará comandos similares a estos (usa los tuyos):

```bash
git add .
git commit -m "Initial commit: Winter Plan app"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

### 5. Configurar GitHub Pages

1. En tu repositorio de GitHub, ve a **Settings** (⚙️)
2. En el menú lateral izquierdo, busca **Pages**
3. En **"Build and deployment"**:
   - **Source:** Selecciona **GitHub Actions**
4. Guarda los cambios

### 6. Desplegar automáticamente

El proyecto ya incluye un workflow de GitHub Actions (`.github/workflows/deploy.yml`). 

Cada vez que hagas `push` a la rama `main`, se desplegará automáticamente.

Para verificar el despliegue:
1. Ve a la pestaña **Actions** en tu repositorio
2. Verás el workflow "Deploy to GitHub Pages" ejecutándose
3. Espera a que termine (tarda ~2-3 minutos)
4. Una vez completado con ✅, tu sitio estará disponible

### 7. Acceder a tu sitio

Tu aplicación estará disponible en:

```
https://TU-USUARIO.github.io/TU-REPO/
```

Ejemplo:
```
https://dani.github.io/winter-plan/
```

## 🔄 Actualizaciones futuras

Para actualizar el sitio con nuevos cambios:

```bash
# Haz tus cambios en el código
git add .
git commit -m "Descripción de tus cambios"
git push origin main
```

El sitio se actualizará automáticamente en unos minutos.

## 🛠️ Despliegue manual alternativo

Si prefieres desplegar manualmente (sin GitHub Actions):

1. En GitHub Settings → Pages, cambia **Source** a **Deploy from a branch**
2. Selecciona la rama **gh-pages** como fuente
3. Ejecuta localmente:

```bash
npm run deploy
```

Este comando construirá el proyecto y lo subirá a la rama `gh-pages`.

## ⚙️ Configuración avanzada

### Usar un dominio personalizado

1. En GitHub Settings → Pages → Custom domain, ingresa tu dominio
2. Configura los registros DNS según las instrucciones de GitHub
3. En `vite.config.ts`, cambia:
   ```typescript
   base: '/'  // En lugar de '/nombre-repo/'
   ```

### Variables de entorno en producción

Si necesitas configurar variables de entorno:

1. Las variables en archivos `.env` **no se incluyen** en el build de producción
2. Para configuración pública, usa el prefijo `VITE_`:
   ```
   VITE_API_BASE_URL=https://api.livo.app
   ```
3. Para secretos, usa GitHub Secrets:
   - Settings → Secrets and variables → Actions → New repository secret
   - Modifica `.github/workflows/deploy.yml` para usar los secretos

## ❗ Solución de problemas

### Problema: Página en blanco o error 404

**Causa:** El `base` en `vite.config.ts` no coincide con el nombre del repositorio.

**Solución:**
1. Verifica el nombre exacto de tu repositorio en GitHub
2. Actualiza `vite.config.ts`:
   ```typescript
   base: '/nombre-exacto-del-repo/'  // Con las barras /
   ```
3. Haz commit y push de los cambios

### Problema: Los assets (CSS, JS) no cargan

**Causa:** Rutas incorrectas debido a configuración de `base`.

**Solución:**
1. Asegúrate de usar rutas relativas en tu código
2. Verifica que `base` en `vite.config.ts` termine con `/`
3. Reconstruye: `npm run build`

### Problema: El workflow de Actions falla

**Causas posibles:**
1. **Permisos insuficientes:**
   - Ve a Settings → Actions → General
   - En "Workflow permissions", selecciona **Read and write permissions**
   - Marca la casilla **Allow GitHub Actions to create and approve pull requests**

2. **Error en el build:**
   - Ve a Actions y revisa los logs del workflow
   - Corrige los errores localmente
   - Haz push de nuevo

### Problema: Los cambios no aparecen en el sitio

**Solución:**
1. Verifica que el workflow terminó exitosamente (pestaña Actions)
2. Espera 2-5 minutos (GitHub Pages puede tardar en actualizar)
3. Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
4. Prueba en modo incógnito

## 📚 Recursos adicionales

- [Documentación oficial de GitHub Pages](https://docs.github.com/pages)
- [Documentación de Vite sobre despliegue](https://vitejs.dev/guide/static-deploy.html#github-pages)
- [GitHub Actions para Pages](https://github.com/actions/deploy-pages)

## 🎉 ¡Listo!

Si seguiste todos los pasos, tu aplicación Winter Plan debería estar funcionando en GitHub Pages.

Para cualquier problema, revisa la sección de solución de problemas o consulta los logs en la pestaña Actions de tu repositorio.



