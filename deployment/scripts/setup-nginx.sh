#!/bin/bash

# LABSEMBLE Nginx Setup Script
# For Ubuntu 24.04 LTS

set -e  # Exit on error

echo "🚀 Starting LABSEMBLE Nginx setup..."

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

# Check if Nginx is installed
check_nginx() {
    if command -v nginx &> /dev/null; then
        log_info "Nginx is already installed."
        return 0
    else
        log_info "Nginx is not installed. Installing..."
        return 1
    fi
}

# Install Nginx
install_nginx() {
    log_info "Installing Nginx..."
    
    # Update package list
    apt update
    
    # Install Nginx
    apt install -y nginx
    
    # Check installation
    if command -v nginx &> /dev/null; then
        log_success "Nginx installation completed"
    else
        log_error "Nginx installation failed"
        exit 1
    fi
}

# Configure Nginx
configure_nginx() {
    log_info "Configuring Nginx..."
    
    # Backup original nginx.conf
    cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
    
    # Copy optimized nginx.conf
    if [[ -f "./nginx/nginx.conf" ]]; then
        cp ./nginx/nginx.conf /etc/nginx/nginx.conf
        log_success "Main Nginx configuration updated"
    else
        log_warning "Custom nginx.conf not found, using default"
    fi
    
    # Remove default site
    if [[ -f /etc/nginx/sites-enabled/default ]]; then
        rm /etc/nginx/sites-enabled/default
        log_success "Default site removed"
    fi
    
    # Create labsemble site configuration
    if [[ -f "./nginx/labsemble.conf" ]]; then
        cp ./nginx/labsemble.conf /etc/nginx/sites-available/labsemble
        ln -sf /etc/nginx/sites-available/labsemble /etc/nginx/sites-enabled/
        log_success "Labsemble site configuration created"
    else
        log_error "labsemble.conf not found"
        exit 1
    fi
    
    # Create required directories
    mkdir -p /var/www/labsemble/client/build
    mkdir -p /var/www/labsemble/uploads
    mkdir -p /var/log/labsemble
    
    # Set permissions for AWS Lightsail compatibility
    # Use www-data group for better web server compatibility
    chown -R labsemble:www-data /var/www/labsemble
    chown -R labsemble:www-data /var/log/labsemble
    
    # Set permissions - owner can read/write, group can read/write, others can read
    chmod -R 775 /var/www/labsemble
    chmod -R 775 /var/log/labsemble
    
    # Set specific directory permissions
    find /var/www/labsemble -type d -exec chmod 775 {} \;
    find /var/log/labsemble -type d -exec chmod 775 {} \;
    
    # Set specific file permissions
    find /var/www/labsemble -type f -exec chmod 664 {} \;
    find /var/log/labsemble -type f -exec chmod 664 {} \;
    
    # Ensure labsemble user is in www-data group
    usermod -aG www-data labsemble
    
    log_success "Directory permissions set for Lightsail compatibility"
    
    # Test Nginx configuration
    if nginx -t; then
        log_success "Nginx configuration test passed"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
}

# Setup Nginx service
setup_nginx_service() {
    log_info "Setting up Nginx service..."
    
    # Enable Nginx service
    systemctl enable nginx
    
    # Start Nginx service
    systemctl start nginx
    
    # Check service status
    if systemctl is-active --quiet nginx; then
        log_success "Nginx service is running"
    else
        log_error "Nginx service failed to start"
        exit 1
    fi
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    # Create logrotate configuration
    cat > /etc/logrotate.d/labsemble-nginx << EOF
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 \$(cat /var/run/nginx.pid)
        fi
    endscript
}
EOF
    
    log_success "Log rotation configuration created"
}

# Final verification
verify_nginx_setup() {
    log_info "Verifying Nginx setup..."
    
    # Check if Nginx is running
    if systemctl is-active --quiet nginx; then
        log_success "✓ Nginx service: Running"
    else
        log_error "✗ Nginx service: Stopped"
        return 1
    fi
    
    # Check if configuration is valid
    if nginx -t &> /dev/null; then
        log_success "✓ Nginx configuration: Valid"
    else
        log_error "✗ Nginx configuration: Invalid"
        return 1
    fi
    
    # Check if site is enabled
    if [[ -L /etc/nginx/sites-enabled/labsemble ]]; then
        log_success "✓ Labsemble site: Enabled"
    else
        log_error "✗ Labsemble site: Not enabled"
        return 1
    fi
    
    # Check if ports are listening
    if netstat -tlnp | grep -q ":80 "; then
        log_success "✓ Port 80: Listening"
    else
        log_error "✗ Port 80: Not listening"
        return 1
    fi
    
    log_success "Nginx setup verification completed"
}

# Main function
main() {
    log_info "Starting LABSEMBLE Nginx setup..."
    
    check_root
    
    if ! check_nginx; then
        install_nginx
    fi
    
    configure_nginx
    setup_nginx_service
    setup_log_rotation
    verify_nginx_setup
    
    log_success "🎉 Nginx setup completed!"
    
    echo ""
    echo "📋 Nginx Information:"
    echo "- Version: $(nginx -v 2>&1)"
    echo "- Status: $(systemctl is-active nginx)"
    echo "- Configuration: /etc/nginx/nginx.conf"
    echo "- Sites: /etc/nginx/sites-available/labsemble"
    echo "- Logs: /var/log/nginx/"
    echo ""
    echo "📋 Next steps:"
    echo "1. Setup SSL certificates: ./setup-ssl.sh"
    echo "2. Deploy application: ./deploy-app.sh"
    echo ""
    echo "🌐 Test Nginx:"
    echo "- HTTP: http://$(hostname -I | awk '{print $1}')"
    echo "- Configuration: sudo nginx -t"
    echo "- Status: sudo systemctl status nginx"
    echo ""
}

# Execute script
main "$@" 