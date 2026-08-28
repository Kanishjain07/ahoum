#!/usr/bin/env bash
set -e

if [ -n "${POSTGRES_HOST}" ]; then
  echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT:-5432}..."
  until pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
    sleep 1
  done
  echo "PostgreSQL is up."
fi

python manage.py migrate --noinput

PORT="${PORT:-8000}"

if [ "${DJANGO_DEBUG}" = "True" ]; then
  exec python manage.py runserver 0.0.0.0:${PORT}
else
  python manage.py collectstatic --noinput
  exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 3
fi
