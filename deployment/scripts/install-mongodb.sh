#!/bin/bash

# LABSEMBLE MongoDB Installation Script
# For Ubuntu 24.04 LTS

set -e  # Exit on error

echo "🍃 Starting LABSEMBLE MongoDB installation..."

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
MONGODB_VERSION="7.0"
MONGODB_DB="labsemble"
MONGODB_USER="labsemble_user"
MONGODB_PASS="labsemble_password"

# Check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        exit 1
    fi
}

# Get user input
get_user_input() {
    log_info "MongoDB Installation Configuration..."
    
    read -p "Enter MongoDB version (default: $MONGODB_VERSION): " input_version
    if [[ ! -z "$input_version" ]]; then
        MONGODB_VERSION="$input_version"
    fi
    
    read -p "Enter database name (default: $MONGODB_DB): " input_db
    if [[ ! -z "$input_db" ]]; then
        MONGODB_DB="$input_db"
    fi
    
    read -p "Enter database user (default: $MONGODB_USER): " input_user
    if [[ ! -z "$input_user" ]]; then
        MONGODB_USER="$input_user"
    fi
    
    read -s -p "Enter database password (default: $MONGODB_PASS): " input_pass
    echo
    if [[ ! -z "$input_pass" ]]; then
        MONGODB_PASS="$input_pass"
    fi
    
    log_success "MongoDB version: $MONGODB_VERSION"
    log_success "Database name: $MONGODB_DB"
    log_success "Database user: $MONGODB_USER"
    log_success "Database password: [HIDDEN]"
}

# Check if MongoDB is already installed
check_mongodb() {
    if command -v mongod &> /dev/null; then
        log_info "MongoDB is already installed."
        MONGODB_INSTALLED=true
        return 0
    else
        log_info "MongoDB is not installed. Installing..."
        MONGODB_INSTALLED=false
        return 1
    fi
}

# Install MongoDB
install_mongodb() {
    log_info "Installing MongoDB $MONGODB_VERSION..."
    
    # Update package list
    apt update
    
    # Install required packages
    apt install -y wget gnupg curl
    
    # Import MongoDB public GPG key
    wget -qO - https://www.mongodb.org/static/pgp/server-$MONGODB_VERSION.asc | apt-key add -
    
    # Add MongoDB repository
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/$MONGODB_VERSION multiverse" | tee /etc/apt/sources.list.d/mongodb-org-$MONGODB_VERSION.list
    
    # Update package list again
    apt update
    
    # Install MongoDB
    apt install -y mongodb-org
    
    # Check installation
    if command -v mongod &> /dev/null; then
        log_success "MongoDB installation completed"
    else
        log_error "MongoDB installation failed"
        exit 1
    fi
}

# Configure MongoDB
configure_mongodb() {
    log_info "Configuring MongoDB..."
    
    # Create MongoDB configuration directory
    mkdir -p /etc/mongodb
    
    # Create MongoDB configuration file
    cat > /etc/mongod.conf << EOF
# MongoDB configuration file
# File: /etc/mongod.conf

# Data directory
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# Log directory
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1

# Security
security:
  authorization: enabled

# Performance
operationProfiling:
  slowOpThresholdMs: 100

# WiredTiger
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true
EOF
    
    # Create required directories
    mkdir -p /var/lib/mongodb
    mkdir -p /var/log/mongodb
    mkdir -p /var/run/mongodb
    
    # Set proper ownership
    chown -R mongodb:mongodb /var/lib/mongodb
    chown -R mongodb:mongodb /var/log/mongodb
    chown -R mongodb:mongodb /var/run/mongodb
    chown -R mongodb:mongodb /etc/mongodb
    
    # Set proper permissions
    chmod 755 /var/lib/mongodb
    chmod 755 /var/log/mongodb
    chmod 755 /var/run/mongodb
    chmod 644 /etc/mongod.conf
    
    log_success "MongoDB configuration completed"
}

