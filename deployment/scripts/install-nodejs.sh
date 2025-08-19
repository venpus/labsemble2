#!/bin/bash

# LABSEMBLE Node.js Installation Script
# For Ubuntu 24.04 LTS

set -e  # Exit on error

echo "🚀 Starting LABSEMBLE Node.js installation..."

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

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js 18.x LTS..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    
    # Install Node.js
    apt-get install -y nodejs
    
    # Check versions
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log_success "Node.js installation completed: $NODE_VERSION"
    log_success "npm installation completed: $NPM_VERSION"
}

# Install PM2
install_pm2() {
    log_info "Installing PM2..."
    
    npm install -g pm2
    
    # Check PM2 version
    PM2_VERSION=$(pm2 --version)
    log_success "PM2 installation completed: $PM2_VERSION"
}

# Install Yarn (optional)
install_yarn() {
    log_info "Installing Yarn..."
    
    npm install -g yarn
    
    # Check Yarn version
    YARN_VERSION=$(yarn --version)
    log_success "Yarn installation completed: $YARN_VERSION"
}

# Install global packages
install_global_packages() {
    log_info "Installing global packages..."
    
    npm install -g \
        nodemon \
        typescript \
        ts-node \
        @types/node \
        eslint \
        prettier \
        concurrently
    
    log_success "Global packages installation completed"
}

# Optimize Node.js
optimize_nodejs() {
    log_info "Optimizing Node.js..."
    
    # npm configuration optimization
    npm config set registry https://registry.npmjs.org/
    npm config set cache ~/.npm-cache --global
    
    # PM2 setup
    pm2 startup
    pm2 install pm2-logrotate
    
    log_success "Node.js optimization completed"
}

# Setup permissions
setup_permissions() {
    log_info "Setting up permissions..."
    
    # npm global packages permissions
    mkdir -p /usr/local/lib/node_modules
    chown -R labsemble:labsemble /usr/local/lib/node_modules
    
    # PM2 permissions
    mkdir -p /home/labsemble/.pm2
    chown -R labsemble:labsemble /home/labsemble/.pm2
    
    log_success "Permissions setup completed"
}

# Main function
main() {
    log_info "Starting LABSEMBLE Node.js installation..."
    
    check_root
    install_nodejs
    install_pm2
    install_yarn
    install_global_packages
    optimize_nodejs
    setup_permissions
    
    log_success "🎉 Node.js installation completed!"
    
    echo ""
    echo "📋 Installed versions:"
    echo "- Node.js: $(node --version)"
    echo "- npm: $(npm --version)"
    echo "- PM2: $(pm2 --version)"
    echo "- Yarn: $(yarn --version)"
    echo ""
    echo "📋 Next steps:"
    echo "1. Setup Nginx: ./setup-nginx.sh"
    echo "2. Setup SSL certificates: ./setup-ssl.sh"
    echo "3. Deploy application: ./deploy-app.sh"
    echo ""
}

# Execute script
main "$@" 