FROM python:3.11-slim

WORKDIR /app

# Copy function code
COPY main.py .
COPY requirements.txt .

# Install dependencies (if any)
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8080

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the function
CMD ["python", "-u", "-m", "http.server", "8080", "--bind", "0.0.0.0"]

# For production, use a proper WSGI server like gunicorn
# RUN pip install gunicorn
# CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "main:Handler"]
