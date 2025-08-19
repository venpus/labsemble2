#!/bin/bash

# LABSEMBLE Deployment Folder Structure Creation Script

echo "🚀 Creating LABSEMBLE deployment folder structure..."

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create folder structure
echo -e "${BLUE}📁 Creating folder structure...${NC}"

mkdir -p deployment/{nginx,scripts,config,systemd,monitoring}

echo -e "${GREEN}✅ Folder structure creation completed${NC}"

# Set file permissions
echo -e "${BLUE}🔐 Setting script file permissions...${NC}"

chmod +x deployment/scripts/*.sh
chmod +x deployment/create-structure.sh

echo -e "${GREEN}✅ Permission setup completed${NC}"

# Display folder structure
echo ""
echo -e "${BLUE}📋 Created folder structure:${NC}"
tree deployment -I 'node_modules|*.log'

echo ""
echo -e "${GREEN}🎉 LABSEMBLE deployment folder structure completed!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Upload deployment folder to server"
echo "2. Run scripts with root privileges"
echo "3. Execute ./deployment/scripts/deploy.sh"
echo ""
echo "🔧 Manual deployment (step by step):"
echo "1. ./deployment/scripts/setup-server.sh"
echo "2. ./deployment/scripts/install-nodejs.sh"
echo "3. ./deployment/scripts/setup-nginx.sh"
echo "4. ./deployment/scripts/setup-ssl.sh"
echo "5. ./deployment/scripts/deploy-app.sh" 