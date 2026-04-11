#!/bin/bash

################################################################################
# Monitor y Upload Automático de Capturas a VPS
# 
# Monitorea la carpeta local de capturas y las sube automáticamente al VPS
# cuando se detectan archivos nuevos usando inotifywait.
#
# Uso:
#   ./monitor-upload-capturas.sh start     # Inicia el monitor
#   ./monitor-upload-capturas.sh stop      # Detiene el monitor
#   ./monitor-upload-capturas.sh status    # Muestra estado
#   ./monitor-upload-capturas.sh logs      # Muestra últimos logs
#
# Autor: LeadMaster Upload System
# Fecha: 11 de abril de 2026
################################################################################

set -u  # Error si hay variables no definidas

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

# Usuario y directorio base
USUARIO="${USER:-beto}"
DIRECTORIO_BASE="/home/${USUARIO}/Documentos/Github/prospectos-leadmaster-local"

# Directorios locales
CARPETA_LOCAL="${DIRECTORIO_BASE}/AUXILIAR/CAPTURAS"
DIRECTORIO_LOGS="${DIRECTORIO_BASE}/logs"
ARCHIVO_PID="${DIRECTORIO_LOGS}/monitor-upload.pid"
ARCHIVO_LOG="${DIRECTORIO_LOGS}/upload-capturas.log"

# Configuración SSH/Servidor
SSH_KEY="/home/${USUARIO}/.ssh/leadmaster_prod"
VPS_USER="root"
VPS_HOST="tu-vps.com"  # CAMBIAR POR TU VPS REAL
VPS_PATH="/root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster/AUXILIAR/CAPTURAS"

# Parámetros de transferencia y reintentos
RSYNC_OPTS="-avz --delete-after"  # -a: archive, -v: verbose, -z: compress
RSYNC_TIMEOUT=30
REINTENTOS_MAX=3
REINTENTOS_ESPERA=5  # segundos entre reintentos
INOTIFYWAIT_TIMEOUT=3600  # 1 hora en segundos

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

# Función: Registrar mensaje en log con timestamp
log() {
    local nivel="$1"
    shift
    local mensaje="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${nivel}] ${mensaje}" | tee -a "${ARCHIVO_LOG}"
}

# Función: Crear directorios necesarios
crear_directorios() {
    mkdir -p "${CARPETA_LOCAL}" || {
        echo "❌ Error: No se pudo crear carpeta local ${CARPETA_LOCAL}"
        exit 1
    }
    
    mkdir -p "${DIRECTORIO_LOGS}" || {
        echo "❌ Error: No se pudo crear directorio de logs ${DIRECTORIO_LOGS}"
        exit 1
    }
    
    log "INFO" "✅ Directorios verificados"
}

# Función: Verificar dependencias
verificar_dependencias() {
    local falta_algo=0
    
    # Verificar inotify-tools
    if ! command -v inotifywait &> /dev/null; then
        echo "❌ Error: inotify-tools no está instalado"
        echo "   Instálalo con: sudo apt-get install inotify-tools"
        falta_algo=1
    fi
    
    # Verificar rsync
    if ! command -v rsync &> /dev/null; then
        echo "❌ Error: rsync no está instalado"
        echo "   Instálalo con: sudo apt-get install rsync"
        falta_algo=1
    fi
    
    # Verificar ssh
    if ! command -v ssh &> /dev/null; then
        echo "❌ Error: ssh no está instalado"
        echo "   Instálalo con: sudo apt-get install openssh-client"
        falta_algo=1
    fi
    
    # Verificar clave SSH
    if [ ! -f "${SSH_KEY}" ]; then
        echo "❌ Error: Clave SSH no encontrada en ${SSH_KEY}"
        echo "   Verifica que la clave exista y los permisos sean correctos (chmod 600)"
        falta_algo=1
    else
        # Verificar permisos de clave SSH
        local permisos=$(stat -c '%a' "${SSH_KEY}" 2>/dev/null || stat -f '%A' "${SSH_KEY}" 2>/dev/null)
        if [ "$permisos" != "600" ]; then
            echo "⚠️  Advertencia: Permisos de SSH inseguros ($permisos). Corrigiendo a 600..."
            chmod 600 "${SSH_KEY}"
        fi
    fi
    
    if [ $falta_algo -eq 1 ]; then
        echo ""
        echo "❌ Faltan dependencias. Instálalas y vuelve a intentar."
        exit 1
    fi
    
    log "INFO" "✅ Todas las dependencias verificadas"
}

