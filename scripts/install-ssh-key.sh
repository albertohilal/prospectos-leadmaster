#!/usr/bin/env bash
set -euo pipefail

SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-185.187.170.196}"
DEFAULT_SSH_KEY="$HOME/.ssh/leadmaster_prod"
SSH_KEY="${SSH_KEY:-$DEFAULT_SSH_KEY}"
PUB_KEY="${SSH_KEY}.pub"

if [[ ! -r "$SSH_KEY" ]]; then
  echo "Error: clave privada no encontrada o no legible: $SSH_KEY" >&2
  exit 1
fi

if [[ ! -r "$PUB_KEY" ]]; then
  echo "Error: clave pública no encontrada o no legible: $PUB_KEY" >&2
  exit 1
fi

if ! command -v ssh-copy-id >/dev/null 2>&1; then
  echo "Error: ssh-copy-id no está instalado en este sistema." >&2
  exit 1
fi

echo "Instalando $PUB_KEY en ${SSH_USER}@${SSH_HOST}"
echo "Se puede solicitar la contraseña del servidor una sola vez."
ssh-copy-id -i "$PUB_KEY" "${SSH_USER}@${SSH_HOST}"

echo "Clave instalada. Prueba ahora: ./scripts/ssh-connect.sh"