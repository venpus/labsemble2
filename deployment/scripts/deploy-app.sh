#!/bin/bash

# LABSEMBLE Application Deployment Script
# For Ubuntu 24.04 LTS with PM2

set -e  # Exit on error

echo "🚀 Starting LABSEMBLE application deployment..."

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
DEPLOY_PATH="/var/www/labsemble"
GIT_REPO="https://github.com/your-username/labsemble.git"
BRANCH="main"
NODE_ENV="production"

# Check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        exit 1
    fi
}

# Get user input
get_user_input() {
    log_info "Application Deployment Configuration..."
    
    read -p "Enter Git repository URL (default: $GIT_REPO): " input_repo
    if [[ ! -z "$input_repo" ]]; then
        GIT_REPO="$input_repo"
    fi
    
    read -p "Enter branch name (default: $BRANCH): " input_branch
    if [[ ! -z "$input_branch" ]]; then
        BRANCH="$input_branch"
    fi
    
    log_success "Git repository: $GIT_REPO"
    log_success "Branch: $BRANCH"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please run install-nodejs.sh first."
        exit 1
    fi
    
    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 is not installed. Please run install-nodejs.sh first."
        exit 1
    fi
    
    # Check if Nginx is running
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx is not running. Please run setup-nginx.sh first."
        exit 1
    fi
    
    # Check if deployment directory exists
    if [[ ! -d "$DEPLOY_PATH" ]]; then
        log_info "Creating deployment directory..."
        mkdir -p "$DEPLOY_PATH"
        chown labsemble:labsemble "$DEPLOY_PATH"
    fi
    
    log_success "Prerequisites check completed"
}

# Setup deployment environment
setup_deployment_env() {
    log_info "Setting up deployment environment..."
    
    # Change to deployment directory
    cd "$DEPLOY_PATH"
    
    # Check if git repository exists
    if [[ -d ".git" ]]; then
        log_info "Git repository already exists. Updating..."
        git fetch origin
        git reset --hard "origin/$BRANCH"
        git clean -fd
    else
        log_info "Cloning Git repository..."
        git clone -b "$BRANCH" "$GIT_REPO" .
    fi
    
    # Set proper ownership
    chown -R labsemble:labsemble "$DEPLOY_PATH"
    
    log_success "Deployment environment setup completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    if [[ -f "package.json" ]]; then
        log_info "Installing root dependencies..."
        npm ci --production
    fi
    
    # Install client dependencies
    if [[ -d "client" ]] && [[ -f "client/package.json" ]]; then
        log_info "Installing client dependencies..."
        cd client
        npm ci --production
        cd ..
    fi
    
    # Install server dependencies
    if [[ -d "server" ]] && [[ -f "server/package.json" ]]; then
        log_info "Installing server dependencies..."
        cd server
        npm ci --production
        cd ..
    fi
    
    log_success "Dependencies installation completed"
}

# Build client application
build_client() {
    log_info "Building client application..."
    
    if [[ -d "client" ]] && [[ -f "client/package.json" ]]; then
        cd client
        
        # Check if build script exists
        if grep -q "\"build\"" package.json; then
            log_info "Running client build..."
            npm run build
            
            # Check if build was successful
            if [[ -d "build" ]]; then
                log_success "Client build completed"
            else
                log_error "Client build failed"
                exit 1
            fi
        else
            log_warning "No build script found in client package.json"
        fi
        
        cd ..
    else
        log_warning "Client directory not found"
    fi
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    
    # Copy production environment file
    if [[ -f "deployment/config/env.production" ]]; then
        cp deployment/config/env.production server/.env
        chown labsemble:labsemble server/.env
        chmod 600 server/.env
        log_success "Production environment file copied"
    else
        log_warning "Production environment file not found. Creating basic .env..."
        
        # Create basic .env file
        cat > server/.env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/labsemble
CORS_ORIGIN=https://labsemble.com
EOF
        
        chown labsemble:labsemble server/.env
        chmod 600 server/.env
        log_success "Basic environment file created"
    fi
}

# Setup PM2 configuration
setup_pm2() {
    log_info "Setting up PM2 configuration..."
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'labsemble-server',
    script: 'server/index.js',
    cwd: '$DEPLOY_PATH',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF
    
    # Create logs directory
    mkdir -p logs
    chown -R labsemble:www-data logs
    chmod 775 logs
    
    log_success "PM2 configuration created"
}