# Función: Verificar configuración VPS
verificar_vps() {
    if [ "${VPS_HOST}" = "tu-vps.com" ]; then
        echo "❌ Error: VPS_HOST no está configurado"
        echo "   Edita el archivo ${BASH_SOURCE[0]} y configura VPS_HOST"
        exit 1
    fi
    
    log "INFO" "Verificando conexión SSH con VPS..."
    
    if ssh -i "${SSH_KEY}" -o ConnectTimeout=5 -o StrictHostKeyChecking=no \
        "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}" 2>/dev/null; then
        log "INFO" "✅ Conexión SSH verificada. VPS accesible."
        return 0
    else
        log "ERROR" "❌ No se pudo conectar al VPS: ${VPS_USER}@${VPS_HOST}"
        log "ERROR" "   Verifica que: 1) VPS_HOST sea correcto, 2) La clave SSH funcione, 3) VPS esté en línea"
        echo ""
        echo "Intenta manualmente:"
        echo "  ssh -i ${SSH_KEY} ${VPS_USER}@${VPS_HOST} 'ls ${VPS_PATH}'"
        exit 1
    fi
}

# Función: Transferir archivo al VPS con reintentos
transferir_archivo() {
    local archivo="$1"
    local nombre_archivo=$(basename "${archivo}")
    local intento=1
    
    log "INFO" "Iniciando transferencia: ${nombre_archivo}"
    
    while [ $intento -le $REINTENTOS_MAX ]; do
        log "INFO" "Intento $intento/$REINTENTOS_MAX para ${nombre_archivo}..."
        
        # Usar rsync para transferencia eficiente
        if rsync \
            -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no -o ConnectTimeout=10" \
            ${RSYNC_OPTS} \
            --timeout=${RSYNC_TIMEOUT} \
            "${archivo}" \
            "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/" 2>&1 | tee -a "${ARCHIVO_LOG}"; then
            
            log "INFO" "✅ ${nombre_archivo} subido exitosamente al VPS"
            echo "✅ ${nombre_archivo} ➜ VPS"
            return 0
        else
            log "WARN" "❌ Intento $intento falló para ${nombre_archivo}"
            
            if [ $intento -lt $REINTENTOS_MAX ]; then
                log "INFO" "Esperando $REINTENTOS_ESPERA segundos antes de reintentar..."
                sleep $REINTENTOS_ESPERA
            fi
        fi
        
        intento=$((intento + 1))
    done
    
    log "ERROR" "❌ FALLO: No se pudo transferir ${nombre_archivo} después de $REINTENTOS_MAX intentos"
    echo "❌ ERROR: No se pudo subir ${nombre_archivo}"
    return 1
}

