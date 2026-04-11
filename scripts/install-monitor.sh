#!/bin/bash

################################################################################
# Script de Instalación del Monitor de Capturas
#
# Configura el monitor como servicio systemd en Xubuntu
# Uso: sudo ./install-monitor.sh
#
################################################################################

set -e

USUARIO="${SUDO_USER:-beto}"
DIRECTORIO_BASE="/home/${USUARIO}/Documentos/Github/prospectos-leadmaster-local"
SCRIPT_MONITOR="${DIRECTORIO_BASE}/scripts/monitor-upload-capturas.sh"
SCRIPT_INSTALADO="/usr/local/bin/monitor-upload-capturas"
SERVICE_FILE="/etc/systemd/system/monitor-upload-capturas.service"

echo "📦 instalador del Monitor de Capturas"
echo "==============================================="

# Verificar que se ejecuta con permisos de administrador
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse con sudo"
    echo "   Uso: sudo $0"
    exit 1
fi

# Verificar que el usuario existe
if ! id "$USUARIO" &>/dev/null; then
    echo "❌ El usuario '$USUARIO' no existe"
    exit 1
fi

echo "✅ Ejecutando como root"
echo "✅ Usuario destino: $USUARIO"
echo ""

# Paso 1: Instalar dependencias
echo "📥 Paso 1: Instalando dependencias..."
apt-get update -qq
apt-get install -y -qq inotify-tools rsync ssh 2>/dev/null | grep -v '^Reading\|^Building\|^0 upgraded'

if ! command -v inotifywait &> /dev/null; then
    echo "❌ Error: No se pudo instalar inotify-tools"
    exit 1
fi

echo "✅ Dependencias instaladas"
echo ""

# Paso 2: Copiar script a ubicación global
echo "📋 Paso 2: Instalando script..."

if [ ! -f "$SCRIPT_MONITOR" ]; then
    echo "❌ Error: No se encontró $SCRIPT_MONITOR"
    exit 1
fi

cp "$SCRIPT_MONITOR" "$SCRIPT_INSTALADO"
chmod 755 "$SCRIPT_INSTALADO"
echo "✅ Script instalado en: $SCRIPT_INSTALADO"
echo ""

# Paso 3: Crear archivo de servicio systemd
echo "⚙️  Paso 3: Creando servicio systemd..."

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Monitor de Carga Automática de Capturas a VPS
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USUARIO
ExecStart=$SCRIPT_INSTALADO start
ExecStop=$SCRIPT_INSTALADO stop
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Entorno
Environment="HOME=/home/$USUARIO"
Environment="USER=$USUARIO"

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "$SERVICE_FILE"
echo "✅ Archivo de servicio creado"
echo ""

# Paso 4: Recargar systemd
echo "🔄 Paso 4: Recargando systemd..."
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true
echo "✅ systemd recargado"
echo ""

# Paso 5: Mostrar instrucciones de uso
echo "================================"
echo "✅ ¡INSTALACIÓN COMPLETADA!"
echo "================================"
echo ""
echo "📍 CONFIGURACIÓN REQUERIDA:"
echo "   1. Edita: $SCRIPT_INSTALADO"
echo "   2. Busca la línea: VPS_HOST=\"tu-vps.com\""
echo "   3. Reemplaza con tu VPS real:"
echo ""
echo "   Ejemplo:"
echo "      VPS_HOST=\"tu-vps-real.com\""
echo "      VPS_USER=\"root\""
echo ""
echo "📚 COMANDOS ÚTILES:"
echo ""
echo "   Iniciar servicio:"
echo "      sudo systemctl start monitor-upload-capturas"
echo ""
echo "   Ver estado:"
echo "      sudo systemctl status monitor-upload-capturas"
echo ""
echo "      O:"
echo "      monitor-upload-capturas status"
echo ""
echo "   Ver logs:"
echo "      journalctl -u monitor-upload-capturas -f"
echo ""
echo "      O:"
echo "      monitor-upload-capturas logs-live"
echo ""
echo "   Detener servicio:"
echo "      sudo systemctl stop monitor-upload-capturas"
echo ""
echo "   Activar al inicio:"
echo "      sudo systemctl enable monitor-upload-capturas"
echo ""
echo "   Desactivar al inicio:"
echo "      sudo systemctl disable monitor-upload-capturas"
echo ""
echo "================================"
echo ""
echo "⚠️  PRÓXIMOS PASOS:"
echo "   1. Editar el script con tu VPS real"
echo "   2. Hacer una prueba manual:"
echo "      monitor-upload-capturas start-bg"
echo "   3. Ver logs:"
echo "      monitor-upload-capturas logs-live"
echo "   4. Si funciona, habilitar el servicio:"
echo "      sudo systemctl enable monitor-upload-capturas"
echo "      sudo systemctl start monitor-upload-capturas"
echo ""
