# Scripts de Automatización - LeadMaster

Este directorio contiene scripts para gestionar el proyecto LeadMaster.

## Scripts Disponibles

### 1. `run-local.sh` - Precheck de Ejecución Local
**Propósito:** Verificar todos los requisitos antes de ejecutar el script local de captura de prospectos.

**Uso:**
```bash
# Desde la raíz del proyecto
./scripts/run-local.sh

# Con opciones:
./scripts/run-local.sh --force    # Ejecutar incluso con advertencias
./scripts/run-local.sh --test     # Ejecutar prueba de conexión con API
./scripts/run-local.sh --help     # Mostrar ayuda
```

**Qué verifica:**
- Estructura del proyecto (archivos esenciales)
- Node.js (versión >= 18) y npm
- Dependencias npm instaladas (playwright, tesseract.js, etc.)
- Playwright y navegador Chrome instalados
- Archivo de configuración `.env` con `API_URL`
- Conectividad con la API en el VPS
- Conexión opcional a la base de datos en VPS (vía SSH)

**Salida:**
- Resumen detallado de cada check (✅/⚠️/❌)
- Recomendaciones para corregir problemas
- Comando listo para ejecutar si todo está OK

### 2. `deploy.sh` - Despliegue al VPS
**Propósito:** Sincronizar el proyecto local con el servidor VPS via rsync+SSH.

**Uso:**
```bash
# Configurar variables de entorno (opcional)
export SSH_KEY=~/.ssh/mi_clave
export REMOTE_PATH=/root/prospectos-leadmaster

# Ejecutar despliegue
./scripts/deploy.sh
```

**Configuración por defecto:**
- `SSH_USER`: root
- `SSH_HOST`: 185.187.170.196
- `SSH_KEY`: ~/.ssh/leadmaster_prod
- `REMOTE_PATH`: /root/prospectos-leadmaster

### 3. `ssh-connect.sh` - Conexión SSH Rápida
**Propósito:** Conectarse al VPS con la configuración predefinida.

**Uso:**
```bash
./scripts/ssh-connect.sh
```

### 4. `install-ssh-key.sh` - Instalar Clave SSH
**Propósito:** Instalar la clave pública local en el servidor para conexión sin contraseña.

**Uso:**
```bash
./scripts/install-ssh-key.sh
```

### 5. `run-daily-batch.sh` - Tanda diaria semiautomatizada
**Propósito:** Ejecutar secuencialmente las 20 keywords (o un rango) sobre el scraper local, con objetivo por keyword para reducir trabajo manual repetitivo.

**Uso:**
```bash
# Tanda completa, 2 capturas por keyword (default)
bash ./scripts/run-daily-batch.sh

# Solo keywords 6 a 10, objetivo 2 capturas
bash ./scripts/run-daily-batch.sh --from 6 --to 10 --target 2

# Modo manual (pregunta s/n por cada captura)
bash ./scripts/run-daily-batch.sh --manual

# Simulación (no ejecuta scraper)
bash ./scripts/run-daily-batch.sh --dry-run
```

## Flujo de Trabajo Recomendado

### Para desarrolladores locales:
1. **Precheck:** `./scripts/run-local.sh`
2. **Ejecutar captura:** `node src/local/scraper-local.js "palabra clave"`
3. **Alternativa semiautomatizada:** `bash ./scripts/run-daily-batch.sh --target 2`
3. **Verificar resultados:** Conectarse al VPS y revisar base de datos

### Para despliegue de cambios:
1. **Precheck local:** `./scripts/run-local.sh`
2. **Desplegar al VPS:** `./scripts/deploy.sh`
3. **Verificar en VPS:** `./scripts/ssh-connect.sh`
4. **Reiniciar servicios si es necesario**

## Variables de Entorno

Los scripts usan las siguientes variables (pueden exportarse antes de ejecutar):

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `SSH_KEY` | Ruta a la clave privada SSH | `~/.ssh/leadmaster_prod` |
| `SSH_USER` | Usuario SSH | `root` |
| `SSH_HOST` | Host del VPS | `185.187.170.196` |
| `REMOTE_PATH` | Ruta remota en VPS | `/root/prospectos-leadmaster` |
| `API_URL` | URL de la API (para run-local.sh) | Extraída de `.env` |

## Requisitos para los Scripts

- **Bash 4+** (compatible con la mayoría de sistemas)
- **Core Unix utilities** (curl, ssh, rsync, etc.)
- **Permisos de ejecución:** `chmod +x scripts/*.sh`

## Notas de Seguridad

- Los scripts **no almacenan contraseñas** en texto plano
- La autenticación es por clave pública SSH
- El archivo `.env` debe mantenerse fuera del control de versiones
- Las claves SSH deben tener permisos restrictivos (`chmod 600`)

## Solución de Problemas

### Error "Permission denied"
```bash
chmod +x scripts/*.sh
```

### Error "No such file or directory" (bash)
Asegurarse de que la primera línea del script sea `#!/usr/bin/env bash`

### Error de conexión SSH
Verificar que la clave SSH existe y tiene permisos correctos:
```bash
ls -la ~/.ssh/leadmaster_prod
chmod 600 ~/.ssh/leadmaster_prod
```

### Error de sintaxis en macOS/Linux antiguos
Algunas versiones de Bash pueden no soportar ciertas características. En ese caso:
```bash
# Usar bash más reciente o simplificar scripts
bash --version
```

## Contribuir

Para agregar nuevos scripts:
1. Mantener compatibilidad con Bash 4+
2. Incluir manejo de errores (`set -euo pipefail`)
3. Documentar en este README
4. Probar en diferentes entornos (Linux, macOS, WSL)