#!/bin/bash

# LABSEMBLE Server Monitoring Script
# For Ubuntu 24.04 LTS on AWS Lightsail

set -e  # Exit on error

echo "📊 Starting LABSEMBLE server monitoring for AWS Lightsail..."

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

# Variables
LOG_FILE="/var/log/labsemble/monitoring.log"
ALERT_EMAIL="admin@labsemble.com"
# Lightsail 환경에 맞는 임계값 조정
DISK_THRESHOLD=85
MEMORY_THRESHOLD=85
CPU_THRESHOLD=85

# Create log directory if it doesn't exist
mkdir -p /var/log/labsemble

# Log function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Check Lightsail specific resources
check_lightsail_resources() {
    log_info "Checking Lightsail specific resources..."
    
    # Check cloud-init status
    if systemctl is-active --quiet cloud-init; then
        log_success "✓ Cloud-init: Running"
        log_message "INFO: Cloud-init service is running"
    else
        log_warning "⚠ Cloud-init: Not running"
        log_message "WARNING: Cloud-init service not running"
    fi
    
    # Check AWS CLI availability
    if command -v aws &> /dev/null; then
        log_success "✓ AWS CLI: Available"
        log_message "INFO: AWS CLI is available"
    else
        log_warning "⚠ AWS CLI: Not available"
        log_message "WARNING: AWS CLI not available"
    fi
    
    # Check network interfaces (Lightsail specific)
    if ip link show eth0 &> /dev/null; then
        log_success "✓ Network interface eth0: Available"
        log_message "INFO: Network interface eth0 is available"
    else
        log_warning "⚠ Network interface eth0: Not available"
        log_message "WARNING: Network interface eth0 not available"
    fi
    
    if ip link show eth1 &> /dev/null; then
        log_success "✓ Network interface eth1: Available"
        log_message "INFO: Network interface eth1 is available"
    else
        log_warning "⚠ Network interface eth1: Not available"
        log_message "WARNING: Network interface eth1 not available"
    fi
}

# Check system resources
check_system_resources() {
    log_info "Checking system resources..."
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
        log_warning "CPU usage is high: ${CPU_USAGE}%"
        log_message "WARNING: CPU usage is high: ${CPU_USAGE}%"
    else
        log_success "CPU usage: ${CPU_USAGE}%"
        log_message "INFO: CPU usage: ${CPU_USAGE}%"
    fi
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
        log_warning "Memory usage is high: ${MEMORY_USAGE}%"
        log_message "WARNING: Memory usage is high: ${MEMORY_USAGE}%"
    else
        log_success "Memory usage: ${MEMORY_USAGE}%"
        log_message "INFO: Memory usage: ${MEMORY_USAGE}%"
    fi
    
    # Disk usage
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
        log_warning "Disk usage is high: ${DISK_USAGE}%"
        log_message "WARNING: Disk usage is high: ${DISK_USAGE}%"
    else
        log_success "Disk usage: ${DISK_USAGE}%"
        log_message "INFO: Disk usage: ${DISK_USAGE}%"
    fi
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    log_info "Load average: $LOAD_AVG"
    log_message "INFO: Load average: $LOAD_AVG"
}

# Check service status
check_services() {
    log_info "Checking service status..."
    
    # Nginx status
    if systemctl is-active --quiet nginx; then
        log_success "✓ Nginx: Running"
        log_message "INFO: Nginx service is running"
    else
        log_error "✗ Nginx: Stopped"
        log_message "ERROR: Nginx service is stopped"
        
        # Try to restart Nginx
        log_info "Attempting to restart Nginx..."
        if systemctl start nginx; then
            log_success "Nginx restarted successfully"
            log_message "INFO: Nginx restarted successfully"
        else
            log_error "Failed to restart Nginx"
            log_message "ERROR: Failed to restart Nginx"
        fi
    fi
    
    # MongoDB status
    if systemctl is-active --quiet mongod; then
        log_success "✓ MongoDB: Running"
        log_message "INFO: MongoDB service is running"
    else
        log_error "✗ MongoDB: Stopped"
        log_message "ERROR: MongoDB service is stopped"
        
        # Try to restart MongoDB
        log_info "Attempting to restart MongoDB..."
        if systemctl start mongod; then
            log_success "MongoDB restarted successfully"
            log_message "INFO: MongoDB restarted successfully"
        else
            log_error "Failed to restart MongoDB"
            log_message "ERROR: Failed to restart MongoDB"
        fi
    fi
    
    # PM2 status
    if command -v pm2 &> /dev/null; then
        PM2_STATUS=$(pm2 status | grep "labsemble-server" | awk '{print $10}' || echo "not_found")
        if [[ "$PM2_STATUS" == "online" ]]; then
            log_success "✓ PM2: Running"
            log_message "INFO: PM2 process is running"
        else
            log_warning "⚠ PM2: Status check needed ($PM2_STATUS)"
            log_message "WARNING: PM2 process status: $PM2_STATUS"
            
            # Try to restart PM2 process
            if [[ "$PM2_STATUS" != "online" ]]; then
                log_info "Attempting to restart PM2 process..."
                if pm2 restart labsemble-server; then
                    log_success "PM2 process restarted successfully"
                    log_message "INFO: PM2 process restarted successfully"
                else
                    log_error "Failed to restart PM2 process"
                    log_message "ERROR: Failed to restart PM2 process"
                fi
            fi
        fi
    else
        log_warning "PM2 not found"
        log_message "WARNING: PM2 not found"
    fi
}

