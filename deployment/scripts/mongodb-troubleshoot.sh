#!/bin/bash

# MongoDB Troubleshooting Script
# For Ubuntu 24.04 LTS

echo "🔍 MongoDB Troubleshooting Script"
echo "=================================="

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

echo ""
log_info "Starting MongoDB troubleshooting..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root."
    exit 1
fi

# 1. Check MongoDB installation
echo ""
log_info "1. Checking MongoDB installation..."
if command -v mongod &> /dev/null; then
    log_success "MongoDB binary found: $(which mongod)"
    log_success "MongoDB version: $(mongod --version | head -1)"
else
    log_error "MongoDB binary not found!"
    exit 1
fi

# 2. Check MongoDB configuration
echo ""
log_info "2. Checking MongoDB configuration..."
if [[ -f "/etc/mongod.conf" ]]; then
    log_success "MongoDB config file exists: /etc/mongod.conf"
    echo "Config file contents:"
    cat /etc/mongod.conf
else
    log_error "MongoDB config file not found: /etc/mongod.conf"
fi

# 3. Check required directories
echo ""
log_info "3. Checking required directories..."
DIRS=(
    "/var/lib/mongodb"
    "/var/log/mongodb"
    "/var/run/mongodb"
    "/etc/mongodb"
)

for dir in "${DIRS[@]}"; do
    if [[ -d "$dir" ]]; then
        log_success "✓ Directory exists: $dir"
        echo "  - Owner: $(ls -ld "$dir" | awk '{print $3":"$4}')"
        echo "  - Permissions: $(ls -ld "$dir" | awk '{print $1}')"
    else
        log_error "✗ Directory missing: $dir"
    fi
done

# 4. Check MongoDB user
echo ""
log_info "4. Checking MongoDB user..."
if id "mongodb" &>/dev/null; then
    log_success "MongoDB user exists: mongodb"
    echo "  - UID: $(id -u mongodb)"
    echo "  - Groups: $(id -Gn mongodb)"
else
    log_error "MongoDB user not found: mongodb"
fi

# 5. Check systemd service file
echo ""
log_info "5. Checking systemd service file..."
if [[ -f "/etc/systemd/system/mongod.service" ]]; then
    log_success "Systemd service file exists"
    echo "Service file contents:"
    cat /etc/systemd/system/mongod.service
else
    log_error "Systemd service file not found"
fi

# 6. Check service status
echo ""
log_info "6. Checking service status..."
if systemctl is-active --quiet mongod; then
    log_success "MongoDB service is running"
else
    log_error "MongoDB service is not running"
fi

if systemctl is-enabled --quiet mongod; then
    log_success "MongoDB service is enabled"
else
    log_warning "MongoDB service is not enabled"
fi

# 7. Check service logs
echo ""
log_info "7. Checking service logs..."
echo "Recent MongoDB service logs:"
journalctl -u mongod --no-pager -n 20

# 8. Check MongoDB logs
echo ""
log_info "8. Checking MongoDB logs..."
if [[ -f "/var/log/mongodb/mongod.log" ]]; then
    log_success "MongoDB log file exists"
    echo "Recent MongoDB logs:"
    tail -20 /var/log/mongodb/mongod.log
else
    log_error "MongoDB log file not found"
fi

# 9. Check system resources
echo ""
log_info "9. Checking system resources..."
echo "Disk space:"
df -h /var/lib/mongodb /var/log/mongodb

echo "Memory usage:"
free -h

echo "Available ports:"
netstat -tlnp | grep :27017 || echo "Port 27017 not in use"

# 10. Test MongoDB manually
echo ""
log_info "10. Testing MongoDB manually..."
echo "Attempting to start MongoDB manually..."

# Stop service first
systemctl stop mongod 2>/dev/null || true

# Wait a moment
sleep 2

# Try to start manually
if mongod --config /etc/mongod.conf --fork --logpath /var/log/mongodb/mongod.log; then
    log_success "MongoDB started manually"
    sleep 2
    
    # Check if it's running
    if pgrep mongod > /dev/null; then
        log_success "MongoDB process is running"
        echo "Process info:"
        ps aux | grep mongod | grep -v grep
    else
        log_error "MongoDB process not found after manual start"
    fi
    
    # Stop manual process
    pkill mongod
else
    log_error "Failed to start MongoDB manually"
fi

# 11. Common fixes
echo ""
log_info "11. Applying common fixes..."

# Fix directory permissions
log_info "Fixing directory permissions..."
chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb /var/run/mongodb /etc/mongodb 2>/dev/null || true
chmod 755 /var/lib/mongodb /var/log/mongodb /var/run/mongodb /etc/mongodb 2>/dev/null || true

# Create missing directories
log_info "Creating missing directories..."
mkdir -p /var/lib/mongodb /var/log/mongodb /var/run/mongodb /etc/mongodb

# Set proper ownership
chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb /var/run/mongodb /etc/mongodb

# Reload systemd
log_info "Reloading systemd..."
systemctl daemon-reload

# 12. Final test
echo ""
log_info "12. Final test..."
echo "Attempting to start MongoDB service..."

if systemctl start mongod; then
    log_success "MongoDB service started successfully!"
    
    # Wait and check status
    sleep 3
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB service is running and stable"
        echo "Service status:"
        systemctl status mongod --no-pager -l
    else
        log_error "MongoDB service failed after start"
    fi
else
    log_error "Failed to start MongoDB service"
    echo "Service start error:"
    systemctl status mongod --no-pager -l
fi

echo ""
log_info "Troubleshooting completed!"
echo ""
echo "📋 Next steps:"
echo "1. If MongoDB started successfully, continue with deployment"
echo "2. If still failing, check the logs above for specific errors"
echo "3. Common issues:"
echo "   - Insufficient disk space"
echo "   - Port 27017 already in use"
echo "   - Permission issues"
echo "   - Configuration file errors"
echo ""
echo "🔄 To restart troubleshooting:"
echo "   ./mongodb-troubleshoot.sh" 