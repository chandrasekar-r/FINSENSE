FROM python:3.11-alpine

# Set working directory
WORKDIR /app

# Alpine doesn't use apt, so remove this line

RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-dev \
    leptonica-dev \
    pkgconf \
    g++ \
    mesa-gl \
    glib \
    libsm \
    libxext \
    libxrender-dev \
    libgomp \
    curl \
    ca-certificates \
    tesseract-ocr-data-deu

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js for building frontend
RUN apk add --no-cache nodejs npm

# Install Tesseract.js
RUN npm install tesseract.js --prefix /app

# Copy frontend source (including package-lock.json)
COPY frontend/package*.json ./frontend/
COPY frontend/ ./frontend/

# Build frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

# Go back to app directory and copy Python source
WORKDIR /app
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run the application with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]