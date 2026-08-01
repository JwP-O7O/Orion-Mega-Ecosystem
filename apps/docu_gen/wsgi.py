"""
WSGI Entry Point for Production Deployment

This file is used by WSGI servers like Gunicorn to run the application.

Usage:
    gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
    gunicorn -c gunicorn.conf.py wsgi:app
"""
from app import app

if __name__ == "__main__":
    app.run()
