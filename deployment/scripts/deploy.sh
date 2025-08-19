#!/bin/bash

# LABSEMBLE Complete Deployment Automation Script
# For Ubuntu 24.04 LTS on AWS Lightsail

set -e  # Exit on error

echo "🚀 Starting LABSEMBLE complete deployment for AWS Lightsail..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 변수 설정
DOMAIN="labsemble.com"
GIT_REPO="https://github.com/your-username/labsemble.git"
DEPLOY_PATH="/var/www/labsemble"
MONGODB_INSTALL="true"
LIGHTSAIL_OPTIMIZE="true"

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
check_lightsail_environment() {
    log_info "Checking AWS Lightsail environment..."
    
    # Check for Lightsail specific indicators
    if [[ -f "/etc/cloud/cloud.cfg" ]] && grep -q "lightsail" /etc/cloud/cloud.cfg 2>/dev/null; then
        log_success "✓ Detected AWS Lightsail environment"
        LIGHTSAIL_OPTIMIZE="true"
    elif [[ -f "/var/log/cloud-init-output.log" ]] && grep -q "lightsail" /var/log/cloud-init-output.log 2>/dev/null; then
        log_success "✓ Detected AWS Lightsail environment"
        LIGHTSAIL_OPTIMIZE="true"
    elif hostname | grep -q "lightsail"; then
        log_success "✓ Detected AWS Lightsail environment"
        LIGHTSAIL_OPTIMIZE="true"
    else
        log_warning "⚠ Not detected as Lightsail, but continuing with Lightsail optimizations..."
        LIGHTSAIL_OPTIMIZE="true"
    fi
}

# Get user input
get_user_input() {
    log_info "Checking deployment settings..."
    
    read -p "Enter domain name (default: $DOMAIN): " input_domain
    if [[ ! -z "$input_domain" ]]; then
        DOMAIN="$input_domain"
    fi
    
    read -p "Enter Git repository URL (default: $GIT_REPO): " input_repo
    if [[ ! -z "$input_repo" ]]; then
        GIT_REPO="$input_repo"
    fi
    
    read -p "Install MongoDB? (y/N, default: y): " input_mongodb
    if [[ ! -z "$input_mongodb" ]]; then
        if [[ "$input_mongodb" =~ ^[Yy]$ ]]; then
            MONGODB_INSTALL="true"
        else
            MONGODB_INSTALL="false"
        fi
    fi
    
    read -p "Apply Lightsail optimizations? (Y/n, default: y): " input_lightsail
    if [[ ! -z "$input_lightsail" ]]; then
        if [[ "$input_lightsail" =~ ^[Nn]$ ]]; then
            LIGHTSAIL_OPTIMIZE="false"
        else
            LIGHTSAIL_OPTIMIZE="true"
        fi
    fi
    
    log_success "Domain: $DOMAIN"
    log_success "Git repository: $GIT_REPO"
    log_success "MongoDB installation: $MONGODB_INSTALL"
    log_success "Lightsail optimizations: $LIGHTSAIL_OPTIMIZE"
}

# Server basic setup
setup_server() {
    log_info "Step 1: Starting server basic setup..."
    
    if [[ -f "./setup-server.sh" ]]; then
        chmod +x ./setup-server.sh
        ./setup-server.sh
    else
        log_error "setup-server.sh file not found."
        exit 1
    fi
    
    log_success "Server basic setup completed"
}

# Lightsail specific setup
setup_lightsail() {
    if [[ "$LIGHTSAIL_OPTIMIZE" == "true" ]]; then
        log_info "Step 2: Starting Lightsail specific setup..."
        
        if [[ -f "./setup-lightsail.sh" ]]; then
            chmod +x ./setup-lightsail.sh
            ./setup-lightsail.sh
        else
            log_warning "setup-lightsail.sh file not found. Skipping Lightsail optimizations."
        fi
        
        log_success "Lightsail setup completed"
    else
        log_info "Step 2: Skipping Lightsail optimizations (user choice)"
    fi
}

# Install Node.js
install_nodejs() {
    log_info "Step 3: Starting Node.js installation..."
    
    if [[ -f "./install-nodejs.sh" ]]; then
        chmod +x ./install-nodejs.sh
        ./install-nodejs.sh
    else
        log_error "install-nodejs.sh file not found."
        exit 1
    fi
    
    log_success "Node.js installation completed"
}

# Install MongoDB (optional)
install_mongodb() {
    if [[ "$MONGODB_INSTALL" == "true" ]]; then
        log_info "Step 4: Starting MongoDB installation..."
        
        if [[ -f "./install-mongodb.sh" ]]; then
            chmod +x ./install-mongodb.sh
            ./install-mongodb.sh
        else
            log_error "install-mongodb.sh file not found."
            exit 1
        fi
        
        log_success "MongoDB installation completed"
    else
        log_info "Step 4: Skipping MongoDB installation (user choice)"
    fi
}