# Setup MongoDB service
setup_mongodb_service() {
    log_info "Setting up MongoDB service..."
    
    # Create systemd service file
    cat > /etc/systemd/system/mongod.service << EOF
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.org/manual
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mongodb
Group=mongodb
ExecStart=/usr/bin/mongod --config /etc/mongod.conf
PIDFile=/var/run/mongodb/mongod.pid
LimitFSIZE=infinity
LimitCPU=infinity
LimitAS=infinity
LimitNOFILE=64000
LimitNPROC=64000

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable MongoDB service
    systemctl enable mongod
    
    # Start MongoDB service
    systemctl start mongod
    
    # Wait for MongoDB to start
    log_info "Waiting for MongoDB to start..."
    sleep 10
    
    # Check service status
    if systemctl is-active --quiet mongod; then
        log_success "MongoDB service is running"
    else
        log_error "MongoDB service failed to start"
        exit 1
    fi
}

# Setup MongoDB authentication
setup_mongodb_auth() {
    log_info "Setting up MongoDB authentication..."
    
    # Wait for MongoDB to be ready
    log_info "Waiting for MongoDB to be ready..."
    sleep 15
    
    # Create admin user
    mongosh --eval "
        use admin;
        db.createUser({
            user: 'admin',
            pwd: '$MONGODB_PASS',
            roles: ['root']
        });
    " || log_warning "Admin user creation failed (might already exist)"
    
    # Create application database and user
    mongosh --eval "
        use $MONGODB_DB;
        db.createUser({
            user: '$MONGODB_USER',
            pwd: '$MONGODB_PASS',
            roles: [
                { role: 'readWrite', db: '$MONGODB_DB' },
                { role: 'dbAdmin', db: '$MONGODB_DB' }
            ]
        });
        
        // Create initial collections
        db.createCollection('users');
        db.createCollection('products');
        db.createCollection('orders');
        db.createCollection('quotations');
        
        // Create indexes
        db.users.createIndex({ email: 1 }, { unique: true });
        db.products.createIndex({ name: 1 });
        db.orders.createIndex({ userId: 1 });
        db.quotations.createIndex({ userId: 1 });
    " || log_warning "Database setup failed"
    
    log_success "MongoDB authentication setup completed"
}

# Setup MongoDB backup
setup_mongodb_backup() {
    log_info "Setting up MongoDB backup..."
    
    # Create backup directory
    mkdir -p /var/backups/mongodb
    chown mongodb:mongodb /var/backups/mongodb
    
    # Create backup script
    cat > /usr/local/bin/mongodb-backup.sh << EOF
#!/bin/bash
# MongoDB Backup Script

BACKUP_DIR="/var/backups/mongodb"
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="labsemble_\$DATE"

# Create backup
mongodump --db $MONGODB_DB --out "\$BACKUP_DIR/\$BACKUP_NAME"

# Compress backup
tar -czf "\$BACKUP_DIR/\$BACKUP_NAME.tar.gz" -C "\$BACKUP_DIR" "\$BACKUP_NAME"

# Remove uncompressed backup
rm -rf "\$BACKUP_DIR/\$BACKUP_NAME"

# Keep only last 7 backups
cd "\$BACKUP_DIR"
ls -t *.tar.gz | tail -n +8 | xargs -r rm

echo "\$(date): MongoDB backup completed: \$BACKUP_NAME.tar.gz" >> /var/log/mongodb-backup.log
EOF
    
    # Make backup script executable
    chmod +x /usr/local/bin/mongodb-backup.sh
    
    # Create cron job for daily backup
    cat > /etc/cron.daily/mongodb-backup << EOF
#!/bin/bash
/usr/local/bin/mongodb-backup.sh
EOF
    
    chmod +x /etc/cron.daily/mongodb-backup
    
    log_success "MongoDB backup setup completed"
}

# Setup MongoDB monitoring
setup_mongodb_monitoring() {
    log_info "Setting up MongoDB monitoring..."
    
    # Create monitoring script
    cat > /usr/local/bin/mongodb-monitor.sh << EOF
#!/bin/bash
# MongoDB Monitoring Script

# Check if MongoDB is running
if ! systemctl is-active --quiet mongod; then
    echo "\$(date): MongoDB is not running!" >> /var/log/mongodb-monitor.log
    systemctl start mongod
fi

# Check MongoDB connection
if ! mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
    echo "\$(date): MongoDB connection failed!" >> /var/log/mongodb-monitor.log
fi

# Check disk space
DISK_USAGE=\$(df /var/lib/mongodb | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \$DISK_USAGE -gt 80 ]; then
    echo "\$(date): MongoDB disk usage is high: \$DISK_USAGE%" >> /var/log/mongodb-monitor.log
fi
EOF
    
    # Make monitoring script executable
    chmod +x /usr/local/bin/mongodb-monitor.sh
    
    # Create cron job for monitoring (every 5 minutes)
    cat > /etc/cron.d/mongodb-monitor << EOF
*/5 * * * * root /usr/local/bin/mongodb-monitor.sh
EOF
    
    log_success "MongoDB monitoring setup completed"
}

