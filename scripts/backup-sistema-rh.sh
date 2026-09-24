#!/bin/bash
# Backup do PostgreSQL do Sistema RH com retenção dos últimos 7 arquivos.
# Uso na VPS:
#   BACKUP_DIR=/var/backups/sistema-rh ./scripts/backup-sistema-rh.sh
# Uso contra o aglomerado local de conferência:
#   BACKUP_CONTAINER=sistema-rh-pg-test BACKUP_USER=postgres BACKUP_DIR=./backups ./scripts/backup-sistema-rh.sh
# Sugestão de cron diário na VPS: 0 3 * * * /var/www/sistema-rh/scripts/backup-sistema-rh.sh
set -e

CONTAINER="${BACKUP_CONTAINER:-sistema-rh-postgres}"
DB_USER="${BACKUP_USER:-sistema_rh}"
DB_NAME="${BACKUP_DB:-sistema_rh}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/sistema-rh}"
KEEP="${BACKUP_KEEP:-7}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/sistema_rh_$(date +%F_%H%M).sql"

docker exec -t "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$FILE"

# Retenção: mantém os $KEEP mais recentes.
ls -t "$BACKUP_DIR"/sistema_rh_*.sql 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm --

echo "Backup OK: $FILE"
