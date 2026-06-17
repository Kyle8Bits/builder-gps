# Builder GPS — FastAPI backend
# Railway service "Root Directory" = apps/api, so paths below are local.

FROM python:3.11-slim

WORKDIR /app

# Install Python deps first for layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the app source + the standalone bootstrap script.
COPY app ./app
COPY scripts ./scripts

# SQLite lives in /data, mounted as a Railway persistent volume.
# Without the volume, the DB resets on every deploy.
ENV SQLITE_PATH=/data/builder_gps.db
ENV PORT=8000

EXPOSE 8000

# On container start:
#   1. Bootstrap embeddings — idempotent: only runs Voyage when (a) the
#      table is empty or (b) the configured model differs from what's
#      already embedded. `|| true` so a missing VOYAGE_API_KEY doesn't
#      block the API from starting; shortlist_sessions falls back to
#      "return all sessions" when the embeddings table is empty.
#   2. Start uvicorn. Railway injects $PORT; bind 0.0.0.0 (not localhost).
CMD ["sh", "-c", "python scripts/bootstrap-embeddings.py || true; uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
