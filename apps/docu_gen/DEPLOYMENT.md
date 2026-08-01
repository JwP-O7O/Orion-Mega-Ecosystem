# DocuGen Deployment Guide

This guide explains how to deploy DocuGen to production with all the security and performance improvements.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running in Production](#running-in-production)
- [Health Monitoring](#health-monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 13+ (recommended for production) or SQLite
- Nginx or Apache (optional, for reverse proxy)
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/DocuGen.git
cd DocuGen
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
pip install -r requirements-prod.txt
```

## Configuration

### 1. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Generate Secret Key

**CRITICAL:** Generate a secure random secret key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and update `SECRET_KEY` in `.env`:

```env
SECRET_KEY=your-generated-secret-key-here
```

### 3. Configure Database

For production, use PostgreSQL instead of SQLite:

```env
SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost:5432/docugen
```

### 4. Optional: Sentry Error Tracking

Sign up at [sentry.io](https://sentry.io) and add your DSN:

```env
SENTRY_DSN=https://your-sentry-dsn-here
```

## Database Setup

### Initialize Database Migrations

```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### Verify Database

```bash
python -c "from app import app, db; app.app_context().push(); db.create_all(); print('Database initialized successfully')"
```

## Running in Production

### Option 1: Gunicorn (Recommended)

#### Start with default config:

```bash
gunicorn -c gunicorn.conf.py wsgi:app
```

#### Or with custom parameters:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 30 wsgi:app
```

### Option 2: Systemd Service

Create `/etc/systemd/system/docugen.service`:

```ini
[Unit]
Description=DocuGen Application
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/path/to/DocuGen
Environment="PATH=/path/to/DocuGen/venv/bin"
ExecStart=/path/to/DocuGen/venv/bin/gunicorn -c gunicorn.conf.py wsgi:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable docugen
sudo systemctl start docugen
sudo systemctl status docugen
```

### Option 3: Docker

```bash
docker build -t docugen .
docker run -d -p 5000:5000 --env-file .env docugen
```

## Nginx Reverse Proxy (Recommended)

Create `/etc/nginx/sites-available/docugen`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Certificate
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Proxy to Gunicorn
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }

    # Static files (if any)
    location /static {
        alias /path/to/DocuGen/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/docugen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Health Monitoring

### Health Check Endpoint

The application exposes a `/health` endpoint that returns JSON:

```bash
curl http://localhost:5000/health
```

Response (healthy):

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:00.000000",
  "version": "1.0.0"
}
```

### Log Files

Application logs are stored in `logs/`:

- `logs/docugen.log` - Application logs (rotated at 10MB)
- `logs/gunicorn_access.log` - Access logs
- `logs/gunicorn_error.log` - Error logs

View logs:

```bash
tail -f logs/docugen.log
tail -f logs/gunicorn_error.log
```

### Monitoring with Uptime Services

Configure services like UptimeRobot or Pingdom to monitor:

- URL: `https://yourdomain.com/health`
- Expected response: 200 OK
- Check interval: 5 minutes

## Security Checklist

Before going to production, verify:

- [ ] `SECRET_KEY` is a random 64-character hex string
- [ ] `FLASK_DEBUG=false` in production
- [ ] Database backups are scheduled
- [ ] HTTPS is enabled (SSL certificate installed)
- [ ] Firewall rules are configured
- [ ] Only necessary ports are open (80, 443)
- [ ] Database credentials are secure
- [ ] Sentry DSN is configured (optional but recommended)
- [ ] Regular updates scheduled for dependencies

## Backup Strategy

### Database Backups

For PostgreSQL:

```bash
# Create backup
pg_dump -U user docugen > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -U user docugen < backup_20240115_103000.sql
```

Automate with cron (daily at 2 AM):

```cron
0 2 * * * /path/to/backup_script.sh
```

### Application Backups

Backup entire application directory (excluding venv):

```bash
tar -czf docugen_backup_$(date +%Y%m%d).tar.gz \
  --exclude='venv' \
  --exclude='*.db' \
  --exclude='logs' \
  --exclude='__pycache__' \
  DocuGen/
```

## Troubleshooting

### Application won't start

1. Check logs: `tail -f logs/gunicorn_error.log`
2. Verify environment variables: `cat .env`
3. Test database connection: `flask db upgrade`

### Rate limiting errors

If legitimate users are being rate-limited:

1. Increase limits in `app.py` (limiter configuration)
2. Use Redis for distributed rate limiting in multi-server setups

### Database migration errors

```bash
# Reset migrations (CAUTION: data loss)
rm -rf migrations/
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### Permission errors

Ensure correct ownership:

```bash
sudo chown -R www-data:www-data /path/to/DocuGen
sudo chmod -R 755 /path/to/DocuGen
```

### Out of memory

Reduce Gunicorn workers:

```env
GUNICORN_WORKERS=2
```

Or increase server RAM.

## Performance Tuning

### Database Connection Pooling

Already configured in `app.py`:

```python
SQLALCHEMY_POOL_SIZE = 10
SQLALCHEMY_POOL_TIMEOUT = 30
SQLALCHEMY_MAX_OVERFLOW = 20
```

### Gunicorn Workers

Formula: `(2 * CPU_cores) + 1`

For 4 cores: 9 workers

```env
GUNICORN_WORKERS=9
```

### Response Compression

Already enabled via `Flask-Compress`. Verify:

```bash
curl -H "Accept-Encoding: gzip" -I http://localhost:5000/
```

Should see: `Content-Encoding: gzip`

## Updates & Maintenance

### Update Dependencies

```bash
pip install --upgrade -r requirements.txt
pip install --upgrade -r requirements-prod.txt
```

### Update Application

```bash
git pull origin main
pip install -r requirements.txt
flask db upgrade
sudo systemctl restart docugen
```

### Security Updates

Check for vulnerabilities:

```bash
pip install safety
safety check
```

## Support

For issues or questions:

- GitHub Issues: https://github.com/yourusername/DocuGen/issues
- Email: support@yourdomain.com

## License

MIT License - see LICENSE file for details.