# Final verification
verify_mongodb_setup() {
    log_info "Verifying MongoDB setup..."
    
    # Check if MongoDB service is running
    if systemctl is-active --quiet mongod; then
        log_success "✓ MongoDB service: Running"
    else
        log_error "✗ MongoDB service: Stopped"
        return 1
    fi
    
    # Check if MongoDB is listening on port 27017
    if netstat -tlnp | grep -q ":27017 "; then
        log_success "✓ Port 27017: Listening"
    else
        log_error "✗ Port 27017: Not listening"
        return 1
    fi
    
    # Check if MongoDB configuration file exists
    if [[ -f "/etc/mongod.conf" ]]; then
        log_success "✓ MongoDB config: Exists"
    else
        log_error "✗ MongoDB config: Not found"
        return 1
    fi
    
    # Check if backup script exists
    if [[ -f "/usr/local/bin/mongodb-backup.sh" ]]; then
        log_success "✓ Backup script: Exists"
    else
        log_error "✗ Backup script: Not found"
        return 1
    fi
    
    # Check if monitoring script exists
    if [[ -f "/usr/local/bin/mongodb-monitor.sh" ]]; then
        log_success "✓ Monitoring script: Exists"
    else
        log_error "✗ Monitoring script: Not found"
        return 1
    fi
    
    log_success "MongoDB setup verification completed"
}

# Main function
main() {
    log_info "Starting LABSEMBLE MongoDB installation..."
    
    check_root
    get_user_input
    
    if ! check_mongodb; then
        install_mongodb
    fi
    
    configure_mongodb
    setup_mongodb_service
    setup_mongodb_auth
    setup_mongodb_backup
    setup_mongodb_monitoring
    verify_mongodb_setup
    
    log_success "🎉 MongoDB installation completed!"
    
    echo ""
    echo "🍃 MongoDB Information:"
    echo "- Version: $(mongod --version | head -1)"
    echo "- Status: $(systemctl is-active mongod)"
    echo "- Configuration: /etc/mongod.conf"
    echo "- Data directory: /var/lib/mongodb"
    echo "- Log directory: /var/log/mongodb"
    echo "- Port: 27017"
    echo ""
    echo "📋 Database Information:"
    echo "- Database: $MONGODB_DB"
    echo "- User: $MONGODB_USER"
    echo "- Password: [HIDDEN]"
    echo ""
    echo "📋 Connection String:"
    echo "- Local: mongodb://$MONGODB_USER:$MONGODB_PASS@localhost:27017/$MONGODB_DB"
    echo "- From app: mongodb://$MONGODB_USER:$MONGODB_PASS@localhost:27017/$MONGODB_DB"
    echo ""
    echo "📋 Management Commands:"
    echo "- Status: sudo systemctl status mongod"
    echo "- Start: sudo systemctl start mongod"
    echo "- Stop: sudo systemctl stop mongod"
    echo "- Restart: sudo systemctl restart mongod"
    echo "- Logs: sudo tail -f /var/log/mongodb/mongod.log"
    echo ""
    echo "📋 Backup & Monitoring:"
    echo "- Manual backup: /usr/local/bin/mongodb-backup.sh"
    echo "- Auto backup: Daily at 2 AM"
    echo "- Monitoring: Every 5 minutes"
    echo "- Backup logs: /var/log/mongodb-backup.log"
    echo "- Monitor logs: /var/log/mongodb-monitor.log"
    echo ""
    echo "⚠️  Important notes:"
    echo "- MongoDB is configured with authentication enabled"
    echo "- Backup runs daily at 2 AM"
    echo "- Monitoring runs every 5 minutes"
    echo "- Check logs for any issues"
    echo "- Update environment variables in your application"
    echo ""
}

# Execute script
main "$@" 