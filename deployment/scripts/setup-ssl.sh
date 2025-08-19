#!/bin/bash

# LABSEMBLE SSL Certificate Setup Script
# For Ubuntu 24.04 LTS with Let's Encrypt

set -e  # Exit on error

echo "🔐 Starting LABSEMBLE SSL certificate setup..."

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
DOMAIN="labsemble.com"
EMAIL="venpus@inventio-tech.com"

# Check root privileges
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        exit 1
    fi
}

# Get user input
get_user_input() {
    log_info "SSL Certificate Setup Configuration..."
    
    read -p "Enter domain name (default: $DOMAIN): " input_domain
    if [[ ! -z "$input_domain" ]]; then
        DOMAIN="$input_domain"
    fi
    
    read -p "Enter email address for Let's Encrypt (default: $EMAIL): " input_email
    if [[ ! -z "$input_email" ]]; then
        EMAIL="$input_email"
    fi
    
    log_success "Domain: $DOMAIN"
    log_success "Email: $EMAIL"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Nginx is running
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx is not running. Please start Nginx first."
        exit 1
    fi
    
    # Check if domain is accessible
    if ! nslookup "$DOMAIN" &> /dev/null; then
        log_warning "Domain $DOMAIN might not be accessible. Please check DNS settings."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check if port 80 is accessible
    if ! netstat -tlnp | grep -q ":80 "; then
        log_error "Port 80 is not listening. Please check Nginx configuration."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Install Certbot
install_certbot() {
    log_info "Installing Certbot..."
    
    # Check if certbot is already installed
    if command -v certbot &> /dev/null; then
        log_info "Certbot is already installed."
        return 0
    fi
    
    # Install certbot using snap (Ubuntu 24.04 recommended method)
    if command -v snap &> /dev/null; then
        log_info "Installing Certbot using snap..."
        snap install core
        snap refresh core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot
    else
        log_info "Installing Certbot using apt..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Verify installation
    if command -v certbot &> /dev/null; then
        log_success "Certbot installation completed"
    else
        log_error "Certbot installation failed"
        exit 1
    fi
}

# Setup SSL certificates
setup_ssl_certificates() {
    log_info "Setting up SSL certificates for $DOMAIN..."
    
    # Create backup of current Nginx configuration
    cp /etc/nginx/sites-available/labsemble /etc/nginx/sites-available/labsemble.backup
    
    # Generate SSL certificate using certbot
    log_info "Generating SSL certificate..."
    
    if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
        log_success "SSL certificate generated successfully"
    else
        log_error "SSL certificate generation failed"
        log_info "Attempting manual certificate generation..."
        
        # Manual certificate generation
        if certbot certonly --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive; then
            log_success "Manual SSL certificate generation completed"
        else
            log_error "Manual SSL certificate generation also failed"
            exit 1
        fi
    fi
}

# Update Nginx configuration for HTTPS
update_nginx_https() {
    log_info "Updating Nginx configuration for HTTPS..."
    
    # Check if SSL certificate files exist
    if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        log_error "SSL certificate files not found"
        exit 1
    fi
    
    # Create HTTPS configuration
    cat > /etc/nginx/sites-available/labsemble-https << EOF
# HTTP server (port 80) - redirect to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server (port 443)
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Client max upload size
    client_max_body_size 100M;
    
    # React app (static files)
    location / {
        root /var/www/labsemble/client/build;
        try_files \$uri \$uri/ /index.html;
        
        # Caching settings
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header Vary "Accept-Encoding";
        }
        
        # HTML files - no cache
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
    
    # API proxy (Node.js server)
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_connect_timeout 60;
        proxy_send_timeout 60;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
    }
    
    # File upload proxy
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 60;
        proxy_send_timeout 60;
    }
    
    # Static files direct serving
    location /static/ {
        alias /var/www/labsemble/client/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    
    # 50x error page
    location = /50x.html {
        root /usr/share/nginx/html;
    }
    
    # Health check
    location = /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Replace the HTTP configuration with HTTPS
    mv /etc/nginx/sites-available/labsemble-https /etc/nginx/sites-available/labsemble
    
    log_success "Nginx HTTPS configuration updated"
}

# Test and reload Nginx
test_and_reload_nginx() {
    log_info "Testing Nginx configuration..."
    
    # Test configuration
    if nginx -t; then
        log_success "Nginx configuration test passed"
    else
        log_error "Nginx configuration test failed"
        exit 1
    fi
    
    # Reload Nginx
    log_info "Reloading Nginx..."
    if systemctl reload nginx; then
        log_success "Nginx reloaded successfully"
    else
        log_error "Nginx reload failed"
        exit 1
    fi
}

# Setup auto-renewal
setup_auto_renewal() {
    log_info "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > /etc/cron.daily/renew-ssl << EOF
#!/bin/bash
# SSL Certificate Auto-renewal Script

# Renew certificates
certbot renew --quiet --deploy-hook "systemctl reload nginx"

# Log renewal
echo "\$(date): SSL certificate renewal check completed" >> /var/log/ssl-renewal.log
EOF
    
    # Make script executable
    chmod +x /etc/cron.daily/renew-ssl
    
    # Test renewal
    log_info "Testing certificate renewal..."
    if certbot renew --dry-run; then
        log_success "Certificate renewal test passed"
    else
        log_warning "Certificate renewal test failed"
    fi
    
    log_success "Auto-renewal setup completed"
}

# Final verification
verify_ssl_setup() {
    log_info "Verifying SSL setup..."
    
    # Check if HTTPS is listening
    if netstat -tlnp | grep -q ":443 "; then
        log_success "✓ Port 443: Listening"
    else
        log_error "✗ Port 443: Not listening"
        return 1
    fi
    
    # Check SSL certificate
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        log_success "✓ SSL certificate: Exists"
    else
        log_error "✗ SSL certificate: Not found"
        return 1
    fi
    
    # Check certificate expiration
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
    log_info "✓ SSL certificate expires: $CERT_EXPIRY"
    
    # Test HTTPS access
    if curl -s -I "https://$DOMAIN" | grep -q "200 OK"; then
        log_success "✓ HTTPS access: Working"
    else
        log_warning "⚠ HTTPS access: Check needed"
    fi
    
    log_success "SSL setup verification completed"
}

# Main function
main() {
    log_info "Starting LABSEMBLE SSL certificate setup..."
    
    check_root
    get_user_input
    check_prerequisites
    install_certbot
    setup_ssl_certificates
    update_nginx_https
    test_and_reload_nginx
    setup_auto_renewal
    verify_ssl_setup
    
    log_success "🎉 SSL certificate setup completed!"
    
    echo ""
    echo "🔐 SSL Information:"
    echo "- Domain: $DOMAIN"
    echo "- Certificate: /etc/letsencrypt/live/$DOMAIN/"
    echo "- Auto-renewal: /etc/cron.daily/renew-ssl"
    echo "- Nginx config: /etc/nginx/sites-available/labsemble"
    echo ""
    echo "📋 Next steps:"
    echo "1. Deploy application: ./deploy-app.sh"
    echo "2. Test HTTPS: https://$DOMAIN"
    echo ""
    echo "🌐 Test URLs:"
    echo "- HTTP: http://$DOMAIN (redirects to HTTPS)"
    echo "- HTTPS: https://$DOMAIN"
    echo "- API: https://$DOMAIN/api/health"
    echo ""
    echo "⚠️  Important notes:"
    echo "- Certificates auto-renew every 60 days"
    echo "- Check renewal logs: tail -f /var/log/ssl-renewal.log"
    echo "- Manual renewal: certbot renew"
    echo ""
}

# Execute script
main "$@" 