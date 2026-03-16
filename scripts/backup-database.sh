#!/bin/bash

###############################################################################
# OPENLOOP DATABASE BACKUP SCRIPT
# Automated daily backup to S3 with retention policy
# Usage: bash scripts/backup-database.sh
###############################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="backup-${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
  local level=$1
  shift
  local message="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${timestamp}] [${level}] ${message}" >> "$LOG_FILE"
  
  if [[ "$level" == "ERROR" ]]; then
    echo -e "${RED}[${level}] ${message}${NC}"
  elif [[ "$level" == "SUCCESS" ]]; then
    echo -e "${GREEN}[${level}] ${message}${NC}"
  elif [[ "$level" == "WARN" ]]; then
    echo -e "${YELLOW}[${level}] ${message}${NC}"
  else
    echo "[${level}] ${message}"
  fi
}

# Check required environment variables
check_env() {
  if [[ -z "${DATABASE_URL}" ]]; then
    log "ERROR" "DATABASE_URL not set"
    exit 1
  fi
}

# Create backup directory
setup_backup_dir() {
  if [[ ! -d "${BACKUP_DIR}" ]]; then
    mkdir -p "${BACKUP_DIR}"
    log "INFO" "Created backup directory: ${BACKUP_DIR}"
  fi
}

# Create backup
create_backup() {
  log "INFO" "Starting database backup..."
  
  if pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_PATH}.gz" 2>/dev/null; then
    local size=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
    log "SUCCESS" "Backup created: ${BACKUP_FILE} (${size})"
    return 0
  else
    log "ERROR" "Failed to create backup"
    return 1
  fi
}

# Verify backup integrity
verify_backup() {
  log "INFO" "Verifying backup integrity..."
  
  if gzip -t "${BACKUP_PATH}.gz" 2>/dev/null; then
    log "SUCCESS" "Backup integrity verified"
    return 0
  else
    log "ERROR" "Backup integrity check failed"
    rm -f "${BACKUP_PATH}.gz"
    return 1
  fi
}

# Upload to S3
upload_to_s3() {
  if [[ -z "${AWS_BACKUP_BUCKET}" ]]; then
    log "WARN" "AWS_BACKUP_BUCKET not set - skipping S3 upload"
    return 0
  fi

  if ! command -v aws &> /dev/null; then
    log "WARN" "AWS CLI not found - skipping S3 upload"
    return 0
  fi

  log "INFO" "Uploading to S3..."
  
  if aws s3 cp "${BACKUP_PATH}.gz" "s3://${AWS_BACKUP_BUCKET}/${BACKUP_FILE}.gz" \
    --region "${AWS_REGION:-us-east-1}" 2>/dev/null; then
    log "SUCCESS" "Uploaded to s3://${AWS_BACKUP_BUCKET}/${BACKUP_FILE}.gz"
    return 0
  else
    log "WARN" "Failed to upload to S3 (continuing...)"
    return 0 # Don't fail the entire backup if S3 upload fails
  fi
}

# Cleanup old local backups (keep last 7 days)
cleanup_local() {
  log "INFO" "Cleaning up old local backups (keeping 7 days)..."
  
  local deleted=0
  while IFS= read -r old_file; do
    if rm -f "${old_file}"; then
      ((deleted++))
      log "INFO" "Deleted: $(basename "$old_file")"
    fi
  done < <(find "${BACKUP_DIR}" -name "backup-*.sql.gz" -mtime +7)
  
  log "SUCCESS" "Cleanup complete (deleted ${deleted} files)"
}

# Cleanup old S3 backups (keep 30 days)
cleanup_s3() {
  if [[ -z "${AWS_BACKUP_BUCKET}" ]]; then
    return 0
  fi

  if ! command -v aws &> /dev/null; then
    return 0
  fi

  log "INFO" "Cleaning up old S3 backups (keeping 30 days)..."
  
  local cutoff_date=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)
  local deleted=0

  while IFS= read -r line; do
    local date=$(echo "$line" | awk '{print $1}')
    local file=$(echo "$line" | awk '{print $4}')
    
    if [[ "$date" < "$cutoff_date" ]]; then
      if aws s3 rm "s3://${AWS_BACKUP_BUCKET}/${file}" \
        --region "${AWS_REGION:-us-east-1}" 2>/dev/null; then
        ((deleted++))
        log "INFO" "Deleted S3: ${file}"
      fi
    fi
  done < <(aws s3 ls "s3://${AWS_BACKUP_BUCKET}/" --recursive \
    --region "${AWS_REGION:-us-east-1}" 2>/dev/null || true)

  log "SUCCESS" "S3 cleanup complete (deleted ${deleted} files)"
}

# Get backup info
get_backup_info() {
  local size=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
  local count=$(find "${BACKUP_DIR}" -name "backup-*.sql.gz" -type f | wc -l)
  
  log "INFO" "Backup Summary:"
  log "INFO" "  File: ${BACKUP_FILE}.gz"
  log "INFO" "  Size: ${size}"
  log "INFO" "  Location: ${BACKUP_PATH}.gz"
  log "INFO" "  Local backups: ${count}"
  
  if command -v aws &> /dev/null && [[ -n "${AWS_BACKUP_BUCKET}" ]]; then
    local s3_count=$(aws s3 ls "s3://${AWS_BACKUP_BUCKET}/" --recursive \
      --region "${AWS_REGION:-us-east-1}" 2>/dev/null | wc -l || echo "unknown")
    log "INFO" "  S3 backups: ${s3_count}"
  fi
}

# Main execution
main() {
  log "INFO" "╔════════════════════════════════════════════════════════╗"
  log "INFO" "║         OPENLOOP DATABASE BACKUP SCRIPT                ║"
  log "INFO" "║         $(date '+%Y-%m-%d %H:%M:%S')                         ║"
  log "INFO" "╚════════════════════════════════════════════════════════╝"
  
  check_env
  setup_backup_dir
  
  if ! create_backup; then
    log "ERROR" "Backup failed"
    exit 1
  fi
  
  if ! verify_backup; then
    log "ERROR" "Backup verification failed"
    exit 1
  fi
  
  upload_to_s3
  cleanup_local
  cleanup_s3
  get_backup_info
  
  log "SUCCESS" "Backup process completed successfully!"
  exit 0
}

# Run main
main "$@"
