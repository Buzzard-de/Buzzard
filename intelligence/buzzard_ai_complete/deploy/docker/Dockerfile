FROM python:3.13-slim
WORKDIR /app
COPY buzzard_ai_complete/requirements.txt ./buzzard_ai_complete/requirements.txt
RUN pip install --no-cache-dir -r buzzard_ai_complete/requirements.txt
COPY buzzard_ai_complete ./buzzard_ai_complete
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["uvicorn", "buzzard_ai_complete.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
