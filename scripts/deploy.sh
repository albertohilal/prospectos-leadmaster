#!/usr/bin/env bash
set -euo pipefail

SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-185.187.170.196}"
DEFAULT_SSH_KEY="$HOME/.ssh/leadmaster_prod"
SSH_KEY="${SSH_KEY:-$DEFAULT_SSH_KEY}"
REMOTE_PATH="${REMOTE_PATH:-/root/prospectos-leadmaster}"

SSH_OPTS=(
  -o PreferredAuthentications=publickey
  -o PasswordAuthentication=no
  -o BatchMode=yes
)

if [[ -n "$SSH_KEY" && ! -r "$SSH_KEY" ]]; then
  echo "Error: SSH_KEY apunta a una clave inexistente o no legible: $SSH_KEY" >&2
  exit 1
fi

if [[ -n "$SSH_KEY" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY")
fi

echo "Sincronizando proyecto a ${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"
rsync -avz --exclude ".git" --exclude "node_modules" --exclude "__pycache__" -e "ssh ${SSH_OPTS[*]}" ./ "${SSH_USER}@${SSH_HOST}:${REMOTE_PATH}"
status=$?
if [[ $status -eq 255 ]]; then
  echo "Error: autenticación SSH falló para ${SSH_USER}@${SSH_HOST}." >&2
  echo "Sugerencia: instala la clave pública con ./scripts/install-ssh-key.sh" >&2
  exit $status
fi

echo "Despliegue finalizado"