# Función: Iniciar el monitor
iniciar_monitor() {
    # Verificar que no esté ya corriendo
    if [ -f "${ARCHIVO_PID}" ]; then
        local pid=$(cat "${ARCHIVO_PID}")
        if kill -0 "$pid" 2>/dev/null; then
            echo "⚠️  Monitor ya está corriendo (PID: $pid)"
            log "WARN" "Intento de iniciar monitor que ya estaba activo (PID: $pid)"
            return 1
        else
            # PID antiguo, limpiar
            rm -f "${ARCHIVO_PID}"
        fi
    fi
    
    crear_directorios
    verificar_dependencias
    verificar_vps
    
    log "INFO" "================================"
    log "INFO" "🚀 INICIANDO MONITOR"
    log "INFO" "Carpeta local: ${CARPETA_LOCAL}"
    log "INFO" "VPS destino: ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"
    log "INFO" "================================"
    
    echo "🚀 Iniciando monitor de capturas..."
    echo "   Carpeta: ${CARPETA_LOCAL}"
    echo "   Destino: ${VPS_USER}@${VPS_HOST}"
    echo ""
    echo "✅ Monitor iniciado. Presiona Ctrl+C para detener."
    echo ""
    
    # Guardar PID del proceso principal
    echo $$ > "${ARCHIVO_PID}"
    
    # Loop principal usando inotifywait
    while true; do
        # Monitorear eventos: create, moved_to (para cuando se mueven archivos a la carpeta)
        inotifywait -t ${INOTIFYWAIT_TIMEOUT} \
            -e create \
            -e moved_to \
            --exclude '(\.tmp|~|\.[^/]*/tmp)$' \
            --format '%w%f' \
            "${CARPETA_LOCAL}" 2>/dev/null | while read archivo; do
            
            # Filtros para ignorar archivos temporales y carpetas
            if [ -d "${archivo}" ]; then
                log "DEBUG" "Ignorando carpeta: ${archivo}"
                continue
            fi
            
            # Ignorar archivos temporales
            if [[ "${archivo}" =~ \.(tmp|swp|~)$ ]]; then
                log "DEBUG" "Ignorando archivo temporal: ${archivo}"
                continue
            fi
            
            # Ignorar archivos del sistema
            if [[ "$(basename "${archivo}")" =~ ^\..*$ ]]; then
                log "DEBUG" "Ignorando archivo oculto: ${archivo}"
                continue
            fi
            
            # Esperar a que el archivo termine de escribirse (pequeña pausa)
            echo "📁 Archivo detectado: $(basename "${archivo}")"
            sleep 2
            
            # Verificar que el archivo aún existe y no está siendo escrito
            if [ -f "${archivo}" ]; then
                transferir_archivo "${archivo}"
            fi
        done
        
        # Si inotifywait timeout, solo continuar el loop (normal)
        if [ $? -eq 124 ]; then
            : # Timeout, continuar
        fi
    done
}

# Función: Detener el monitor
detener_monitor() {
    if [ ! -f "${ARCHIVO_PID}" ]; then
        echo "⚠️  Monitor no está corriendo"
        return 1
    fi
    
    local pid=$(cat "${ARCHIVO_PID}")
    
    if ! kill -0 "$pid" 2>/dev/null; then
        echo "⚠️  Monitor no está corriendo (PID $pid inválido)"
        rm -f "${ARCHIVO_PID}"
        return 1
    fi
    
    echo "🛑 Deteniendo monitor (PID: $pid)..."
    log "INFO" "================================"
    log "INFO" "🛑 DETENIENDO MONITOR"
    log "INFO" "================================"
    
    kill "$pid" 2>/dev/null
    
    # Esperar a que termine
    local espera=0
    while kill -0 "$pid" 2>/dev/null && [ $espera -lt 10 ]; do
        sleep 1
        espera=$((espera + 1))
    done
    
    # Forzar si es necesario
    if kill -0 "$pid" 2>/dev/null; then
        echo "   Forzando terminación..."
        kill -9 "$pid" 2>/dev/null
    fi
    
    rm -f "${ARCHIVO_PID}"
    echo "✅ Monitor detenido"
}

# Función: Mostrar estado
mostrar_estado() {
    if [ ! -f "${ARCHIVO_PID}" ]; then
        echo "⏹️  Monitor: DETENIDO"
        return
    fi
    
    local pid=$(cat "${ARCHIVO_PID}")
    
    if kill -0 "$pid" 2>/dev/null; then
        echo "🟢 Monitor: ACTIVO (PID: $pid)"
        echo "   Carpeta: ${CARPETA_LOCAL}"
        echo "   Log: ${ARCHIVO_LOG}"
    else
        echo "⏹️  Monitor: DETENIDO (archivo de PID huérfano)"
        rm -f "${ARCHIVO_PID}"
    fi
}

# Función: Mostrar logs
mostrar_logs() {
    if [ ! -f "${ARCHIVO_LOG}" ]; then
        echo "📋 No hay logs aún"
        return
    fi
    
    echo "📋 Últimas líneas del log (archivo completo en: ${ARCHIVO_LOG}):"
    echo ""
    tail -n 30 "${ARCHIVO_LOG}"
}