# Setup Nginx
setup_nginx() {
    log_info "Step 5: Starting Nginx setup..."
    
    if [[ -f "./setup-nginx.sh" ]]; then
        chmod +x ./setup-nginx.sh
        ./setup-nginx.sh
    else
        log_error "setup-nginx.sh file not found."
        exit 1
    fi
    
    log_success "Nginx setup completed"
}

# Setup SSL certificates
setup_ssl() {
    log_info "Step 6: Starting SSL certificate setup..."
    
    if [[ -f "./setup-ssl.sh" ]]; then
        chmod +x ./setup-ssl.sh
        ./setup-ssl.sh
    else
        log_error "setup-ssl.sh file not found."
        exit 1
    fi
    
    log_success "SSL certificate setup completed"
}

# Deploy application
deploy_app() {
    log_info "Step 7: Starting application deployment..."
    
    if [[ -f "./deploy-app.sh" ]]; then
        chmod +x ./deploy-app.sh
        ./deploy-app.sh
    else
        log_error "deploy-app.sh file not found."
        exit 1
    fi
    
    log_success "Application deployment completed"
}

# Setup monitoring and logging
setup_monitoring() {
    log_info "Step 8: Setting up monitoring and logging..."
    
    # Setup log rotation
    if [[ -f "../monitoring/logrotate.conf" ]]; then
        cp ../monitoring/logrotate.conf /etc/logrotate.d/labsemble
        log_success "Log rotation configuration installed"
    else
        log_warning "Log rotation configuration not found"
    fi
    
    # Setup monitoring script
    if [[ -f "../monitoring/monitoring.sh" ]]; then
        cp ../monitoring/monitoring.sh /usr/local/bin/labsemble-monitor
        chmod +x /usr/local/bin/labsemble-monitor
        log_success "Monitoring script installed"
        
        # Create cron job for monitoring (every 15 minutes)
        cat > /etc/cron.d/labsemble-monitor << EOF
*/15 * * * * root /usr/local/bin/labsemble-monitor
EOF
        log_success "Monitoring cron job created"
    else
        log_warning "Monitoring script not found"
    fi
    
    # Setup systemd services
    if [[ -f "../systemd/labsemble.service" ]]; then
        cp ../systemd/labsemble.service /etc/systemd/system/
        systemctl daemon-reload
        systemctl enable labsemble
        log_success "LABSEMBLE systemd service installed"
    else
        log_warning "LABSEMBLE systemd service not found"
    fi
    
    if [[ -f "../systemd/nginx.service" ]]; then
        cp ../systemd/nginx.service /etc/systemd/system/
        systemctl daemon-reload
        log_success "Nginx systemd service updated"
    else
        log_warning "Nginx systemd service not found"
    fi
    
    log_success "Monitoring and logging setup completed"
}

# Final verification
final_check() {
    log_info "Step 9: Starting final verification..."
    
    # Check service status
    log_info "Checking service status..."
    
    # Nginx status
    if systemctl is-active --quiet nginx; then
        log_success "✓ Nginx: Running"
    else
        log_error "✗ Nginx: Stopped"
    fi
    
    # MongoDB status (if installed)
    if [[ "$MONGODB_INSTALL" == "true" ]]; then
        if systemctl is-active --quiet mongod; then
            log_success "✓ MongoDB: Running"
        else
            log_error "✗ MongoDB: Stopped"
        fi
    fi
    
    # PM2 status
    if command -v pm2 &> /dev/null; then
        PM2_STATUS=$(pm2 status | grep "labsemble-server" | awk '{print $10}' || echo "not_found")
        if [[ "$PM2_STATUS" == "online" ]]; then
            log_success "✓ PM2: Running"
        else
            log_warning "⚠ PM2: Status check needed ($PM2_STATUS)"
        fi
    fi
    
    # Check ports
    log_info "Checking port status..."
    if netstat -tlnp | grep -q ":80 "; then
        log_success "✓ Port 80: Open"
    else
        log_error "✗ Port 80: Closed"
    fi
    
    if netstat -tlnp | grep -q ":443 "; then
        log_success "✓ Port 443: Open"
    else
        log_error "✗ Port 443: Closed"
    fi
    
    if netstat -tlnp | grep -q ":5000 "; then
        log_success "✓ Port 5000: Open"
    else
        log_error "✗ Port 5000: Closed"
    fi
    
    if [[ "$MONGODB_INSTALL" == "true" ]]; then
        if netstat -tlnp | grep -q ":27017 "; then
            log_success "✓ Port 27017: Open"
        else
            log_error "✗ Port 27017: Closed"
        fi
    fi
    
    # Check SSL certificate
    log_info "Checking SSL certificate..."
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        log_success "✓ SSL certificate: Exists"
        
        # Check certificate expiration
        CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
        log_info "✓ SSL certificate expires: $CERT_EXPIRY"
    else
        log_warning "⚠ SSL certificate: Check needed"
    fi
    
    # Check application files
    log_info "Checking application files..."
    if [[ -f "$DEPLOY_PATH/server/.env" ]]; then
        log_success "✓ Environment file: Exists"
    else
        log_warning "⚠ Environment file: Not found"
    fi
    
    if [[ -d "$DEPLOY_PATH/client/build" ]]; then
        log_success "✓ Client build: Exists"
    else
        log_warning "⚠ Client build: Not found"
    fi
    
    if [[ -f "$DEPLOY_PATH/ecosystem.config.js" ]]; then
        log_success "✓ PM2 config: Exists"
    else
        log_warning "⚠ PM2 config: Not found"
    fi
    
    # Check application health
    log_info "Checking application health..."
    sleep 5  # Wait for application to be ready
    
    if curl -s -f "http://localhost:5000/api/health" &> /dev/null; then
        log_success "✓ Application API: Responding"
    else
        log_warning "⚠ Application API: Health check failed"
    fi
    
    if curl -s -f "http://localhost/health" &> /dev/null; then
        log_success "✓ Nginx health: Responding"
    else
        log_warning "⚠ Nginx health: Check failed"
    fi
    
    log_success "Final verification completed"
}

