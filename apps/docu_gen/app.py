"""
DocuGen - Document Generation Application with User Authentication
"""
import os
import secrets
import re
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from io import BytesIO
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_file, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps

# Import new PDF engine
from pdf_generator import dispatch_pdf_generation

# Import Sentry for error tracking (optional)
try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

app = Flask(__name__)

# Security: Generate a secure random key if not provided
if 'SECRET_KEY' not in os.environ:
    # In development, generate a random key
    # In production, this should be set as an environment variable
    app.config['SECRET_KEY'] = secrets.token_hex(32)
    print("WARNING: Using auto-generated SECRET_KEY. Set SECRET_KEY environment variable for production!")
else:
    app.config['SECRET_KEY'] = os.environ['SECRET_KEY']

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///docugen.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Database connection pooling configuration
app.config['SQLALCHEMY_POOL_SIZE'] = 10
app.config['SQLALCHEMY_POOL_TIMEOUT'] = 30
app.config['SQLALCHEMY_POOL_RECYCLE'] = 3600
app.config['SQLALCHEMY_MAX_OVERFLOW'] = 20

# Session security configuration
app.config['SESSION_COOKIE_SECURE'] = not app.debug  # True in production (HTTPS only)
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour session timeout

db = SQLAlchemy(app)

# Initialize Flask extensions
migrate = Migrate(app, db)  # Database migrations
csrf = CSRFProtect(app)  # CSRF protection
compress = Compress(app)  # Response compression

# Rate limiting (protect against brute force)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Setup Sentry error tracking if configured
if SENTRY_AVAILABLE and os.getenv('SENTRY_DSN'):
    sentry_sdk.init(
        dsn=os.getenv('SENTRY_DSN'),
        integrations=[FlaskIntegration()],
        traces_sample_rate=1.0,
        environment=os.getenv('FLASK_ENV', 'production'),
        release=os.getenv('APP_VERSION', 'unknown')
    )
    app.logger.info('Sentry error tracking initialized')

