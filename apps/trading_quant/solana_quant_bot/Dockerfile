FROM python:3.11-slim

WORKDIR /app

# Systeem afhankelijkheden
RUN apt-get update && apt-get install -y --no-install-recommends     build-essential     curl     && rm -rf /var/lib/apt/lists/*

# Python afhankelijkheden
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopieer de rest van de code
COPY . .

# Maak data mappen aan
RUN mkdir -p data logs

# Start de bot
CMD ["python", "main.py"]
