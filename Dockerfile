# Stage 1
FROM node:16.18-alpine as build

WORKDIR /app
RUN npm cache clean --force
COPY . .
RUN npm install
RUN npm run build --prod

# Stage 2
FROM nginx:1.22.0-alpine as deploy

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/messenger /usr/share/nginx/html
