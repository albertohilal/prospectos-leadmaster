# Guía: VS Code Remote SSH para LeadForge (Contabo)

Fecha: 6 de abril de 2026
Proyecto: LeadForge (OpenClaw-Admin)

## ¿Por qué usar VS Code Remote SSH aquí?

✅ Editas directamente en el VPS sin copiar archivos manualmente  
✅ Ejecutas comandos en `/root/OpenClaw-Admin` en tiempo real  
✅ Ves logs de `npm start` y Gateway mientras ajustas código  
✅ Evitas desincronización entre local y servidor

---

## 1) Instalar extensión en VS Code local

1. Abre VS Code en tu máquina local
2. Ve a extensiones (`Ctrl+Shift+X`)
3. Busca: **Remote - SSH**
4. Instala: `ms-vscode-remote.remote-ssh`

---

## 2) Configurar host SSH

Abre tu `~/.ssh/config` y agrega (o ajusta) este bloque:

```sshconfig
Host leadforge-prod
    HostName 185.187.170.196
    User root
    Port 22
    IdentityFile ~/.ssh/leadmaster_prod
```

> Nota: en este proyecto ya se está usando autenticación por clave (sin password), igual que en `scripts/ssh-connect.sh`.

---

## 3) Conectar con Remote SSH

1. `F1` o `Ctrl+Shift+P`
2. Ejecuta: **Remote-SSH: Connect to Host...**
3. Selecciona: **leadforge-prod**
4. Espera la instalación del servidor remoto de VS Code (primera vez)

---

## 4) Abrir carpeta del proyecto en remoto

Una vez dentro del servidor:

1. `File > Open Folder`
2. Abre: `/root/OpenClaw-Admin`

---

## 5) Flujo recomendado para depuración del Gateway

En la terminal integrada remota (`Ctrl+``):

```bash
cd /root/OpenClaw-Admin
node -c server/gateway.js
npm start
```

Para revisar salud del Gateway:

```bash
curl http://localhost:18789/health
```

Para revisar conexión WS:

```bash
wscat -c ws://localhost:18789
```

---

## 6) Comandos útiles de operación

```bash
# estado de procesos
ps aux | grep -E "node|openclaw|gateway"

# revisar puertos
ss -ltnp | grep -E "3000|18789"

# reinicio rápido de app (si usas npm directamente)
pkill -f "node --env-file=.env server/index.js" || true
cd /root/OpenClaw-Admin && npm start
```

Si manejas proceso con PM2:

```bash
pm2 restart openclaw-admin
pm2 logs openclaw-admin --lines 100
```

---

## 7) Buenas prácticas para evitar errores como `[object Object]`

- Confirmar contrato de constructores antes de cambiar instanciación
- Validar tipo de URL antes de crear `WebSocket`
- Ejecutar `node -c` antes de reiniciar servicio
- Mantener backup rápido previo a cambios en `/root/OpenClaw-Admin/server`

---

## 8) Sincronización con tu repo local

Cuando vuelvas al entorno local:

```bash
cd ~/Documentos/Github/prospectos-leadmaster
# si hiciste cambios en remoto y también versionas ahí, trae/integra cambios
# (según tu flujo: git pull, rsync, o commit/push desde remoto)
```

Si quieres, puedo agregarte una versión corta de esta guía en el `README.md` principal del repo para tenerla siempre visible.
