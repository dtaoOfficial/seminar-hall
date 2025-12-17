#!/bin/bash

echo "🚀 Starting full redeploy process at $(date)"
cd /var/www/seminar-hall || exit

echo "🧹 Stopping all running containers..."
docker-compose down

echo "🧼 Removing old containers (if any)..."
docker container prune -f

echo "🧽 Removing old unused images..."
docker image prune -a -f

echo "⬇️ Pulling latest code from GitHub..."
git fetch --all
git reset --hard origin/main

echo "🏗️ Building fresh backend and frontend containers..."
docker-compose build backend frontend --no-cache

echo "🚀 Starting all containers in background..."
docker-compose up -d

echo "🩺 Checking running containers..."
docker ps

echo "✅ Redeploy completed successfully at $(date)"
