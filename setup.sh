#!/bin/bash
set -e

echo "=========================================="
echo "🚀 Seminar Portal - Smart VPS Setup Script"
echo "=========================================="

# Function to ask user y/n with validation
ask_yes_no() {
    local prompt="$1"
    local answer=""
    while true; do
        read -p "$prompt (y/n): " answer
        answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]')
        case $answer in
            y) return 0 ;;
            n) return 1 ;;
            *) echo "⚠️  Please enter only 'y' or 'n'." ;;
        esac
    done
}

# Function to check if command exists
check_command() {
    command -v "$1" >/dev/null 2>&1
}

# --------------------------
# Step 1 — Update Packages
# --------------------------
echo "🔄 Updating package lists..."
sudo apt update -y && sudo apt upgrade -y
echo "✅ System update complete."
echo

# --------------------------
# Step 2 — Install Prerequisites
# --------------------------
echo "🧰 Checking prerequisites..."
sudo apt install -y ca-certificates curl gnupg lsb-release git
echo "✅ Basic tools installed."
echo

# --------------------------
# Step 3 — Check Docker
# --------------------------
if check_command docker; then
    echo "✅ Docker is already installed."
else
    echo "🐋 Docker is NOT installed."
    if ask_yes_no "Do you want to install Docker now?"; then
        echo "🔧 Installing Docker..."
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
          https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        sudo apt update -y
        sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        echo "✅ Docker installed successfully."
    else
        echo "⏭️  Skipping Docker installation as per user choice."
    fi
fi
echo

# --------------------------
# Step 4 — Check Docker Compose
# --------------------------
if docker compose version >/dev/null 2>&1; then
    echo "✅ Docker Compose is already installed."
else
    echo "🧩 Docker Compose is NOT installed."
    if ask_yes_no "Do you want to install Docker Compose now?"; then
        echo "🔧 Installing Docker Compose plugin..."
        sudo apt install -y docker-compose-plugin
        echo "✅ Docker Compose installed successfully."
    else
        echo "⏭️  Skipping Docker Compose installation as per user choice."
    fi
fi
echo

# --------------------------
# Step 5 — Enable Docker service
# --------------------------
if check_command docker; then
    echo "🔄 Enabling Docker to start on boot..."
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "✅ Docker service is running."
else
    echo "⚠️  Docker not installed — skipping service enable."
fi
echo

# --------------------------
# Step 6 — Show versions
# --------------------------
if check_command docker; then
    docker --version
else
    echo "❌ Docker not installed, version unavailable."
fi

if docker compose version >/dev/null 2>&1; then
    docker compose version
else
    echo "❌ Docker Compose not installed, version unavailable."
fi
echo

# --------------------------
# Step 7 — Clone or update project
# --------------------------
if [ ! -d "seminar-docker" ]; then
    echo "📦 Project not found in current directory."
    if ask_yes_no "Do you want to clone the project from GitHub?"; then
        read -p "👉 Enter your GitHub repo URL: " repo_url
        git clone "$repo_url" seminar-docker
        cd seminar-docker || exit
        echo "✅ Project cloned successfully."
    else
        echo "⏭️  Skipping project clone. Please ensure files exist manually."
        exit 0
    fi
else
    echo "📂 Project already exists. Pulling latest updates..."
    cd seminar-docker || exit
    git pull
    echo "✅ Project updated."
fi
echo

# --------------------------
# Step 8 — Build containers
# --------------------------
if ask_yes_no "Do you want to build Docker images now?"; then
    echo "🏗️  Building containers (this may take a few minutes)..."
    sudo docker compose build --no-cache
    echo "✅ Build complete."
else
    echo "⏭️  Skipping image build."
fi
echo

# --------------------------
# Step 9 — Run containers
# --------------------------
if ask_yes_no "Do you want to start containers now?"; then
    echo "🚀 Starting containers..."
    sudo docker compose up -d
    echo "✅ Containers are up and running!"
    echo
    echo "🌍 Access your app at: http://$(curl -s ifconfig.me)"
else
    echo "⏭️  Skipping container startup."
fi

echo "=========================================="
echo "🎉 Seminar Portal Setup Completed!"
echo "=========================================="
