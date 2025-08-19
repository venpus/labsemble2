#!/bin/bash

# AWS Lightsail Specific Setup Script
# For Ubuntu 24.04 LTS on AWS Lightsail

set -e  # Exit on error

echo "☁️ Starting AWS Lightsail specific setup..."

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        exit 1
    fi
}

# Check if running on Lightsail
check_lightsail() {
    log_info "Checking if running on AWS Lightsail..."
    
    # Check for Lightsail specific indicators
    if [[ -f "/etc/cloud/cloud.cfg" ]] && grep -q "lightsail" /etc/cloud/cloud.cfg 2>/dev/null; then
        log_success "Detected AWS Lightsail environment"
        return 0
    elif [[ -f "/var/log/cloud-init-output.log" ]] && grep -q "lightsail" /var/log/cloud-init-output.log 2>/dev/null; then
        log_success "Detected AWS Lightsail environment"
        return 0
    elif hostname | grep -q "lightsail"; then
        log_success "Detected AWS Lightsail environment"
        return 0
    else
        log_warning "Not detected as Lightsail, but continuing with Lightsail optimizations..."
        return 0
    fi
}

# Optimize for Lightsail
optimize_lightsail() {
    log_info "Optimizing for AWS Lightsail..."
    
    # Update system
    apt update
    
    # Install Lightsail specific packages
    apt install -y \
        cloud-init \
        cloud-utils \
        awscli \
        htop \
        iotop \
        nethogs
    
    # Configure cloud-init for better performance
    if [[ -f "/etc/cloud/cloud.cfg" ]]; then
        # Backup original config
        cp /etc/cloud/cloud.cfg /etc/cloud/cloud.cfg.backup
        
        # Optimize cloud-init settings
        sed -i 's/package_update: true/package_update: false/' /etc/cloud/cloud.cfg
        sed -i 's/package_upgrade: true/package_upgrade: false/' /etc/cloud/cloud.cfg
        
        log_success "Cloud-init optimized for Lightsail"
    fi
    
    # Optimize system settings for Lightsail
    cat >> /etc/sysctl.conf << EOF

# AWS Lightsail optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
EOF
    
    # Apply sysctl changes
    sysctl -p
    
    log_success "Lightsail optimizations completed"
}

# Setup Lightsail specific networking
setup_lightsail_networking() {
    log_info "Setting up Lightsail specific networking..."
    
    # Configure network interfaces
    if [[ -f "/etc/netplan/50-cloud-init.yaml" ]]; then
        log_info "Configuring netplan for Lightsail..."
        
        # Backup original config
        cp /etc/netplan/50-cloud-init.yaml /etc/netplan/50-cloud-init.yaml.backup
        
        # Create optimized netplan config
        cat > /etc/netplan/50-cloud-init.yaml << EOF
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 100
      dhcp6: false
      optional: true
    eth1:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 200
      dhcp6: false
      optional: true
EOF
        
        # Apply netplan
        netplan apply
        
        log_success "Netplan configured for Lightsail"
    fi
    
    # Optimize network settings
    cat >> /etc/sysctl.conf << EOF

# Network optimizations for Lightsail
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
EOF
    
    # Apply changes
    sysctl -p
    
    log_success "Lightsail networking setup completed"
}

# Setup Lightsail specific security
setup_lightsail_security() {
    log_info "Setting up Lightsail specific security..."
    
    # Configure UFW for Lightsail
    ufw --force reset
    
    # Allow SSH (important for Lightsail console access)
    ufw allow ssh
    
    # Allow web ports
    ufw allow 80
    ufw allow 443
    ufw allow 3000
    ufw allow 5000
    
    # Allow Lightsail specific ports if needed
    ufw allow 22/tcp
    
    # Enable UFW
    ufw --force enable
    
    # Check UFW status
    ufw status
    
    log_success "Lightsail security setup completed"
}