# Setup logging
def setup_logging(app):
    """Configure application logging with rotation"""
    if not app.debug:
        # Create logs directory if it doesn't exist
        if not os.path.exists('logs'):
            os.mkdir('logs')

        # File handler with rotation (10MB max, keep 10 backup files)
        file_handler = RotatingFileHandler(
            'logs/docugen.log',
            maxBytes=10485760,
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)

    # Console handler for all environments
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    app.logger.addHandler(console_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('DocuGen application startup')

setup_logging(app)

ALLOWED_DOC_TYPES = {'letter', 'invoice', 'report', 'receipt', 'general'}
ALLOWED_AI_FILE_EXTENSIONS = {'txt', 'md'}
MAX_AI_FILE_SIZE = 50 * 1024  # 50KB cap to avoid large uploads
MAX_SUMMARY_LENGTH = 320
MAX_TITLE_LENGTH = 80
TITLE_TRUNCATE_LENGTH = 77
BULLET_STRIP_CHARS = ' -•\t'


class User(db.Model):
    """User model for authentication"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    documents = db.relationship('Document', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and set user password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


class Document(db.Model):
    """Document model for tracking generated documents"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Blockchain fields (Week 1-2)
    blockchain_hash = db.Column(db.String(66))  # 0x + 64 hex chars (SHA-256)
    blockchain_tx = db.Column(db.String(66))    # Transaction hash on blockchain
    ipfs_cid = db.Column(db.String(100))        # IPFS Content Identifier
    blockchain_verified = db.Column(db.Boolean, default=False)  # Registration status
    blockchain_timestamp = db.Column(db.DateTime)  # When registered on blockchain

    def __repr__(self):
        return f'<Document {self.title}>'


def normalize_doc_type(doc_type):
    """Return a supported document type or default to general."""
    normalized = (doc_type or '').lower()
    return normalized if normalized in ALLOWED_DOC_TYPES else 'general'


def clean_text(value):
    """Strip control characters to keep generated content safe."""
    if not value:
        return ''
    normalized = value.replace('\r\n', '\n').replace('\r', '\n')
    # Remove non-printable/control characters but preserve tabs/newlines
    sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', normalized)
    return sanitized.strip()


def validate_email(email):
    """
    Validate email format and length.

    Args:
        email: Email address to validate

    Returns:
        str: Normalized email (lowercase, trimmed)

    Raises:
        ValueError: If email is invalid
    """
    email = (email or '').strip().lower()

    if not email:
        raise ValueError("Email address is required")

    if len(email) > 120:
        raise ValueError("Email address is too long (max 120 characters)")

    # Basic email regex pattern
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        raise ValueError("Please enter a valid email address")

    return email


def validate_password(password):
    """
    Validate password strength.

    Requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

    Args:
        password: Password to validate

    Raises:
        ValueError: If password doesn't meet requirements
    """
    if not password:
        raise ValueError("Password is required")

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")

    if not re.search(r'[A-Z]', password):
        raise ValueError("Password must contain at least one uppercase letter")

    if not re.search(r'[a-z]', password):
        raise ValueError("Password must contain at least one lowercase letter")

    if not re.search(r'[0-9]', password):
        raise ValueError("Password must contain at least one number")

    return True


def validate_username(username):
    """
    Validate username format.

    Args:
        username: Username to validate

    Returns:
        str: Normalized username (trimmed)

    Raises:
        ValueError: If username is invalid
    """
    username = (username or '').strip()

    if not username:
        raise ValueError("Username is required")

    if len(username) < 3:
        raise ValueError("Username must be at least 3 characters long")

    if len(username) > 80:
        raise ValueError("Username is too long (max 80 characters)")

    # Only allow alphanumeric and underscore
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Username can only contain letters, numbers, and underscores")

    return username


def load_text_from_upload(upload):
    """Extract safe text from an uploaded file."""
    if not upload or not upload.filename:
        return ''

    filename = secure_filename(upload.filename)
    if not filename:
        return ''

    ext = filename.rpartition('.')[2].lower() if '.' in filename else ''
    if not ext or ext not in ALLOWED_AI_FILE_EXTENSIONS:
        raise ValueError('Unsupported file type. Please upload a .txt or .md file.')

    data = upload.read(MAX_AI_FILE_SIZE + 1)
    if len(data) > MAX_AI_FILE_SIZE:
        raise ValueError('File too large. Please upload a file smaller than 50KB.')

    return data.decode('utf-8', errors='replace')


def _summarize_text(text):
    """Generate a short summary from provided text."""
    cleaned = clean_text(text)
    if not cleaned:
        return ''
    sentences = re.split(r'(?<=[.!?])\s+', cleaned)
    if sentences and sentences[0].strip():
        return ' '.join(sentences[:2]).strip()
    return cleaned[:MAX_SUMMARY_LENGTH].strip()


def generate_ai_draft(prompt_text, file_text, doc_type):
    """
    Generate a deterministic AI-like draft based on prompt and optional file text.
    
    Args:
        prompt_text (str): Freeform user prompt describing desired output.
        file_text (str): Optional supporting context text.
        doc_type (str): Document type key (letter, invoice, report, general).

    Returns:
        tuple[str, str]: Suggested (title, content) strings.
    """
    doc_type = normalize_doc_type(doc_type)
    prompt_text = clean_text(prompt_text)
    file_text = clean_text(file_text)

    combined_parts = [part for part in [prompt_text, file_text] if part]
    combined = '\n'.join(combined_parts)
    if combined_parts:
        summary = _summarize_text(combined) or "Automated content generated from your inputs."
    else:
        summary = "Automated content generated from your inputs."

    # Derive a concise title
    if not prompt_text and not file_text:
        title_candidate = f"AI {doc_type.capitalize()} Draft"
    else:
        title_source = prompt_text or summary
        title_candidate = title_source.splitlines()[0] if title_source else ''
        title_candidate = re.sub(r'\s+', ' ', title_candidate).strip()
        if len(title_candidate) > MAX_TITLE_LENGTH:
            title_candidate = title_candidate[:TITLE_TRUNCATE_LENGTH].rstrip() + '...'
        if not title_candidate:
            title_candidate = f"AI {doc_type.capitalize()} Draft"

    # Collect bullet-style highlights
    raw_lines = []
    for line in combined.splitlines():
        if not line.strip():
            continue
        stripped = line.strip(BULLET_STRIP_CHARS)
        if stripped:
            raw_lines.append(stripped)
    bullet_points = raw_lines[:4]
    if not bullet_points:
        bullet_points = [summary]

    section_templates = {
        'letter': ['Purpose', 'Key Points', 'Closing'],
        'invoice': ['Scope Summary', 'Deliverables', 'Next Steps'],
        'report': ['Context', 'Findings', 'Recommendations'],
        'receipt': ['Items', 'Payment Details', 'Notes'],
        'general': ['Overview', 'Details', 'Actions']
    }
    
    sections = []
    
    # Special handling for Receipt to ensure it matches the PDF generator expectations
    if doc_type == 'receipt':
        # Create a mock receipt structure
        sections.append("Itemize your purchase here (Format: Item: Price):")
        sections.append("Laptop: 1200.00")
        sections.append("Mouse: 25.00")
        sections.append("Warranty: 150.00")
        sections.append("")
        sections.append(f"Notes: {summary}")
    else:
        # Standard logic
        for idx, heading in enumerate(section_templates.get(doc_type, section_templates['general'])):
            section_lines = []
            if idx == 0:
                section_lines.append(summary)
            else:
                for point in bullet_points:
                    section_lines.append(f"- {point}")
            sections.append(f"{heading}\n" + '\n'.join(section_lines))

    content = '\n\n'.join(sections) if doc_type != 'receipt' else '\n'.join(sections)

    return title_candidate, content


def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


@app.context_processor
def inject_now():
    return {'now': datetime.utcnow()}


@app.route('/')
def index():
    """Home page"""
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        return render_template('dashboard.html', user=user)
    return render_template('index.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        try:
            # Get form data
            username_raw = request.form.get('username', '')
            email_raw = request.form.get('email', '')
            password = request.form.get('password', '')
            confirm_password = request.form.get('confirm_password', '')

            # Validate and normalize inputs
            username = validate_username(username_raw)
            email = validate_email(email_raw)

            # Validate password
            validate_password(password)

            # Check password confirmation
            if password != confirm_password:
                flash('Passwords do not match.', 'error')
                return render_template('register.html')

            # Check if user already exists
            if User.query.filter_by(username=username).first():
                flash('Username already exists.', 'error')
                app.logger.warning(f'Registration attempt with existing username: {username}')
                return render_template('register.html')

            if User.query.filter_by(email=email).first():
                flash('Email already registered.', 'error')
                app.logger.warning(f'Registration attempt with existing email: {email}')
                return render_template('register.html')

            # Create new user
            user = User(username=username, email=email)
            user.set_password(password)
            db.session.add(user)
            db.session.commit()

            app.logger.info(f'New user registered: {username} ({email}) from {request.remote_addr}')
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))

        except ValueError as e:
            # Validation error - show user-friendly message
            flash(str(e), 'error')
            return render_template('register.html')
        except Exception as e:
            # Unexpected error
            app.logger.error(f'Registration error: {e}', exc_info=True)
            flash('An error occurred during registration. Please try again.', 'error')
            return render_template('register.html')

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("5 per minute")  # Rate limiting: max 5 login attempts per minute
def login():
    """User login"""
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            app.logger.warning(f'Login attempt with missing credentials from {request.remote_addr}')
            flash('Please provide both username and password.', 'error')
            return render_template('login.html')

        user = User.query.filter_by(username=username).first()

        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            app.logger.info(f'User login successful: {username} from {request.remote_addr}')
            flash(f'Welcome back, {user.username}!', 'success')
            return redirect(url_for('index'))
        else:
            app.logger.warning(f'Failed login attempt for username: {username} from {request.remote_addr}')
            flash('Invalid username or password.', 'error')

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    """User logout"""
    username = session.get('username', '')
    app.logger.info(f'User logout: {username} from {request.remote_addr}')
    session.clear()
    flash(f'Goodbye, {username}!', 'info')
    return redirect(url_for('index'))


