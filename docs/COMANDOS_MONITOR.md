# Comandos para el Monitor de Capturas - Uso Manual

**Fecha:** 11 de abril de 2026  
**Proyecto:** LeadMaster

## Comandos básicos

| Acción | Comando | Descripción |
|---|---|---|
| Iniciar monitor en segundo plano | `monitor-upload-capturas start-bg` | Arranca el monitor sin bloquear la terminal |
| Ver estado del monitor | `monitor-upload-capturas status` | Muestra si el monitor está activo y el PID |
| Ver últimos logs | `monitor-upload-capturas logs` | Muestra las últimas líneas del archivo de registro |
| Ver logs en tiempo real | `monitor-upload-capturas logs-live` | Sigue en vivo el archivo de registro |
| Detener monitor | `monitor-upload-capturas stop` | Detiene el proceso del monitor |

## Flujo de trabajo típico

1. Asegúrate de que el script ya está configurado con tu VPS real en `VPS_HOST`.
2. Inicia el monitor en segundo plano:

```bash
monitor-upload-capturas start-bg
```

3. Verifica que el monitor esté activo:

```bash
monitor-upload-capturas status
```

4. Coloca capturas en la carpeta local:

```bash
cp /ruta/origen/tu-captura.png /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/
```

5. Revisa los logs para confirmar la subida:

```bash
monitor-upload-capturas logs-live
```

6. Cuando termines, detén el monitor:

```bash
monitor-upload-capturas stop
```

## Subir capturas viejas manualmente con rsync

Si necesitas subir archivos antiguos que ya están en la carpeta local, usa este comando:

```bash
rsync -avz -e "ssh -i /home/beto/.ssh/leadmaster_prod -o StrictHostKeyChecking=no" \
  /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/ \
  root@tu-vps.com:/root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS/
```

Cambia `tu-vps.com` por la dirección real de tu VPS.

## Verificar que las capturas llegaron al VPS

```bash
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com \
  "ls -lah /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS/"
```

Si la conexión es correcta, verás los archivos transferidos.

## Solución rápida de problemas comunes

### El monitor no arranca

- Verifica el script y la configuración de `VPS_HOST`:

```bash
grep "^VPS_HOST" /usr/local/bin/monitor-upload-capturas
```

- Asegúrate de que la clave SSH existe y tiene permisos 600:

```bash
ls -la /home/beto/.ssh/leadmaster_prod
chmod 600 /home/beto/.ssh/leadmaster_prod
```

- Prueba la conexión SSH manual:

```bash
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com "echo OK"
```

### El monitor está activo pero no detecta archivos

- Verifica que los archivos no sean temporales (`.tmp`, `.swp`, `~`, archivos ocultos).
- Usa un archivo simple de prueba:

```bash
touch /home/beto/Documentos/Github/prospectos-leadmaster-local/AUXILIAR/CAPTURAS/test-monitor.txt
```

- Revisa los logs:

```bash
monitor-upload-capturas logs-live
```

### La subida falla por conexión SSH

- Verifica que el VPS está accesible:

```bash
ssh -i /home/beto/.ssh/leadmaster_prod root@tu-vps.com "hostname"
```

- Si falla, revisa el host y la clave.
- Comprueba que el servidor acepta la clave en `/root/.ssh/authorized_keys`.

### No aparecen mensajes de éxito en los logs

- Abre el registro completo:

```bash
cat /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log
```

- Busca errores con:

```bash
grep "ERROR\|WARN" /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/upload-capturas.log
```

### Necesito detener el monitor rápido

```bash
monitor-upload-capturas stop
```

Si el PID quedó huérfano, puedes matar el proceso con:

```bash
cat /home/beto/Documentos/Github/prospectos-leadmaster-local/logs/monitor-upload.pid
kill <PID>
```

## Nota final

Este documento está pensado para uso diario y manual sin servicio systemd. Mantén siempre actualizada la variable `VPS_HOST` y usa la clave SSH `/home/beto/.ssh/leadmaster_prod`.