# Función: Ver logs en tiempo real
ver_logs_en_vivo() {
    if [ ! -f "${ARCHIVO_LOG}" ]; then
        touch "${ARCHIVO_LOG}"
    fi
    
    echo "📺 Mostrando logs en tiempo real (Ctrl+C para salir)..."
    echo ""
    tail -f "${ARCHIVO_LOG}"
}

# Función: Limpiar logs antiguos
limpiar_logs() {
    if [ -f "${ARCHIVO_LOG}" ]; then
        local lineas=$(wc -l < "${ARCHIVO_LOG}")
        if [ $lineas -gt 10000 ]; then
            echo "🧹 Limpiando logs antiguos (${lineas} líneas)..."
            tail -n 5000 "${ARCHIVO_LOG}" > "${ARCHIVO_LOG}.tmp"
            mv "${ARCHIVO_LOG}.tmp" "${ARCHIVO_LOG}"
            echo "✅ Logs limpios"
        fi
    fi
}

# Función: Mostrar ayuda
mostrar_ayuda() {
    cat << 'EOF'
📚 Monitor de Carga Automática de Capturas - AYUDA

USO:
  ./monitor-upload-capturas.sh [COMANDO]

COMANDOS:
  start               Inicia el monitor en segundo plano (usa: start-bg)
  start-bg            Inicia el monitor en segundo plano con nohup
  stop                Detiene el monitor
  status              Muestra estado del monitor
  logs                Muestra últimos logs
  logs-live           Muestra logs en tiempo real (Ctrl+C para salir)
  clean-logs          Limpia logs antiguos
  help                Muestra esta ayuda

EJEMPLOS:
  ./monitor-upload-capturas.sh start-bg
  ./monitor-upload-capturas.sh status
  ./monitor-upload-capturas.sh logs-live
  ./monitor-upload-capturas.sh stop

CONFIGURACIÓN:
  Edita las variables al inicio del script (líneas 25-51):
  - USUARIO: El usuario beto (por defecto)
  - VPS_HOST: Dirección del servidor VPS (REQUERIDO)
  - VPS_USER: Usuario en el VPS (por defecto: root)
  - VPS_PATH: Ruta en el VPS donde se suben las capturas
  - SSH_KEY: Ruta a la clave privada SSH

INSTALACIÓN COMO SERVICIO (systemd):
  1. Copia este script a /usr/local/bin/monitor-upload-capturas
  2. Crea un archivo .service en /etc/systemd/system/
  3. Activa con: systemctl enable monitor-upload-capturas
  4. Inicia con: systemctl start monitor-upload-capturas

LOGS:
  ${DIRECTORIO_LOGS}/upload-capturas.log
  
Ver logs en tiempo real:
  ./monitor-upload-capturas.sh logs-live

EOF
}

# ============================================================================
# PUNTO DE ENTRADA PRINCIPAL
# ============================================================================

main() {
    local comando="${1:-help}"
    
    # Crear directorios mínimos
    mkdir -p "${DIRECTORIO_LOGS}" 2>/dev/null || true
    
    case "${comando}" in
        start)
            # Iniciar en primer plano (útil para debugging)
            iniciar_monitor
            ;;
        start-bg)
            # Iniciar en segundo plano
            limpiar_logs
            nohup "$0" start > /dev/null 2>&1 &
            local bg_pid=$!
            echo "🚀 Monitor iniciado en segundo plano (PID: $bg_pid)"
            echo "   Para ver estado: $0 status"
            echo "   Para ver logs: $0 logs-live"
            echo "   Para detener: $0 stop"
            sleep 2
            mostrar_estado
            ;;
        stop)
            detener_monitor
            ;;
        status)
            mostrar_estado
            ;;
        logs)
            mostrar_logs
            ;;
        logs-live)
            ver_logs_en_vivo
            ;;
        clean-logs)
            limpiar_logs
            ;;
        help|--help|-h)
            mostrar_ayuda
            ;;
        *)
            echo "❌ Comando desconocido: ${comando}"
            echo ""
            mostrar_ayuda
            exit 1
            ;;
    esac
}

# Manejo de señales para limpieza
trap 'log "INFO" "Monitor interrumpido por señal"; exit 0' SIGINT SIGTERM

# Ejecutar
main "$@"
