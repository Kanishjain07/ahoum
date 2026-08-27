#!/usr/bin/env bash
set -e

echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" >/dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is up."

python manage.py migrate --noinput

if [ "${DJANGO_DEBUG}" = "True" ]; then
  exec python manage.py runserver 0.0.0.0:8000
else
  python manage.py collectstatic --noinput
  exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3
fi
