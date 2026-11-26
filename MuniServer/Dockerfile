FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --require-hashes -r requirements.txt
# Sin root: el proceso corre como un usuario sin privilegios.
RUN useradd --create-home --uid 1000 muni && mkdir -p /app/staticfiles && chown muni:muni /app/staticfiles
COPY --chown=muni:muni . .
USER muni
EXPOSE 8000
