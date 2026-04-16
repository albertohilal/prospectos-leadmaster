#!/usr/bin/env bash
set -euo pipefail

# ============================================
# Script de precheck para LeadMaster Local
# Verifica requisitos y conectividad antes de ejecutar
# ============================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de logging
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar que estamos en la raíz del proyecto
check_project_root() {
    info "Verificando estructura del proyecto..."
    
    local required_files=("src/local/scraper-local.js" "package.json")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        error "Faltan archivos esenciales del proyecto:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        echo ""
        echo "Asegúrate de estar en la raíz del proyecto prospectos-leadmaster."
        echo "Ejecuta desde: /home/beto/Documentos/Github/prospectos-leadmaster"
        return 1
    fi
    
    success "Estructura del proyecto verificada"
    return 0
}

# Verificar Node.js y npm
check_node_npm() {
    info "Verificando Node.js y npm..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js no está instalado"
        echo "Instala Node.js 18+ desde: https://nodejs.org"
        echo "O en Ubuntu/Debian: sudo apt install nodejs npm"
        return 1
    fi
    
    local node_version
    node_version=$(node --version | cut -d'v' -f2)
    local node_major
    node_major=$(echo "$node_version" | cut -d'.' -f1)
    
    if [[ $node_major -lt 18 ]]; then
        warning "Node.js versión $node_version encontrada (se requiere >= 18)"
        echo "Considera actualizar Node.js"
    else
        success "Node.js $node_version (OK)"
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        error "npm no está instalado"
        return 1
    fi
    
    local npm_version
    npm_version=$(npm --version)
    success "npm $npm_version (OK)"
    
    return 0
}

