#!/bin/bash

# LABSEMBLE Server Initial Setup Script
# For Ubuntu 24.04 LTS

set -e  # Exit on error

echo "🚀 Starting LABSEMBLE server initial setup..."

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

# Check system information
check_system() {
    log_info "Checking system information..."
    
    # Check OS version
    if [[ ! -f /etc/os-release ]]; then
        log_error "Unsupported operating system."
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] || [[ "$VERSION_ID" != "24.04" ]]; then
        log_warning "Ubuntu 24.04 LTS is recommended. Current: $ID $VERSION_ID"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "System check completed: $ID $VERSION_ID"
}

# Update system
update_system() {
    log_info "Updating system packages..."
    
    apt update
    apt upgrade -y
    
    log_success "System update completed"
}

# Install essential packages
install_packages() {
    log_info "Installing essential packages..."
    
    apt install -y \
        curl \
        wget \
        git \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        htop \
        iotop \
        nethogs \
        ufw \
        fail2ban \
        logrotate \
        nginx \
        certbot \
        python3-certbot-nginx
    
    log_success "Essential packages installation completed"
}

# Setup firewall
setup_firewall() {
    log_info "Setting up firewall..."
    
    # Enable UFW
    ufw --force enable
    
    # Allow default ports
    ufw allow ssh
    ufw allow 80
    ufw allow 443
    ufw allow 3000
    ufw allow 5000
    
    # Check UFW status
    ufw status
    
    log_success "Firewall setup completed"
}

# Create security user
create_user() {
    log_info "Creating security user..."
    
    # Create labsemble user
    if ! id "labsemble" &>/dev/null; then
        useradd -m -s /bin/bash labsemble
        usermod -aG sudo labsemble
        log_success "labsemble user created"
    else
        log_info "labsemble user already exists."
    fi
    
    # Create SSH directory
    mkdir -p /home/labsemble/.ssh
    chown labsemble:labsemble /home/labsemble/.ssh
    chmod 700 /home/labsemble/.ssh
    
    # Setup SSH keys (copy current user's keys)
    if [[ -f ~/.ssh/authorized_keys ]]; then
        cp ~/.ssh/authorized_keys /home/labsemble/.ssh/
        chown labsemble:labsemble /home/labsemble/.ssh/authorized_keys
        chmod 600 /home/labsemble/.ssh/authorized_keys
        log_success "SSH key setup completed"
    else
        log_warning "SSH key not configured. Please set up manually."
    fi
}

# Secure SSH
secure_ssh() {
    log_info "Securing SSH..."
    
    # Backup SSH config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # SSH security settings
    sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
    
    # Restart SSH service
    systemctl restart sshd
    
    log_success "SSH security setup completed"
}

# Create web directories
create_directories() {
    log_info "Creating web directories..."
    
    # Create directories with proper ownership
    mkdir -p /var/www/labsemble
    mkdir -p /var/log/labsemble
    mkdir -p /var/cache/nginx
    
    # For AWS Lightsail, use www-data group for better compatibility
    # Create labsemble group if it doesn't exist
    if ! getent group labsemble >/dev/null 2>&1; then
        groupadd labsemble
        log_info "labsemble group created"
    fi
    
    # Add labsemble user to www-data group for web server compatibility
    usermod -aG www-data labsemble
    
    # Set ownership - labsemble user owns, www-data group can write
    chown -R labsemble:www-data /var/www/labsemble
    chown -R labsemble:www-data /var/log/labsemble
    
    # Set permissions - owner can read/write, group can read/write, others can read
    chmod -R 775 /var/www/labsemble
    chmod -R 775 /var/log/labsemble
    
    # Set directory permissions
    find /var/www/labsemble -type d -exec chmod 775 {} \;
    find /var/log/labsemble -type d -exec chmod 775 {} \;
    
    # Set file permissions
    find /var/www/labsemble -type f -exec chmod 664 {} \;
    find /var/log/labsemble -type f -exec chmod 664 {} \;
    
    # Create additional subdirectories with proper permissions
    mkdir -p /var/www/labsemble/client/build
    mkdir -p /var/www/labsemble/uploads
    mkdir -p /var/www/labsemble/logs
    
    # Set specific permissions for subdirectories
    chown -R labsemble:www-data /var/www/labsemble/client
    chown -R labsemble:www-data /var/www/labsemble/uploads
    chown -R labsemble:www-data /var/www/labsemble/logs
    
    chmod 775 /var/www/labsemble/client
    chmod 775 /var/www/labsemble/uploads
    chmod 775 /var/www/labsemble/logs
    
    log_success "Web directories created with proper permissions"
}

# Setup log rotation
setup_logrotate() {
    log_info "Setting up log rotation..."
    
    cat > /etc/logrotate.d/labsemble << EOF
/var/log/labsemble/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 664 labsemble www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF
    
    log_success "Log rotation setup completed"
}

# Main function
main() {
    log_info "Starting LABSEMBLE server initial setup..."
    
    check_root
    check_system
    update_system
    install_packages
    setup_firewall
    create_user
    secure_ssh
    create_directories
    setup_logrotate
    
    log_success "🎉 Server initial setup completed!"
    
    echo ""
    echo "📋 Next steps:"
    echo "1. Install Node.js: ./install-nodejs.sh"
    echo "2. Setup Nginx: ./setup-nginx.sh"
    echo "3. Setup SSL certificates: ./setup-ssl.sh"
    echo "4. Deploy application: ./deploy-app.sh"
    echo ""
    echo "⚠️  Important notes:"
    echo "- Login using labsemble user for SSH access"
    echo "- Root SSH access has been disabled"
    echo "- Firewall has been enabled"
    echo ""
}

# Execute script
main "$@" 