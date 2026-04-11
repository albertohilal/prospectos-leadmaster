# INSTALACIÓN RÁPIDA - Monitor de Capturas

## Paso 1: Instalación (5 minutos)

```bash
# Dar permisos de ejecución
chmod +x /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/install-monitor.sh

# Ejecutar instalador
sudo /home/beto/Documentos/Github/prospectos-leadmaster-local/scripts/install-monitor.sh
```

## Paso 2: Configuración REQUERIDA (2 minutos)

```bash
# DEBES cambiar "tu-vps.com" por tu VPS real
sudo nano /usr/local/bin/monitor-upload-capturas
```

Encuentra esta línea (alrededor de la línea 35):
```bash
VPS_HOST="tu-vps.com"  # ❌ CAMBIAR ESTO
```

Reemplázala por tu VPS real:
```bash
VPS_HOST="tu-ip-o-dominio-vps"  # ✅ Tu VPS aquí
```

Ejemplo:
```bash
VPS_HOST="192.168.1.100"
# O:
VPS_HOST="vps.example.com"
```

Guarda con: `Ctrl+X`, `Y`, `Enter`

## Paso 3: Test Manual (2 minutos)

```bash
# Iniciar en segundo plano
monitor-upload-capturas start-bg

# Ver estado
monitor-upload-capturas status

# Ver logs en tiempo real (en otra terminal)
monitor-upload-capturas logs-live

# En otra terminal: crear archivo de test
touch /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/test-$(date +%s).png

# Deberías ver en los logs:
# ✅ test-*.png subido exitosamente al VPS
```

Presiona `Ctrl+C` para salir de los logs.

## Paso 4: Activar como Servicio (Persistente)

Si el test funcionó, activar como servicio:

```bash
# Habilitar autostart
sudo systemctl enable monitor-upload-capturas

# Iniciar servicio
sudo systemctl start monitor-upload-capturas

# Ver estado
sudo systemctl status monitor-upload-capturas

# Ver logs (en tiempo real)
sudo journalctl -u monitor-upload-capturas -f
```

---

## Comandos del Día a Día

```bash
# Ver si está activo
monitor-upload-capturas status

# Ver logs
monitor-upload-capturas logs-live

# Iniciar manualmente (si no lo hiciste como servicio)
monitor-upload-capturas start-bg

# Detener
monitor-upload-capturas stop

# Si usas systemctl:
sudo systemctl status monitor-upload-capturas
sudo systemctl restart monitor-upload-capturas
sudo journalctl -u monitor-upload-capturas -f
```

---

## Verificar que Funciona

### En tu PC local:

Coloca un archivo en la carpeta:
```bash
cp /ruta/de/tu/captura.png /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/
```

### Espera 1-2 segundos

### Ver logs:
```bash
monitor-upload-capturas logs-live
```

Deberías ver algo como:
```
📁 Archivo detectado: captura.png
[2026-04-11 14:30:45] [INFO] Iniciando transferencia: captura.png
✅ captura.png ➜ VPS
[2026-04-11 14:30:48] [INFO] ✅ captura.png subido exitosamente al VPS
```

### Verificar en VPS:

```bash
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com \
  "ls -lah /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS/"
```

Si ves el archivo ahí, ¡funciona perfectamente! ✅

---

## Solucionar Problemas

### "tu-vps.com cannot be resolved"
- Edita el script y reemplaza con tu VPS REAL
- `sudo nano /usr/local/bin/monitor-upload-capturas`

### "Permission denied (publickey)"
- Verifica que la clave SSH funcione:
  ```bash
  ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com "id"
  ```
- Si no funciona, configura la clave en el VPS nuevamente

### "inotifywait: command not found"
- Instala: `sudo apt-get install inotify-tools`

### Los archivos no se suben
- Ver logs: `monitor-upload-capturas logs-live`
- Crear archivo de test y observar qué pasa en los logs

---

## Más Información

Ver guía completa: [GUIA-MONITOR-CAPTURAS.md](GUIA-MONITOR-CAPTURAS.md)

---

**¡Listo! La solución está funcionando automáticamente. 🎉**
