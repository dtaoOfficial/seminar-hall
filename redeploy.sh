#!/bin/bash

echo "🚀 Starting targeted redeploy process at $(date)"
cd /var/www/seminar-hall || exit

echo "⬇️ Pulling latest code from GitHub..."
# ✅ Reset local changes and pull only the latest from origin
git fetch origin
git reset --hard origin/main

echo "🧹 Stopping and removing ONLY frontend and backend containers..."
# ✅ Targeted stop: This avoids stopping your DB or other VPS projects
docker-compose stop frontend backend
docker-compose rm -f frontend backend

echo "🧽 Cleaning up old project-specific images..."
# ✅ Targeted cleanup: Removes only the old versions of this project's images
docker rmi $(docker images 'seminar-hall*' -q) 2>/dev/null || echo "No old project images to remove."

echo "🏗️ Building fresh containers (No Cache for Frontend)..."
# ✅ Clean build for frontend to ensure the React 19 fix sticks
docker-compose build --no-cache frontend
docker-compose build backend

echo "🚀 Launching updated services..."
# ✅ Starts ONLY frontend and backend in the background
docker-compose up -d frontend backend

echo "🩺 Verifying container health..."
# ✅ Filters PS to show only this project's containers
docker-compose ps

echo "✅ Redeploy finished at $(date). Database and other VPS containers were NOT affected."