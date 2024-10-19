FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY script.js /usr/share/nginx/html/script.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /var/cache/nginx

EXPOSE 80

VOLUME /app

CMD ["nginx", "-g", "daemon off;"]