# Monitor Automático de Capturas - Guía Completa

**Fecha:** 11 de abril de 2026  
**Proyecto:** LeadMaster  
**Descripción:** Sistema de carga automática de capturas desde Xubuntu al VPS

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Requisitos](#requisitos)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [Uso Manual](#uso-manual)
6. [Uso como Servicio](#uso-como-servicio)
7. [Monitoreo y Logs](#monitoreo-y-logs)
8. [Troubleshooting](#troubleshooting)

---

## Descripción General

Este sistema monitorea automáticamente la carpeta local de capturas y las sube al VPS cuando se detectan archivos nuevos.

**Características:**
- ✅ Monitoreo en tiempo real con `inotifywait`
- ✅ Reintentos automáticos en caso de fallo
- ✅ Logs detallados de todas las operaciones
- ✅ Funciona como servicio systemd (persistente)
- ✅ Manejo de errores de conexión SSH
- ✅ Filtrado de archivos temporales
- ✅ Sin requiere permisos de administrador (excepto instalación)

**Rutas:**
```
PC Local:  /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/
VPS:       /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS/
```

---

## Requisitos

### 1. Instalados en Xubuntu
```bash
# Verificar si están instalados
inotifywait --version
rsync --version
ssh -V
```

Si no están instalados, se instalarán automáticamente en la sección [Instalación](#instalación).

### 2. Clave SSH Funcional
```bash
# Verificar que la clave existe
ls -la /home/beto/.ssh/leadmaster_prod

# Probar conexión
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com "ls /root/.openclaw/" 
```

Si no funciona, asegúrate que:
- La clave tiene permisos 600: `chmod 600 /home/beto/.ssh/leadmaster_prod`
- La clave está registrada en el servidor VPS
- El VPS es accesible desde tu red

### 3. Directorios Existentes
```bash
# Crear directorios si no existen
mkdir -p /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS
mkdir -p /home/beto/Documentos/Github/prospectos-leadmaster-local/logs
```

---

## Instalación

### Opción A: Instalación Completa (Recomendado)

```bash
# 1. Dar permisos de ejecución al script de instalación
chmod +x /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/install-monitor.sh

# 2. Ejecutar con sudo
sudo /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/install-monitor.sh

# 3. Reemplazar tu VPS en el script instalado
sudo nano /usr/local/bin/monitor-upload-capturas
# Buscar: VPS_HOST="tu-vps.com" 
# Reemplazar por: VPS_HOST="tu-vps-real.com"

# 4. Guardar y salir (Ctrl+X, Y, Enter)
```

**Resultado:**
- ✅ Dependencias instaladas
- ✅ Script disponible globalmente como `monitor-upload-capturas`
- ✅ Servicio systemd creado y listo para usar

### Opción B: Instalación Manual

```bash
# 1. Dar permisos de ejecución
chmod +x /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/monitor-upload-capturas.sh

# 2. Instalar dependencias manualmente
sudo apt-get install -y inotify-tools rsync openssh-client

# 3. Crear enlace simbólico (opcional)
sudo ln -s /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/monitor-upload-capturas.sh /usr/local/bin/monitor-upload-capturas

# 4. Configura el script (ver sección [Configuración](#configuración))
```

---

## Configuración

### 1. Editar Variables del Script

```bash
# Abrir el script
nano /usr/local/bin/monitor-upload-capturas
# O, si usas ruta local:
nano /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/monitor-upload-capturas.sh
```

**Variables a configurar (líneas 25-51):**

```bash
# Línea ~35: Reemplazar "tu-vps.com" con tu VPS real
VPS_HOST="tu-vps.com"          # ❌ CAMBIAR ESTO

# Ejemplo:
VPS_HOST="192.168.1.100"       # IP del VPS
# O:
VPS_HOST="vps.leadmaster.com"  # Dominio del VPS
```

**Otras variables opcionales:**

```bash
# Si tu usuario no es "beto"
USUARIO="tu-usuario"

# Si la carpeta local está en otro lugar
CARPETA_LOCAL="/ruta/alternativa/AUXILIAR/CAPTURAS"

# Si el usuario VPS no es "root"
VPS_USER="otro-usuario"

# Si la ruta VPS es diferente
VPS_PATH="/otra/ruta/AUXILIAR/CAPTURAS"

# Si la clave SSH está en otra ubicación
SSH_KEY="/home/beto/.ssh/otra-clave"
```

### 2. Verificar Configuración

```bash
# Ver todas las variables configuradas
grep "^VPS_HOST\|^VPS_USER\|^CARPETA_LOCAL\|^SSH_KEY" /usr/local/bin/monitor-upload-capturas

# Ejemplo de salida:
# VPS_HOST="mi-vps.com"
# VPS_USER="root"
# CARPETA_LOCAL="/home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS"
# SSH_KEY="/home/beto/.ssh/leadmaster_prod"
```

---

## Uso Manual

### Iniciar Monitor (Primer Plano)

Útil para testing:

```bash
monitor-upload-capturas start
```

**Salida esperada:**
```
🚀 Iniciando monitor de capturas...
   Carpeta: /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS
   Destino: root@mi-vps.com
   
✅ Monitor iniciado. Presiona Ctrl+C para detener.
```

El script se quedará esperando eventos. Cuando guardes un archivo en la carpeta, verás:
```
📁 Archivo detectado: captura-2026-04-11.png
[2026-04-11 14:30:45] [INFO] Iniciando transferencia: captura-2026-04-11.png
[2026-04-11 14:30:48] [INFO] ✅ captura-2026-04-11.png subido exitosamente al VPS
✅ captura-2026-04-11.png ➜ VPS
```

Presiona **Ctrl+C** para detener.

### Iniciar Monitor (Segundo Plano)

```bash
monitor-upload-capturas start-bg
```

**Salida esperada:**
```
🚀 Monitor iniciado en segundo plano (PID: 12345)
   Para ver estado: monitor-upload-capturas status
   Para ver logs: monitor-upload-capturas logs-live
   Para detener: monitor-upload-capturas stop

🟢 Monitor: ACTIVO (PID: 12345)
   Carpeta: /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS
   Log: /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log
```

El monitor continuará ejecutándose incluso si cierras la terminal.

### Ver Estado

```bash
monitor-upload-capturas status
```

**Salida si está activo:**
```
🟢 Monitor: ACTIVO (PID: 12345)
   Carpeta: /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS
   Log: /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log
```

**Salida si está detenido:**
```
⏹️  Monitor: DETENIDO
```

### Detener Monitor

```bash
monitor-upload-capturas stop
```

**Salida esperada:**
```
🛑 Deteniendo monitor (PID: 12345)...
✅ Monitor detenido
```

---

## Uso como Servicio

### Habilitar Servicio (Inicia al Encender)

```bash
# Habilitar servicio para autostart
sudo systemctl enable monitor-upload-capturas

# Iniciar servicio
sudo systemctl start monitor-upload-capturas

# Verificar que está activo
sudo systemctl status monitor-upload-capturas
```

**Salida esperada:**
```
● monitor-upload-capturas.service - Monitor de Carga Automática de Capturas a VPS
     Loaded: loaded
     Active: active (running) since Mon 2026-04-11 14:00:00 UTC; 5min ago
   Main PID: 12345
```

### Deshabilitar Servicio

```bash
# Detener servicio
sudo systemctl stop monitor-upload-capturas

# Deshabilitar del autostart
sudo systemctl disable monitor-upload-capturas
```

### Ver Logs del Servicio

```bash
# Últimos logs
sudo journalctl -u monitor-upload-capturas -n 50

# Logs en tiempo real
sudo journalctl -u monitor-upload-capturas -f

# Logs de los últimos 30 minutos
sudo journalctl -u monitor-upload-capturas --since "30 minutes ago"
```

---

## Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
monitor-upload-capturas logs-live
```

Esto muestra en vivo cada evento del monitor. Presiona **Ctrl+C** para salir.

**Ejemplo de log:**
```
[2026-04-11 14:30:45] [INFO] ================================
[2026-04-11 14:30:45] [INFO] 🚀 INICIANDO MONITOR
[2026-04-11 14:30:45] [INFO] Carpeta local: /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS
[2026-04-11 14:30:45] [INFO] VPS destino: root@mi-vps.com:/root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS
[2026-04-11 14:30:45] [INFO] ================================
[2026-04-11 14:31:20] [INFO] Iniciando transferencia: captura.png
[2026-04-11 14:31:22] [INFO] ✅ captura.png subido exitosamente al VPS
[2026-04-11 14:32:15] [WARN] ❌ Intento 1 falló para documento.pdf
[2026-04-11 14:32:20] [INFO] Intento 2/3 para documento.pdf...
[2026-04-11 14:32:23] [INFO] ✅ documento.pdf subido exitosamente al VPS
```

### Ver Últimos Logs

```bash
monitor-upload-capturas logs
```

Muestra las últimas 30 líneas.

### Archivo de Log Completo

```bash
# Ver todo el archivo
cat /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log

# Ver solo las líneas de error
grep ERROR /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log

# Ver solo las transferencias exitosas
grep "✅" /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log

# Contar transferencias por hora
cut -d' ' -f1-2 /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log | uniq -c
```

### Limpiar Logs Antiguos

El script automáticamente limpia logs cuando superan 10,000 líneas. Pero puedes hacerlo manualmente:

```bash
monitor-upload-capturas clean-logs
```

---

## Test y Debugging

### 1. Test Manual de Transferencia

```bash
# Test: Crear archivo de prueba
echo "Esto es un test" > /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/test-$(date +%s).txt

# Ver logs para confirmar transferencia
monitor-upload-capturas logs-live
```

### 2. Ver Eventos de inotifywait

```bash
# Monitorear eventos en tiempo real
inotifywait -m /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/
```

Luego crea un archivo en otra terminal. Deberías ver:
```
Setting up watches.
Watches established.
AUXILIAR/CAPTURAS/ CREATE test-1712847245.txt
AUXILIAR/CAPTURAS/ OPEN test-1712847245.txt
AUXILIAR/CAPTURAS/ CLOSE WRITE,CREATE test-1712847245.txt
```

### 3. Probar Conexión SSH

```bash
# Test básico de SSH
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com "echo 'Conexión OK'"

# Test de rsync (sin transferir nada)
rsync --dry-run -e "ssh -i /home/beto/.ssh/leadmaster_prod" \
  /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/ \
  root@tu-vps.com:/root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS/
```

### 4. Verificar Archivos en VPS

```bash
# Desde tu PC:
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com "ls -lah /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS/"

# Ejemplo de salida:
# total 452K
# drwxr-xr-x 2 root root 4.0K Apr 11 14:35 .
# drwxr-xr-x 3 root root 4.0K Apr 11 10:00 ..
# -rw-r--r-- 1 root root  150K Apr 11 14:30 captura-2026-04-11.png
# -rw-r--r-- 1 root root  200K Apr 11 14:32 documento-completo.pdf
```

---

## Troubleshooting

### Problema: "inotifywait: command not found"

**Causa:** inotify-tools no está instalado

**Solución:**
```bash
sudo apt-get install inotify-tools
```

### Problema: "Permission denied (publickey)"

**Causa:** Problemas con la clave SSH

**Solución:**
```bash
# 1. Verificar permisos de clave (deben ser 600)
ls -la /home/beto/.ssh/leadmaster_prod
chmod 600 /home/beto/.ssh/leadmaster_prod

# 2. Verificar que la clave está registrada en el VPS
# En el VPS, debe estar en: /root/.ssh/authorized_keys

# 3. Probar conexión manualmente
ssh -i /home/beto/.ssh/leadmaster_prod -v root@tu-vps.com "id"
```

### Problema: Monitor se inicia pero no transfiere

**Causa:** VPS_HOST no configurado correctamente

**Solución:**
```bash
# 1. Ver configuración actual
grep VPS_HOST /usr/local/bin/monitor-upload-capturas

# 2. Editar y reemplazar tu VPS
sudo nano /usr/local/bin/monitor-upload-capturas

# 3. Buscar la línea: VPS_HOST="tu-vps.com"
# 4. Cambiar por: VPS_HOST="tu-vps-real.com"

# 5. Guardar (Ctrl+X, Y, Enter)

# 6. Reiniciar monitor
monitor-upload-capturas stop
monitor-upload-capturas start-bg
```

### Problema: Archivos no se suben aunque el monitor está activo

**Causa:** Puede haber varios problemas

**Debuggear:**
```bash
# 1. Ver logs en tiempo real
monitor-upload-capturas logs-live

# 2. En otra terminal, crear archivo de test
touch /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/test-inotify.txt

# 3. Ver qué pasa en los logs

# 4. Si ves "Ignorando archivo temporal", el patrón de filtrado está activo
#    Usa nombres sin extensiones de archivo temporal (.tmp, .swp, ~)
```

### Problema: rsync falla con timeout

**Causa:** Conexión lenta o archivo muy grande

**Solución:**
```bash
# Aumentar timeout en el script (línea ~42)
RSYNC_TIMEOUT=60  # Aumentar de 30 a 60 segundos
RSYNC_OPTS="-avz --delete-after --partial"  # Agregar --partial
```

### Problema: El monitor consume mucha CPU

**Causa:** inotifywait está mal configurado o carpeta tiene demasiados archivos

**Solución:**
```bash
# 1. Reducir los eventos monitorados (línea ~264 del script)
# Cambiar de:
# -e create -e moved_to

# A solo:
# -e create

# 2. Limpiar carpeta de archivos muy antiguos
find /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/ -type f -mtime +30 -delete
```

### Problema: Logs crecen demasiado

**Solución:**
```bash
# Limpiar logs automáticamente
monitor-upload-capturas clean-logs

# O rotar logs (crear nuevo archivo)
mv /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log \
   /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log.$(date +%Y-%m-%d)
```

---

## Comandos Rápidos (Cheat Sheet)

```bash
# Iniciar/Detener
monitor-upload-capturas start-bg               # Iniciar en segundo plano
monitor-upload-capturas stop                   # Detener
monitor-upload-capturas status                 # Ver estado

# Logs
monitor-upload-capturas logs                   # Últimas 30 líneas
monitor-upload-capturas logs-live              # En tiempo real (Ctrl+C)
tail -f /path/to/logs/upload-capturas.log     # Alternativamente

# Servicio (si está instalado)
sudo systemctl start monitor-upload-capturas   # Iniciar como servicio
sudo systemctl stop monitor-upload-capturas    # Detener servicio
sudo systemctl status monitor-upload-capturas  # Ver estado
sudo systemctl enable monitor-upload-capturas  # Autostart al encender
sudo systemctl disable monitor-upload-capturas # Deshabilitar autostart

# Testing
touch /path/to/AUXILIAR/CAPTURAS/test.txt     # Crear archivo de test
inotifywait -m /path/to/AUXILIAR/CAPTURAS/    # Monitorear eventos
```

---

## FAQ

**P: ¿Qué archivos no se suben?**  
R: Los archivos temporales (.tmp, .swp, ~), ocultos (.) y carpetas se ignoran automáticamente.

**P: ¿Puedo cambiar la carpeta de monitoreo?**  
R: Sí, edita `CARPETA_LOCAL` en el script.

**P: ¿Qué pasa si la conexión SSH falla?**  
R: El script reintenta automáticamente 3 veces con 5 segundos de espera entre intentos.

**P: ¿Los archivos se borran después de subir?**  
R: No, quedan en la PC local. Se sincronizan con rsync.

**P: ¿Puedo tener múltiples monitores?**  
R: No recomendado, pero sí técnicamente posible con PIDs diferentes.

**P: ¿Funciona si cierro sesión?**  
R: Si usas `systemctl` (servicio), sí. Si usas `start-bg`, depende de la configuración de tu sesión.

---

**Última actualización:** 11 de abril de 2026
