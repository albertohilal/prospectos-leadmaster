#!/usr/bin/env bash
set -euo pipefail

# ============================================
# LeadMaster - Lanzador de tanda diaria
# Ejecuta keywords secuencialmente para scraper local
# ============================================

TARGET_CAPTURES=2
FROM_INDEX=1
TO_INDEX=20
MANUAL_MODE=false
DRY_RUN=false

KEYWORDS=(
  "presupuesto para reforma de oficinas en CABA"
  "contratar logística de distribución para alimentos"
  "cotizar seguro de responsabilidad civil para empresas"
  "alquiler de generadores eléctricos para industrias"
  "compra de insumos odontológicos por mayor"
  "servicio de mantenimiento de ascensores para edificios"
  "auditoría de seguridad e higiene para fábricas"
  "gestión de recupero de créditos para PYMES"
  "presupuesto para pintura industrial de tanques"
  "contratar vigilancia privada para obras en construcción"
  "servicio de fumigación para plantas industriales"
  "cotización de viáticos corporativos para empleados"
  "alquiler de andamios para construcción en altura"
  "proveedor de envases de vidrio para vinotecas en argentina"
  "servicio de traducción técnica para exportadores"
  "presupuesto para impermeabilización de terrazas comerciales"
  "contratar escolta privada para transporte de valores"
  "gestión de patentes municipales para flotas de camiones"
  "cotizar instalación de paneles solares para fábricas"
  "servicio de limpieza de tanques de agua para hoteles"
)

show_help() {
  cat <<EOF
Uso: bash ./scripts/run-daily-batch.sh [opciones]

Opciones:
  --target N     Capturas objetivo por keyword (default: 2)
  --from N       Índice inicial de keyword (1..20, default: 1)
  --to N         Índice final de keyword (1..20, default: 20)
  --manual       Activa confirmación manual por captura (s/n)
  --dry-run      Solo muestra qué ejecutaría, sin lanzar scraper
  --help, -h     Muestra esta ayuda

Ejemplos:
  bash ./scripts/run-daily-batch.sh
  bash ./scripts/run-daily-batch.sh --target 2 --from 6 --to 10
  bash ./scripts/run-daily-batch.sh --target 1 --manual
EOF
}

is_positive_int() {
  [[ "$1" =~ ^[0-9]+$ ]] && [[ "$1" -gt 0 ]]
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      shift
      if [[ $# -eq 0 ]] || ! is_positive_int "$1"; then
        echo "Error: --target requiere un entero positivo" >&2
        exit 1
      fi
      TARGET_CAPTURES="$1"
      ;;
    --from)
      shift
      if [[ $# -eq 0 ]] || ! is_positive_int "$1"; then
        echo "Error: --from requiere un entero positivo" >&2
        exit 1
      fi
      FROM_INDEX="$1"
      ;;
    --to)
      shift
      if [[ $# -eq 0 ]] || ! is_positive_int "$1"; then
        echo "Error: --to requiere un entero positivo" >&2
        exit 1
      fi
      TO_INDEX="$1"
      ;;
    --manual)
      MANUAL_MODE=true
      ;;
    --dry-run)
      DRY_RUN=true
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      echo "Error: opción no reconocida: $1" >&2
      echo "Usa --help para ver opciones." >&2
      exit 1
      ;;
  esac
  shift
done

if [[ "$FROM_INDEX" -lt 1 || "$FROM_INDEX" -gt 20 ]]; then
  echo "Error: --from debe estar entre 1 y 20" >&2
  exit 1
fi

if [[ "$TO_INDEX" -lt 1 || "$TO_INDEX" -gt 20 ]]; then
  echo "Error: --to debe estar entre 1 y 20" >&2
  exit 1
fi

if [[ "$FROM_INDEX" -gt "$TO_INDEX" ]]; then
  echo "Error: --from no puede ser mayor que --to" >&2
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
cd "$PROJECT_ROOT"

if [[ ! -f "src/local/scraper-local.js" ]]; then
  echo "Error: no se encontró src/local/scraper-local.js" >&2
  exit 1
fi

echo ""
echo "========================================="
echo " LeadMaster - Tanda diaria"
echo "========================================="
echo "Rango keywords: $FROM_INDEX..$TO_INDEX"
echo "Objetivo por keyword: $TARGET_CAPTURES"
echo "Confirmación por captura: $([[ "$MANUAL_MODE" == true ]] && echo "manual" || echo "automática")"
echo "Modo simulación: $([[ "$DRY_RUN" == true ]] && echo "sí" || echo "no")"
echo ""

for idx in $(seq "$FROM_INDEX" "$TO_INDEX"); do
  kw_index=$((idx - 1))
  keyword="${KEYWORDS[$kw_index]}"

  echo "--------------------------------------------------"
  echo "[$idx/20] Keyword: $keyword"
  echo "--------------------------------------------------"

  cmd=(node ./src/local/scraper-local.js "$keyword" --target "$TARGET_CAPTURES")
  if [[ "$MANUAL_MODE" == true ]]; then
    cmd+=(--manual)
  fi

  if [[ "$DRY_RUN" == true ]]; then
    printf 'DRY RUN: '
    printf '%q ' "${cmd[@]}"
    echo ""
    continue
  fi

  "${cmd[@]}"
  exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    echo "⚠️  El scraper terminó con código $exit_code en keyword $idx"
    read -r -p "¿Continuar con la siguiente keyword? (s/n): " answer
    if [[ "${answer,,}" != "s" ]]; then
      echo "⏹️  Tanda detenida por usuario."
      exit $exit_code
    fi
  fi
done

echo ""
echo "✅ Tanda completada ($FROM_INDEX..$TO_INDEX)."