# Deployment completion message
deployment_complete() {
    echo ""
    echo "🎉🎉🎉 LABSEMBLE deployment completed on AWS Lightsail! 🎉🎉🎉"
    echo ""
    echo "📋 Deployment information:"
    echo "- Domain: $DOMAIN"
    echo "- Deployment path: $DEPLOY_PATH"
    echo "- Git repository: $GIT_REPO"
    echo "- MongoDB installed: $MONGODB_INSTALL"
    echo "- Lightsail optimizations: $LIGHTSAIL_OPTIMIZE"
    echo ""
    echo "☁️ AWS Lightsail specific features:"
    echo "- Cloud-init optimized for performance"
    echo "- Network settings optimized for Lightsail"
    echo "- Monitoring every 5 minutes"
    echo "- Daily backup system"
    echo ""
    echo "🌐 Access test:"
    echo "- HTTP: http://$DOMAIN (redirects to HTTPS)"
    echo "- HTTPS: https://$DOMAIN"
    echo "- API: https://$DOMAIN/api/health"
    echo "- Health check: https://$DOMAIN/health"
    echo ""
    echo "🔧 Management commands:"
    echo "- PM2 status: pm2 status"
    echo "- PM2 logs: pm2 logs labsemble-server"
    echo "- PM2 restart: pm2 restart labsemble-server"
    echo "- Nginx status: sudo systemctl status nginx"
    echo "- Nginx restart: sudo systemctl restart nginx"
    if [[ "$MONGODB_INSTALL" == "true" ]]; then
        echo "- MongoDB status: sudo systemctl status mongod"
        echo "- MongoDB restart: sudo systemctl restart mongod"
    fi
    echo ""
    echo "📁 Log locations:"
    echo "- Application: $DEPLOY_PATH/logs/"
    echo "- Nginx: /var/log/nginx/"
    echo "- MongoDB: /var/log/mongodb/"
    echo "- System: /var/log/syslog"
    echo "- Monitoring: /var/log/labsemble/monitoring.log"
    echo "- Lightsail monitor: /var/log/lightsail-monitor.log"
    echo ""
    echo "📊 Monitoring:"
    echo "- Manual monitoring: /usr/local/bin/labsemble-monitor"
    echo "- Lightsail monitoring: /usr/local/bin/lightsail-monitor.sh"
    echo "- Auto monitoring: Every 15 minutes via cron"
    echo "- Log rotation: Daily via logrotate"
    echo ""
    echo "⚠️  Important notes:"
    echo "- Check and modify environment variable files in $DEPLOY_PATH/server/.env"
    echo "- Verify database connections (if MongoDB installed)"
    echo "- SSL certificates auto-renew every 60 days"
    echo "- Check monitoring logs for any issues"
    echo "- Set up regular backups for MongoDB (if installed)"
    echo "- Lightsail console access available via AWS console"
    echo ""
    echo "🔄 Quick deployment for updates:"
    echo "- Run: cd $DEPLOY_PATH && ./deploy.sh"
    echo ""
}

# Main function
main() {
    log_info "Starting LABSEMBLE complete deployment for AWS Lightsail..."
    
    check_root
    check_lightsail_environment
    get_user_input
    setup_server
    setup_lightsail
    install_nodejs
    install_mongodb
    setup_nginx
    setup_ssl
    deploy_app
    setup_monitoring
    final_check
    deployment_complete
}

# Execute script
main "$@" 