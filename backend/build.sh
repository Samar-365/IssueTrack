#!/usr/bin/env bash
# Render build script — runs during every deploy
set -o errexit

echo "===> Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "===> Running database initialization..."
python db_init.py

echo "===> Build complete!"
