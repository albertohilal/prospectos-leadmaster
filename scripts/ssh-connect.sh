#!/usr/bin/env bash
set -euo pipefail

SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-185.187.170.196}"
DEFAULT_SSH_KEY="$HOME/.ssh/leadmaster_prod"
SSH_KEY="${SSH_KEY:-$DEFAULT_SSH_KEY}"
SSH_COMMON_OPTS=(
  -o PreferredAuthentications=publickey
  -o PasswordAuthentication=no
  -o BatchMode=yes
)

if [[ -n "$SSH_KEY" && ! -r "$SSH_KEY" ]]; then
  echo "Error: SSH_KEY apunta a una clave inexistente o no legible: $SSH_KEY" >&2
  exit 1
fi

if [[ -n "$SSH_KEY" ]]; then
  ssh "${SSH_COMMON_OPTS[@]}" -i "$SSH_KEY" "$SSH_USER@$SSH_HOST"
  status=$?
  if [[ $status -eq 255 ]]; then
    echo "Error: autenticación SSH falló para ${SSH_USER}@${SSH_HOST}." >&2
    echo "Sugerencia: instala la clave pública con ./scripts/install-ssh-key.sh" >&2
  fi
  exit $status
fi

ssh "${SSH_COMMON_OPTS[@]}" "$SSH_USER@$SSH_HOST"
status=$?
if [[ $status -eq 255 ]]; then
  echo "Error: autenticación SSH falló para ${SSH_USER}@${SSH_HOST}." >&2
  echo "Sugerencia: instala la clave pública con ./scripts/install-ssh-key.sh" >&2
fi
exit $status