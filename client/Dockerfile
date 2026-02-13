# --------------------
# ----- Build Stage -----
# --------------------
FROM node:20 AS build 

WORKDIR /app
COPY package*.json ./
RUN rm -f package-lock.json || true
RUN npm install --force 
COPY . .
RUN npm run build

# --------------------
# ----- Production Stage (Nginx) -----
# --------------------
FROM nginx:stable-alpine

# העתק קבצים סטטיים
COPY --from=build /app/dist /usr/share/nginx/html

# העתק קונפיגורציה
COPY default.conf /etc/nginx/conf.d/default.conf

# אופטימיזציה ל-OpenShift: יצירת כל התיקיות ש-Nginx צריך מראש
RUN mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp \
             /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp \
             /var/log/nginx \
             /var/run/nginx

# 1. ביטול הנחיית ה-user בקובץ הראשי (מונע את ה-Warning)
RUN sed -i 's/^user/#user/' /etc/nginx/nginx.conf

# 2. שינוי נתיב ה-PID למיקום שיש בו הרשאות כתיבה
RUN sed -i 's|/run/nginx.pid|/var/log/nginx/nginx.pid|g' /etc/nginx/nginx.conf

# 3. הצעד הקריטי ביותר: שינוי בעלות לקבוצה 0 והענקת הרשאות כתיבה לקבוצה
# זה מה שמאפשר למשתמש האקראי של OpenShift להריץ את השרת
RUN chgrp -R 0 /var/cache/nginx /var/log/nginx /var/run/nginx /usr/share/nginx/html && \
    chmod -R g=u /var/cache/nginx /var/log/nginx /var/run/nginx /usr/share/nginx/html

# הסרת קבצי ברירת מחדל מיותרים
RUN rm -f /etc/nginx/conf.d/default.conf.orig

# הרצה כמשתמש לא-root (101 הוא ה-UID של nginx ב-Alpine)
USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]