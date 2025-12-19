# -----------------------------------------------------------
# Stage 1: Build React app
# -----------------------------------------------------------
# ✅ Upgraded to Node 20 for better React 19 support
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# ✅ FIXED: Added --legacy-peer-deps to ignore version conflicts with React 19
RUN npm install --legacy-peer-deps

# Copy rest of the source code
COPY . .

# Tell CRA to use production env automatically
ENV NODE_ENV=production

# Build the app
RUN npm run build

# -----------------------------------------------------------
# Stage 2: Serve using Nginx
# -----------------------------------------------------------
FROM nginx:stable-alpine

# Remove default Nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built React files
COPY --from=build /app/build /usr/share/nginx/html

# Copy your Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose default Nginx port
EXPOSE 80

# Run Nginx
CMD ["nginx", "-g", "daemon off;"]