# Start application with PM2
start_application() {
    log_info "Starting application with PM2..."
    
    # Stop existing PM2 processes
    if pm2 list | grep -q "labsemble-server"; then
        log_info "Stopping existing PM2 processes..."
        pm2 stop labsemble-server
        pm2 delete labsemble-server
    fi
    
    # Start application
    cd "$DEPLOY_PATH"
    pm2 start ecosystem.config.js --env production
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup script
    pm2 startup
    
    log_success "Application started with PM2"
}

# Setup log rotation
setup_log_rotation() {
    log_info "Setting up log rotation..."
    
    # Create logrotate configuration for application logs
    cat > /etc/logrotate.d/labsemble-app << EOF
$DEPLOY_PATH/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 664 labsemble www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    log_success "Application log rotation configured"
}

# Create deployment script
create_deployment_script() {
    log_info "Creating deployment script..."
    
    cat > deploy.sh << 'EOF'
#!/bin/bash
# LABSEMBLE Quick Deployment Script

echo "🚀 Starting quick deployment..."

# Pull latest changes
git pull origin main

# Install dependencies
npm run install:all

# Build client
cd client && npm run build && cd ..

# Restart PM2
pm2 restart labsemble-server

echo "✅ Quick deployment completed!"
EOF
    
    chmod +x deploy.sh
    chown labsemble:labsemble deploy.sh
    
    log_success "Deployment script created"
}

# Final verification
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check if PM2 process is running
    if pm2 list | grep -q "labsemble-server.*online"; then
        log_success "✓ PM2 process: Running"
    else
        log_error "✗ PM2 process: Not running"
        return 1
    fi
    
    # Check if application is responding
    sleep 5  # Wait for application to start
    
    if curl -s -f "http://localhost:5000/api/health" &> /dev/null; then
        log_success "✓ Application: Responding"
    else
        log_warning "⚠ Application: Health check failed"
    fi
    
    # Check if client build exists
    if [[ -d "client/build" ]]; then
        log_success "✓ Client build: Exists"
    else
        log_warning "⚠ Client build: Not found"
    fi
    
    # Check if environment file exists
    if [[ -f "server/.env" ]]; then
        log_success "✓ Environment file: Exists"
    else
        log_error "✗ Environment file: Not found"
        return 1
    fi
    
    log_success "Deployment verification completed"
}

# Main function
main() {
    log_info "Starting LABSEMBLE application deployment..."
    
    check_root
    get_user_input
    check_prerequisites
    setup_deployment_env
    install_dependencies
    build_client
    setup_environment
    setup_pm2
    start_application
    setup_log_rotation
    create_deployment_script
    verify_deployment
    
    log_success "🎉 Application deployment completed!"
    
    echo ""
    echo "📋 Deployment Information:"
    echo "- Deployment path: $DEPLOY_PATH"
    echo "- Git repository: $GIT_REPO"
    echo "- Branch: $BRANCH"
    echo "- PM2 process: labsemble-server"
    echo "- Environment: $NODE_ENV"
    echo ""
    echo "📋 PM2 Commands:"
    echo "- Status: pm2 status"
    echo "- Logs: pm2 logs labsemble-server"
    echo "- Restart: pm2 restart labsemble-server"
    echo "- Stop: pm2 stop labsemble-server"
    echo ""
    echo "📋 Quick Deployment:"
    echo "- Run: ./deploy.sh"
    echo ""
    echo "🌐 Test URLs:"
    echo "- Local API: http://localhost:5000/api/health"
    echo "- Nginx: http://$(hostname -I | awk '{print $1}')"
    echo "- Domain: https://labsemble.com (if SSL configured)"
    echo ""
    echo "📁 Important Directories:"
    echo "- Application: $DEPLOY_PATH"
    echo "- Logs: $DEPLOY_PATH/logs"
    echo "- Client build: $DEPLOY_PATH/client/build"
    echo "- Server: $DEPLOY_PATH/server"
    echo ""
    echo "⚠️  Important notes:"
    echo "- Check PM2 logs for any errors"
    echo "- Verify environment variables in server/.env"
    echo "- Test API endpoints"
    echo "- Monitor application performance"
    echo ""
}

# Execute script
main "$@" 