#!/bin/sh
set -e

echo "==> Initializing Database..."
python db_init.py

echo "==> Starting Gunicorn on port 5005..."
exec gunicorn -b 0.0.0.0:5005 -w 2 --timeout 120 "app:create_app()"
