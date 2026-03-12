FROM python:3.11-slim

WORKDIR /app

COPY consumer_app/requirements.txt /app/consumer_app/requirements.txt
RUN pip install --no-cache-dir -r /app/consumer_app/requirements.txt

COPY consumer_app /app/consumer_app

EXPOSE 8001

CMD ["python", "-m", "uvicorn", "consumer_app.app:app", "--host", "0.0.0.0", "--port", "8001"]

