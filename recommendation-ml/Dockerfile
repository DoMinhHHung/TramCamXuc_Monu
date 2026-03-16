FROM python:3.11-slim

# Cài build tools cho implicit (cần BLAS/LAPACK để ALS chạy nhanh)
RUN apt-get update && apt-get install -y \
    build-essential \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements trước (tận dụng Docker layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port 8771 — không qua Eureka, Spring service gọi trực tiếp qua ml.service.url
EXPOSE 8771

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8771", "--workers", "2"]