# Check port status
check_ports() {
    log_info "Checking port status..."
    
    # Port 80 (HTTP)
    if netstat -tlnp | grep -q ":80 "; then
        log_success "✓ Port 80: Open"
        log_message "INFO: Port 80 is open"
    else
        log_error "✗ Port 80: Closed"
        log_message "ERROR: Port 80 is closed"
    fi
    
    # Port 443 (HTTPS)
    if netstat -tlnp | grep -q ":443 "; then
        log_success "✓ Port 443: Open"
        log_message "INFO: Port 443 is open"
    else
        log_warning "⚠ Port 443: Closed (SSL not configured)"
        log_message "WARNING: Port 443 is closed"
    fi
    
    # Port 5000 (API)
    if netstat -tlnp | grep -q ":5000 "; then
        log_success "✓ Port 5000: Open"
        log_message "INFO: Port 5000 is open"
    else
        log_error "✗ Port 5000: Closed"
        log_message "ERROR: Port 5000 is closed"
    fi
    
    # Port 27017 (MongoDB)
    if netstat -tlnp | grep -q ":27017 "; then
        log_success "✓ Port 27017: Open"
        log_message "INFO: Port 27017 is open"
    else
        log_error "✗ Port 27017: Closed"
        log_message "ERROR: Port 27017 is closed"
    fi
}

# Check application health
check_application_health() {
    log_info "Checking application health..."
    
    # Check if application is responding
    if curl -s -f "http://localhost:5000/api/health" &> /dev/null; then
        log_success "✓ Application: Responding"
        log_message "INFO: Application is responding"
    else
        log_warning "⚠ Application: Health check failed"
        log_message "WARNING: Application health check failed"
    fi
    
    # Check if Nginx is serving content
    if curl -s -f "http://localhost/health" &> /dev/null; then
        log_success "✓ Nginx: Serving content"
        log_message "INFO: Nginx is serving content"
    else
        log_warning "⚠ Nginx: Content serving check failed"
        log_message "WARNING: Nginx content serving check failed"
    fi
}

# Check SSL certificate
check_ssl_certificate() {
    log_info "Checking SSL certificate..."
    
    # Check if SSL certificate exists
    if [[ -f "/etc/letsencrypt/live/labsemble.com/fullchain.pem" ]]; then
        log_success "✓ SSL certificate: Exists"
        log_message "INFO: SSL certificate exists"
        
        # Check certificate expiration
        CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/labsemble.com/fullchain.pem | cut -d= -f2)
        log_info "✓ SSL certificate expires: $CERT_EXPIRY"
        log_message "INFO: SSL certificate expires: $CERT_EXPIRY"
        
        # Check if certificate expires within 30 days
        EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
        CURRENT_DATE=$(date +%s)
        DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))
        
        if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
            log_warning "⚠ SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
            log_message "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
        fi
    else
        log_warning "⚠ SSL certificate: Not found"
        log_message "WARNING: SSL certificate not found"
    fi
}

