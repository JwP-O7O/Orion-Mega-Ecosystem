"""
Gunicorn Configuration File

This configuration file is used to configure Gunicorn for production deployment.

Usage:
    gunicorn -c gunicorn.conf.py wsgi:app
"""
import os
import multiprocessing

# Server socket
bind = f"{os.getenv('FLASK_HOST', '0.0.0.0')}:{os.getenv('FLASK_PORT', '5000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = 'logs/gunicorn_access.log'
errorlog = 'logs/gunicorn_error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = 'docugen'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'
