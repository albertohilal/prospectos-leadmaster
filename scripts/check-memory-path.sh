#!/usr/bin/env bash
set -euo pipefail

EXPECTED_LINK="/project/openclaw"
REAL_ROOT="/root/.openclaw"
WORKSPACE_REL="workspace-leadmaster-central-hub/prospectos-leadmaster"
REAL_MEMORY_DIR="${REAL_ROOT}/${WORKSPACE_REL}/memory"
LINK_MEMORY_DIR="${EXPECTED_LINK}/${WORKSPACE_REL}/memory"

DATE_STR="${1:-$(date +%F)}"
CANONICAL_FILE_REAL="${REAL_MEMORY_DIR}/${DATE_STR}.md"
CANONICAL_FILE_LINK="${LINK_MEMORY_DIR}/${DATE_STR}.md"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo "[PASS] $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "[FAIL] $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

echo "== OpenClaw memory path health-check =="
echo "Date file target: ${DATE_STR}.md"
echo

# 1) Symlink base
if [[ -L "${EXPECTED_LINK}" ]]; then
  TARGET="$(readlink "${EXPECTED_LINK}")"
  if [[ "${TARGET}" == "${REAL_ROOT}" ]]; then
    pass "Symlink ${EXPECTED_LINK} -> ${REAL_ROOT}"
  else
    fail "Symlink ${EXPECTED_LINK} apunta a ${TARGET} (esperado: ${REAL_ROOT})"
  fi
else
  fail "No existe symlink en ${EXPECTED_LINK}"
fi

# 2) Real memory dir
if [[ -d "${REAL_MEMORY_DIR}" ]]; then
  pass "Directorio real existe: ${REAL_MEMORY_DIR}"
else
  fail "No existe directorio real: ${REAL_MEMORY_DIR}"
fi

# 3) Link memory dir
if [[ -d "${LINK_MEMORY_DIR}" ]]; then
  pass "Directorio vía symlink existe: ${LINK_MEMORY_DIR}"
else
  fail "No existe directorio vía symlink: ${LINK_MEMORY_DIR}"
fi

# 4) Canonical file check (no timestamp variants required)
if [[ -f "${CANONICAL_FILE_REAL}" ]]; then
  pass "Archivo canónico existe (real): ${CANONICAL_FILE_REAL}"
else
  echo "[INFO] Archivo canónico no existe aún, se puede crear con:"
  echo "       mkdir -p '${REAL_MEMORY_DIR}' && printf '# ${DATE_STR}\n\n' > '${CANONICAL_FILE_REAL}'"
fi

# 5) If exists by real path, ensure visible by symlink path
if [[ -f "${CANONICAL_FILE_REAL}" ]]; then
  if [[ -f "${CANONICAL_FILE_LINK}" ]]; then
    pass "Archivo canónico accesible por ruta esperada: ${CANONICAL_FILE_LINK}"
  else
    fail "Archivo canónico NO accesible por ruta esperada: ${CANONICAL_FILE_LINK}"
  fi
fi

# 6) Timestamp variant warning for same date
VARIANTS=$(find "${REAL_MEMORY_DIR}" -maxdepth 1 -type f -name "${DATE_STR}-*.md" | wc -l | tr -d ' ')
if [[ "${VARIANTS}" == "0" ]]; then
  pass "No hay variantes timestamp para ${DATE_STR}"
else
  fail "Se detectaron ${VARIANTS} variantes timestamp para ${DATE_STR} (debe usarse solo ${DATE_STR}.md)"
  find "${REAL_MEMORY_DIR}" -maxdepth 1 -type f -name "${DATE_STR}-*.md" -print
fi

echo
if [[ "${FAIL_COUNT}" -eq 0 ]]; then
  echo "Resultado: OK (${PASS_COUNT} checks exitosos)"
  exit 0
else
  echo "Resultado: FAIL (${FAIL_COUNT} fallos, ${PASS_COUNT} checks exitosos)"
  exit 1
fi
