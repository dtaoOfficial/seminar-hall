# -----------------------------------------------------------
# Stage 1: Build React app
# -----------------------------------------------------------
FROM node:18-alpine AS build
WORKDIR /app

# Copy dependency files first
COPY package*.json ./
RUN npm install

# Copy rest of the source code
COPY . .

# 👇 Tell CRA to use production env automatically
ENV NODE_ENV=production

# Build the app using the correct environment file (.env.production)
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
