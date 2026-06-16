# Builder GPS — FastAPI backend
# Railway service "Root Directory" = apps/api, so paths below are local.

FROM python:3.11-slim

WORKDIR /app

# Install Python deps first for layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the app source.
COPY app ./app

# SQLite lives in /data, mounted as a Railway persistent volume.
# Without the volume, the DB resets on every deploy.
ENV SQLITE_PATH=/data/builder_gps.db
ENV PORT=8000

EXPOSE 8000

# Railway injects $PORT — bind explicitly so 0.0.0.0 (not localhost).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