# Verificar dependencias npm instaladas
check_npm_dependencies() {
    info "Verificando dependencias npm..."
    
    if [[ ! -d "node_modules" ]]; then
        warning "node_modules no encontrado. Las dependencias no están instaladas."
        echo "Ejecuta: npm install"
        return 1
    fi
    
    # Verificar paquetes clave
    local required_packages=("playwright" "tesseract.js")
    local missing_packages=()
    
    for pkg in "${required_packages[@]}"; do
        if ! npm list "$pkg" --depth=0 &> /dev/null; then
            missing_packages+=("$pkg")
        fi
    done
    
    if [[ ${#missing_packages[@]} -gt 0 ]]; then
        warning "Algunas dependencias faltan: ${missing_packages[*]}"
        echo "Ejecuta: npm install"
        return 1
    fi
    
    success "Dependencias npm verificadas"
    return 0
}

# Verificar Playwright y navegadores
check_playwright() {
    info "Verificando Playwright..."
    
    if ! npx playwright --version &> /dev/null; then
        warning "Playwright no está disponible o necesita instalación"
        echo "Ejecuta: npx playwright install"
        return 1
    fi
    
    local playwright_version
    playwright_version=$(npx playwright --version 2>/dev/null | head -1)
    success "Playwright $playwright_version (OK)"
    
    # Verificar Chrome instalado
    info "Verificando navegador Chrome..."
    if ! npx playwright test --browser=chromium --dry-run &> /dev/null; then
        warning "Chrome/Chromium no está instalado para Playwright"
        echo "Ejecuta: npx playwright install chrome"
        return 1
    fi
    
    success "Navegador Chrome disponible"
    return 0
}

# Verificar archivo .env
check_env_file() {
    info "Verificando configuración (.env)..."
    
    local env_file=".env"
    if [[ ! -f "$env_file" ]]; then
        if [[ -f ".env.example" ]]; then
            warning ".env no encontrado, pero existe .env.example"
            echo "Copia .env.example a .env y edítalo:"
            echo "  cp .env.example .env"
            echo "  # Edita .env y configura API_URL"
            return 1
        else
            error "No se encuentra .env ni .env.example"
            return 1
        fi
    fi
    
    # Verificar API_URL en .env
    if grep -q "API_URL=" "$env_file"; then
        local api_url
        api_url=$(grep "API_URL=" "$env_file" | cut -d'=' -f2- | tr -d '"'"'" | xargs)
        if [[ -n "$api_url" ]]; then
            success "API_URL configurada: $api_url"
            # Guardar para uso posterior
            export API_URL="$api_url"
        else
            warning "API_URL está vacía en .env"
            return 1
        fi
    else
        warning "API_URL no está definida en .env"
        return 1
    fi
    
    return 0
}

# Verificar conectividad a la API
check_api_connectivity() {
    info "Verificando conectividad a la API..."
    
    local api_url="${API_URL:-}"
    if [[ -z "$api_url" ]]; then
        # Intentar obtener de .env
        if [[ -f ".env" ]]; then
            api_url=$(grep "API_URL=" ".env" | cut -d'=' -f2- | tr -d '"'"'" | xargs)
        fi
    fi
    
    if [[ -z "$api_url" ]]; then
        warning "No se pudo determinar API_URL. Usando valor por defecto."
        api_url="http://185.187.170.196:8080/api"
    fi

    export API_URL="$api_url"
    
    # Construir endpoint de health según API_URL configurada
    # Si API_URL termina en /api -> usar /api/health
    # Si no, anexar /api/health para compatibilidad
    local health_url
    if [[ "$api_url" == */api ]]; then
        health_url="${api_url}/health"
    else
        health_url="${api_url%/}/api/health"
    fi
    
    info "Probando conexión a: $health_url"
    
    if command -v curl &> /dev/null; then
        local response
        if response=$(curl -s --max-time 10 "$health_url"); then
            if echo "$response" | grep -q '"status":"healthy"'; then
                success "API conectada y saludable"
                return 0
            else
                warning "API respondió pero no está saludable"
                echo "Respuesta: $response"
                return 1
            fi
        else
            error "No se pudo conectar a la API"
            echo "Verifica:"
            echo "  1. La API está ejecutándose en el VPS"
            echo "  2. El puerto 8080 está abierto en el firewall"
            echo "  3. La URL es correcta: $health_url"
            return 1
        fi
    else
        warning "curl no disponible, no se puede probar conectividad"
        echo "Instala curl o prueba manualmente:"
        echo "  curl $health_url"
        return 1
    fi
}

# Verificar base de datos en VPS (opcional)
check_database_connection() {
    info "Verificando base de datos (requiere SSH)..."
    
    local ssh_key="$HOME/.ssh/leadmaster_prod"
    if [[ ! -f "$ssh_key" ]]; then
        warning "Clave SSH no encontrada, omitiendo verificación de BD"
        return 0
    fi
    
    info "Intentando conectar a VPS para verificar BD..."
    if ssh -i "$ssh_key" -o ConnectTimeout=5 root@185.187.170.196 \
        "cd /root/prospectos-leadmaster 2>/dev/null || cd /root/.openclaw/workspace-leadmaster-central-hub/prospectos-leadmaster 2>/dev/null; npm run db:status 2>/dev/null || echo 'ERROR'"; then
        success "Conexión a VPS y BD verificada"
        return 0
    else
        warning "No se pudo verificar BD en VPS (puede ser normal)"
        return 0
    fi
}

# Mostrar resumen y próximos pasos
show_summary() {
    echo ""
    echo "========================================="
    echo " RESUMEN DE VERIFICACIÓN - LeadMaster Local"
    echo "========================================="
    
    local all_ok=true
    
    # Verificar cada check (simplificado)
    if check_project_root; then
        success "✓ Estructura proyecto"
    else
        error "✗ Estructura proyecto"
        all_ok=false
    fi
    
    if check_node_npm; then
        success "✓ Node.js/npm"
    else
        error "✗ Node.js/npm"
        all_ok=false
    fi
    
    if check_npm_dependencies; then
        success "✓ Dependencias npm"
    else
        warning "⚠ Dependencias npm (puede necesitar npm install)"
    fi
    
    if check_playwright; then
        success "✓ Playwright"
    else
        warning "⚠ Playwright (puede necesitar instalación)"
    fi
    
    if check_env_file; then
        success "✓ Configuración .env"
    else
        error "✗ Configuración .env"
        all_ok=false
    fi
    
    if check_api_connectivity; then
        success "✓ Conectividad API"
    else
        error "✗ Conectividad API"
        all_ok=false
    fi
    
    echo ""
    
    if [[ "$all_ok" == true ]]; then
        success "✅ TODOS LOS CHECKS PASARON"
        echo ""
        echo "Puedes ejecutar el script principal:"
        echo "  node src/local/scraper-local.js \"presupuesto para reforma de oficinas en CABA\""
        echo ""
        echo "O ejecutar prueba rápida:"
        echo "  ./scripts/run-local.sh --test"
    else
        warning "⚠ ALGUNOS CHECKS FALLARON"
        echo ""
        echo "Revisa los mensajes arriba y corrige los problemas."
        echo "Luego ejecuta nuevamente: ./scripts/run-local.sh"
        echo ""
        echo "Para ignorar advertencias y proceder:"
        echo "  ./scripts/run-local.sh --force"
    fi
}

# Ejecutar prueba rápida
run_test() {
    info "Ejecutando prueba rápida..."
    
    if ! check_api_connectivity; then
        error "No se puede ejecutar prueba sin conectividad a API"
        return 1
    fi
    
    local test_keyword="prueba-conexion-$(date +%s)"
    local test_payload=$(cat <<EOF
{
  "keyword": "$test_keyword",
  "landingUrl": "https://ejemplo.com",
  "adUrl": "https://google.com/aclk?test=1"
}
EOF
)
    
    info "Enviando prospecto de prueba a API..."
    local api_url="${API_URL:-http://185.187.170.196:8080/api}"
    
    local prospectos_url
    if [[ "$api_url" == */api ]]; then
        prospectos_url="${api_url}/prospectos"
    else
        prospectos_url="${api_url%/}/api/prospectos"
    fi

    if response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "$test_payload" "$prospectos_url"); then
        if echo "$response" | grep -Eq '"success":true|"duplicateSkipped":true|"message":"Prospecto duplicado"'; then
            success "Prueba exitosa: Prospecto enviado correctamente"
            echo "Respuesta: $response"
            return 0
        else
            warning "API respondió pero con error"
            echo "Respuesta: $response"
            return 1
        fi
    else
        error "Error enviando prospecto de prueba"
        return 1
    fi
}

# Función principal
main() {
    echo ""
    echo "========================================="
    echo " LeadMaster Local - Precheck de Ejecución"
    echo "========================================="
    echo ""
    
    local force_mode=false
    local test_mode=false
    
    # Parsear argumentos
    for arg in "$@"; do
        case "$arg" in
            --force|-f)
                force_mode=true
                ;;
            --test|-t)
                test_mode=true
                ;;
            --help|-h)
                echo "Uso: ./scripts/run-local.sh [OPCIONES]"
                echo ""
                echo "Opciones:"
                echo "  --force, -f    Ejecutar incluso si hay advertencias"
                echo "  --test, -t     Ejecutar prueba de conexión con API"
                echo "  --help, -h     Mostrar esta ayuda"
                echo ""
                exit 0
                ;;
        esac
    done
    
    # Cambiar al directorio del script si es necesario
    local script_dir
    script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
    local project_root
    project_root=$(dirname "$script_dir")
    
    if [[ "$PWD" != "$project_root" ]]; then
        info "Cambiando al directorio del proyecto: $project_root"
        cd "$project_root" || {
            error "No se pudo cambiar al directorio del proyecto"
            exit 1
        }
    fi
    
    if [[ "$test_mode" == true ]]; then
        run_test
        exit $?
    fi
    
    # Ejecutar checks
    local checks_passed=true
    
    if ! check_project_root; then
        checks_passed=false
        [[ "$force_mode" != true ]] && exit 1
    fi
    
    if ! check_node_npm; then
        checks_passed=false
        [[ "$force_mode" != true ]] && exit 1
    fi
    
    check_npm_dependencies || {
        if [[ "$force_mode" != true ]]; then
            warning "Dependencias npm no verificadas"
        fi
    }
    
    check_playwright || {
        if [[ "$force_mode" != true ]]; then
            warning "Playwright no verificado"
        fi
    }
    
    if ! check_env_file; then
        checks_passed=false
        [[ "$force_mode" != true ]] && exit 1
    fi
    
    if ! check_api_connectivity; then
        checks_passed=false
        [[ "$force_mode" != true ]] && exit 1
    fi
    
    # Verificación opcional de BD
    check_database_connection
    
    # Mostrar resumen
    show_summary
    
    if [[ "$checks_passed" == true ]]; then
        exit 0
    else
        exit 1
    fi
}

# Ejecutar script principal
main "$@"