# Check log files
check_log_files() {
    log_info "Checking log files..."
    
    # Check log file sizes
    LOG_FILES=(
        "/var/log/nginx/error.log"
        "/var/log/nginx/access.log"
        "/var/log/mongodb/mongod.log"
        "/var/log/labsemble/app.log"
    )
    
    for log_file in "${LOG_FILES[@]}"; do
        if [[ -f "$log_file" ]]; then
            LOG_SIZE=$(du -h "$log_file" | cut -f1)
            log_info "✓ $log_file: $LOG_SIZE"
            log_message "INFO: $log_file size: $LOG_SIZE"
            
            # Check if log file is too large (>100MB)
            LOG_SIZE_BYTES=$(du -b "$log_file" | cut -f1)
            if [ "$LOG_SIZE_BYTES" -gt 104857600 ]; then
                log_warning "⚠ $log_file is large: $LOG_SIZE"
                log_message "WARNING: $log_file is large: $LOG_SIZE"
            fi
        else
            log_warning "⚠ $log_file: Not found"
            log_message "WARNING: $log_file not found"
        fi
    done
}

# Generate monitoring report
generate_report() {
    log_info "Generating monitoring report..."
    
    REPORT_FILE="/var/log/labsemble/monitoring-report-$(date +%Y%m%d).txt"
    
    {
        echo "LABSEMBLE Server Monitoring Report"
        echo "Generated: $(date)"
        echo "=================================="
        echo ""
        echo "System Resources:"
        echo "- CPU Usage: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}')%"
        echo "- Memory Usage: $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')%"
        echo "- Disk Usage: $(df / | tail -1 | awk '{print $5}')"
        echo "- Load Average: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
        echo ""
        echo "Service Status:"
        echo "- Nginx: $(systemctl is-active nginx)"
        echo "- MongoDB: $(systemctl is-active mongod)"
        echo "- PM2: $(pm2 status | grep 'labsemble-server' | awk '{print $10}' || echo 'not_found')"
        echo ""
        echo "Port Status:"
        echo "- Port 80: $(netstat -tlnp | grep -q ':80 ' && echo 'Open' || echo 'Closed')"
        echo "- Port 443: $(netstat -tlnp | grep -q ':443 ' && echo 'Open' || echo 'Closed')"
        echo "- Port 5000: $(netstat -tlnp | grep -q ':5000 ' && echo 'Open' || echo 'Closed')"
        echo "- Port 27017: $(netstat -tlnp | grep -q ':27017 ' && echo 'Open' || echo 'Closed')"
        echo ""
        echo "Application Health:"
        echo "- API Response: $(curl -s -f 'http://localhost:5000/api/health' &> /dev/null && echo 'OK' || echo 'Failed')"
        echo "- Nginx Response: $(curl -s -f 'http://localhost/health' &> /dev/null && echo 'OK' || echo 'Failed')"
        echo ""
        echo "SSL Certificate:"
        if [[ -f "/etc/letsencrypt/live/labsemble.com/fullchain.pem" ]]; then
            echo "- Status: Exists"
            echo "- Expires: $(openssl x509 -enddate -noout -in /etc/letsencrypt/live/labsemble.com/fullchain.pem | cut -d= -f2)"
        else
            echo "- Status: Not found"
        fi
    } > "$REPORT_FILE"
    
    log_success "Monitoring report generated: $REPORT_FILE"
    log_message "INFO: Monitoring report generated: $REPORT_FILE"
}

# Main function
main() {
    log_info "Starting LABSEMBLE server monitoring..."
    
    # Create log file header
    echo "=== LABSEMBLE Server Monitoring Started: $(date) ===" >> "$LOG_FILE"
    
    check_lightsail_resources
    check_system_resources
    check_services
    check_ports
    check_application_health
    check_ssl_certificate
    check_log_files
    generate_report
    
    # Create log file footer
    echo "=== LABSEMBLE Server Monitoring Completed: $(date) ===" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    log_success "🎉 Server monitoring completed!"
    
    echo ""
    echo "📊 Monitoring Information:"
    echo "- Log file: $LOG_FILE"
    echo "- Report file: /var/log/labsemble/monitoring-report-$(date +%Y%m%d).txt"
    echo ""
    echo "📋 Next steps:"
    echo "- Check log files for any warnings or errors"
    echo "- Review monitoring report"
    echo "- Address any issues found"
    echo ""
    echo "🔄 To run monitoring again:"
    echo "- Manual: ./monitoring.sh"
    echo "- Cron: Add to crontab for automated monitoring"
    echo ""
}

# Execute script
main "$@" 