@app.route('/health')
@csrf.exempt  # Health checks don't need CSRF protection
def health_check():
    """
    Health check endpoint for load balancers and monitoring.
    Returns JSON with health status and basic system info.
    """
    try:
        # Check database connection
        db.session.execute(db.text('SELECT 1'))

        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat(),
            'version': os.getenv('APP_VERSION', 'unknown')
        }), 200

    except Exception as e:
        app.logger.error(f'Health check failed: {e}', exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503


@app.route('/dashboard')
@login_required
def dashboard():
    """User dashboard"""
    user = User.query.get(session['user_id'])
    documents = Document.query.filter_by(user_id=user.id).order_by(Document.created_at.desc()).all()
    return render_template('dashboard.html', user=user, documents=documents)


@app.route('/generate', methods=['GET', 'POST'])
@login_required
def generate_document():
    """Generate a new document"""
    form_state = {
        'doc_type': '',
        'title': '',
        'content': '',
        'ai_prompt': '',
        'max_ai_size_kb': MAX_AI_FILE_SIZE // 1024
    }
    if request.method == 'POST':
        action = request.form.get('action', 'create')
        raw_type = request.form.get('doc_type', '')
        bank_style = request.form.get('bank_style', 'generic')
        
        # Combine type and style if receipt
        if raw_type == 'receipt':
            # Hack: Store style in "doc_type" field as "receipt:ing"
            final_doc_type = f"receipt:{bank_style}"
        else:
            final_doc_type = normalize_doc_type(raw_type)

        title = request.form.get('title', '').strip()
        content = request.form.get('content', '').strip()
        ai_prompt = request.form.get('ai_prompt', '').strip()

        form_state.update({'doc_type': raw_type, 'title': title, 'content': content, 'ai_prompt': ai_prompt})

        if action == 'ai_generate':
            try:
                file_text = load_text_from_upload(request.files.get('ai_file'))
            except ValueError as exc:
                flash(str(exc), 'error')
                return render_template('generate.html', **form_state)

            if not ai_prompt and not file_text:
                flash('Provide a prompt or upload a text/markdown file for AI generation.', 'error')
                return render_template('generate.html', **form_state)

            generated_title, generated_content = generate_ai_draft(ai_prompt, file_text, raw_type)
            form_state['title'] = title or generated_title
            
            # Pre-fill content with bank specific template if receipt
            if raw_type == 'receipt':
                form_state['content'] = "Bedrag: € 0,00\nNaam: \nVan Rekening: \nOntvanger: \nNaar Rekening: \nOmschrijving: " + generated_content
            else:
                form_state['content'] = generated_content
                
            flash('AI draft generated. Review and edit before creating the PDF.', 'info')
            return render_template('generate.html', **form_state)

        # Create document record
        document = Document(
            title=title,
            doc_type=final_doc_type, # Stores "receipt:ing" or "invoice" etc.
            content=content,
            user_id=session['user_id']
        )
        db.session.add(document)
        db.session.commit()

        flash(f'Document "{title}" created successfully!', 'success')
        return redirect(url_for('download_document', doc_id=document.id))

    return render_template('generate.html', **form_state)


@app.route('/download/<int:doc_id>')
@login_required
def download_document(doc_id):
    """Download a generated document"""
    document = Document.query.get_or_404(doc_id)
    
    if document.user_id != session['user_id']:
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    user = User.query.get(document.user_id)
    pdf_buffer = BytesIO()
    
    # Parse doc_type for style
    # We essentially create a temporary "proxy" object to pass to the generator
    class DocProxy:
        pass
    
    doc_proxy = DocProxy()
    doc_proxy.content = document.content
    doc_proxy.title = document.title
    doc_proxy.created_at = document.created_at
    doc_proxy.id = document.id
    
    bank_style = 'generic'
    
    if ':' in document.doc_type:
        base_type, style = document.doc_type.split(':', 1)
        doc_proxy.doc_type = base_type
        bank_style = style
    else:
        doc_proxy.doc_type = document.doc_type

    try:
        dispatch_pdf_generation(pdf_buffer, doc_proxy, user, bank_style=bank_style)
    except ValueError as e:
        app.logger.warning(f"Invalid document data for doc_id={doc_id}: {e}", exc_info=True)
        flash(f"Invalid document data: {str(e)}", "error")
        return redirect(url_for('dashboard'))
    except IOError as e:
        app.logger.error(f"PDF generation I/O error for doc_id={doc_id}: {e}", exc_info=True)
        flash("Failed to generate PDF. Please try again later.", "error")
        return redirect(url_for('dashboard'))
    except Exception as e:
        app.logger.critical(f"Unexpected PDF generation error for doc_id={doc_id}: {e}", exc_info=True)
        flash("An unexpected error occurred. Support has been notified.", "error")
        return redirect(url_for('dashboard'))
    
    pdf_buffer.seek(0)
    
    safe_title = secure_filename(document.title)
    if not safe_title: safe_title = "document"
    filename = f"{safe_title}_{document.id}.pdf"
    
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )


@app.route('/delete/<int:doc_id>', methods=['POST'])
@login_required
def delete_document(doc_id):
    """Delete a document"""
    document = Document.query.get_or_404(doc_id)
    
    # Verify ownership
    if document.user_id != session['user_id']:
        flash('Access denied.', 'error')
        return redirect(url_for('dashboard'))
    
    title = document.title
    db.session.delete(document)
    db.session.commit()
    
    flash(f'Document "{title}" deleted successfully.', 'success')
    return redirect(url_for('dashboard'))


def init_db():
    """Initialize the database"""
    with app.app_context():
        db.create_all()
        print('Database initialized successfully.')


if __name__ == '__main__':
    init_db()
    # Get debug mode from environment, default to False for safety
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    # In production, host should be configured by WSGI server
    # For development, allow override via environment variable
    host = os.environ.get('FLASK_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_PORT', '5000'))
    
    if debug_mode:
        print("WARNING: Running in debug mode. This should only be used in development!")
    
    app.run(debug=debug_mode, host=host, port=port)
