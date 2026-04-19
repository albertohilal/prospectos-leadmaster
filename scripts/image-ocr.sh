#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  ./scripts/image-ocr.sh <ruta_imagen> [--lang spa+eng] [--out salida.txt] [--md salida.md]

Ejemplos:
  ./scripts/image-ocr.sh ./screenshots/captura.png
  ./scripts/image-ocr.sh ./screenshots/captura.png --lang eng --out /tmp/captura.txt
  ./scripts/image-ocr.sh ./screenshots/captura.png --md ./memory/ocr-2026-04-15.md

Notas:
- Requiere tesseract instalado.
- Ejecuta dos pasadas OCR (psm 6 y psm 4) y devuelve la de mayor longitud.
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

if ! command -v tesseract >/dev/null 2>&1; then
  echo "ERROR: tesseract no está instalado en este host." >&2
  exit 1
fi

IMAGE_PATH=""
LANG="spa+eng"
OUT_FILE=""
MD_FILE=""

IMAGE_PATH="$1"
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --lang)
      LANG="$2"
      shift 2
      ;;
    --out)
      OUT_FILE="$2"
      shift 2
      ;;
    --md)
      MD_FILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Parámetro no reconocido: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "ERROR: No existe la imagen: $IMAGE_PATH" >&2
  exit 1
fi

TMP6="$(mktemp)"
TMP4="$(mktemp)"
trap 'rm -f "$TMP6" "$TMP4"' EXIT

tesseract "$IMAGE_PATH" stdout -l "$LANG" --psm 6 > "$TMP6" 2>/dev/null || true
tesseract "$IMAGE_PATH" stdout -l "$LANG" --psm 4 > "$TMP4" 2>/dev/null || true

LEN6=$(wc -c < "$TMP6" | tr -d ' ')
LEN4=$(wc -c < "$TMP4" | tr -d ' ')

if [[ "$LEN6" -ge "$LEN4" ]]; then
  BEST_FILE="$TMP6"
  BEST_MODE="psm6"
else
  BEST_FILE="$TMP4"
  BEST_MODE="psm4"
fi

TEXT="$(cat "$BEST_FILE")"

if [[ -z "${TEXT// }" ]]; then
  echo "WARN: OCR sin contenido útil (imagen: $IMAGE_PATH, lang: $LANG)." >&2
fi

if [[ -n "$OUT_FILE" ]]; then
  mkdir -p "$(dirname "$OUT_FILE")"
  printf "%s\n" "$TEXT" > "$OUT_FILE"
fi

if [[ -n "$MD_FILE" ]]; then
  mkdir -p "$(dirname "$MD_FILE")"
  {
    echo "# OCR $(date +%F)"
    echo
    echo "- Imagen: $IMAGE_PATH"
    echo "- Idioma: $LANG"
    echo "- Modo elegido: $BEST_MODE"
    echo
    echo "## Texto extraído"
    echo
    echo '```text'
    printf "%s\n" "$TEXT"
    echo '```'
  } > "$MD_FILE"
fi

echo "[OCR] imagen=$IMAGE_PATH lang=$LANG best=$BEST_MODE len=${#TEXT}"
printf "%s\n" "$TEXT"
