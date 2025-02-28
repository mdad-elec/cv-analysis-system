# CV Analysis System

A comprehensive CV analysis system that processes CV documents (PDF/DOCX), extracts information using OCR, and provides a chatbot interface for querying the extracted information.

## Features

- **Document Processing**
  - Support for PDF and DOCX formats
  - OCR for text extraction from images/scanned documents
  - Extraction of personal information, education, work experience, skills, projects, and certifications

- **LLM Integration**
  - Anthropic Claude API integration for advanced CV analysis
  - Structured information extraction
  - Natural language query capabilities

- **Query System**
  - Chatbot interface for querying CV information
  - Support for finding candidates with specific skills
  - Comparing education levels and experience
  - Matching candidates to job requirements

- **Monitoring & Logging**
  - Prometheus for metrics collection
  - Grafana for visualization
  - Structured JSON logging

## Architecture

The system consists of the following components:

- **Backend**: FastAPI application for document processing and API endpoints
- **Frontend**: React application for user interface
- **MongoDB**: Document database for storing CV data
- **Redis**: Caching and rate limiting
- **Anthropic API**: LLM for CV analysis and query handling
- **Prometheus & Grafana**: Monitoring and visualization

## Technology Stack

- **Backend**
  - Python 3.11
  - FastAPI
  - PyPDF2 and python-docx for document parsing
  - Tesseract OCR with pytesseract
  - Spacy for NLP
  - Anthropic Claude API
  - MongoDB with motor (async driver)
  - Redis for caching

- **Frontend**
  - React 18
  - Chakra UI
  - Axios for API requests
  - React Router
  - Socket.IO for real-time updates

- **Monitoring & DevOps**
  - Docker and Docker Compose
  - Prometheus
  - Grafana
  - JSON logging

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- Anthropic API key

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/mdad-elec/cv-analysis-system.git
   cd cv-analysis-system
   ```

2. Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Create the necessary directories:
   ```bash
   mkdir -p data/uploads
   mkdir -p monitoring/prometheus
   mkdir -p monitoring/grafana/provisioning/dashboards
   mkdir -p monitoring/grafana/provisioning/datasources
   ```

5. Start the services:
   ```bash
   docker-compose up -d
   ```

6. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000 (admin/admin)

## Usage

### Uploading CVs

1. Navigate to the "Upload" page
2. Drag and drop CV files (PDF or DOCX format)
3. Wait for the processing to complete

### Using the Chatbot

1. Navigate to the "Chatbot" page
2. Ask questions about the uploaded CVs
3. Examples:
   - "Who has experience with Python?"
   - "Find candidates with a Master's degree"
   - "Which candidates have worked at tech companies?"
   - "Compare the skills of all candidates"
   - "Who would be a good fit for a Senior Developer role?"

### Viewing Documents

1. Navigate to the "Documents" page to see all uploaded CVs
2. Click on a document to view the extracted information

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## Testing

### Running Backend Tests

```bash
cd backend
pytest
```

### Running Frontend Tests

```bash
cd frontend
npm test
```

## API Documentation

Once the backend is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Monitoring

- Prometheus metrics are available at http://localhost:9090
- Grafana dashboards are available at http://localhost:3000