# Setup monitoring for Lightsail
setup_lightsail_monitoring() {
    log_info "Setting up Lightsail monitoring..."
    
    # Create monitoring script
    cat > /usr/local/bin/lightsail-monitor.sh << 'EOF'
#!/bin/bash
# Lightsail Monitoring Script

LOG_FILE="/var/log/lightsail-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

# Log system status
echo "$DATE - CPU: ${CPU_USAGE}%, Memory: ${MEMORY_USAGE}%, Disk: ${DISK_USAGE}%, Load: $LOAD_AVG" >> $LOG_FILE

# Check if services are running
if ! systemctl is-active --quiet nginx; then
    echo "$DATE - ERROR: Nginx is not running" >> $LOG_FILE
fi

if ! systemctl is-active --quiet mongod; then
    echo "$DATE - WARNING: MongoDB is not running" >> $LOG_FILE
fi

# Check disk space
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$DATE - WARNING: Disk usage is high: ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
    echo "$DATE - WARNING: Memory usage is high: ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# Keep log file size manageable
if [ -f "$LOG_FILE" ] && [ $(stat -c%s "$LOG_FILE") -gt 1048576 ]; then
    tail -1000 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi
EOF
    
    # Make script executable
    chmod +x /usr/local/bin/lightsail-monitor.sh
    
    # Create cron job for monitoring (every 5 minutes)
    cat > /etc/cron.d/lightsail-monitor << EOF
*/5 * * * * root /usr/local/bin/lightsail-monitor.sh
EOF
    
    log_success "Lightsail monitoring setup completed"
}

# Setup backup for Lightsail
setup_lightsail_backup() {
    log_info "Setting up Lightsail backup..."
    
    # Create backup script
    cat > /usr/local/bin/lightsail-backup.sh << 'EOF'
#!/bin/bash
# Lightsail Backup Script

BACKUP_DIR="/var/backups/labsemble"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="labsemble_backup_$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
if [ -d "/var/www/labsemble" ]; then
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" -C /var/www/labsemble .
    echo "$(date): Application backup created: ${BACKUP_NAME}_app.tar.gz" >> /var/log/lightsail-backup.log
fi

# Backup configuration files
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz" \
    /etc/nginx \
    /etc/mongod.conf \
    /etc/logrotate.d/labsemble \
    /etc/cron.d/lightsail-monitor \
    /etc/cron.d/mongodb-backup

echo "$(date): Configuration backup created: ${BACKUP_NAME}_config.tar.gz" >> /var/log/lightsail-backup.log

# Backup logs
if [ -d "/var/log/labsemble" ]; then
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}_logs.tar.gz" -C /var/log/labsemble .
    echo "$(date): Logs backup created: ${BACKUP_NAME}_logs.tar.gz" >> /var/log/lightsail-backup.log
fi

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t *.tar.gz | tail -n +8 | xargs -r rm

echo "$(date): Backup completed successfully" >> /var/log/lightsail-backup.log
EOF
    
    # Make script executable
    chmod +x /usr/local/bin/lightsail-backup.sh
    
    # Create cron job for daily backup
    cat > /etc/cron.daily/lightsail-backup << EOF
#!/bin/bash
/usr/local/bin/lightsail-backup.sh
EOF
    
    chmod +x /etc/cron.daily/lightsail-backup
    
    log_success "Lightsail backup setup completed"
}

# Main function
main() {
    log_info "Starting AWS Lightsail specific setup..."
    
    check_root
    check_lightsail
    optimize_lightsail
    setup_lightsail_networking
    setup_lightsail_security
    setup_lightsail_monitoring
    setup_lightsail_backup
    
    log_success "🎉 AWS Lightsail setup completed!"
    
    echo ""
    echo "☁️ Lightsail Optimizations Applied:"
    echo "- Cloud-init optimized for better performance"
    echo "- Network settings optimized for Lightsail"
    echo "- Security configured for Lightsail environment"
    echo "- Monitoring setup (every 5 minutes)"
    echo "- Backup system configured (daily)"
    echo ""
    echo "📋 Monitoring & Backup:"
    echo "- Manual monitoring: /usr/local/bin/lightsail-monitor.sh"
    echo "- Manual backup: /usr/local/bin/lightsail-backup.sh"
    echo "- Monitor logs: tail -f /var/log/lightsail-monitor.log"
    echo "- Backup logs: tail -f /var/log/lightsail-backup.log"
    echo ""
    echo "🔄 Next steps:"
    echo "1. Continue with main deployment: ./deploy.sh"
    echo "2. Or run individual scripts as needed"
    echo ""
}

# Execute script
main "$@" 