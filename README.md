# IronStore AI Assistant

**A document-grounded enterprise AI assistant built with React, FastAPI, LangChain, OpenAI, and Pinecone.**

IronStore AI Assistant allows users to ask natural-language questions about a fictional company's internal policies, operational procedures, and product catalog. It retrieves relevant content from PDF documents and generates answers with traceable document references.

This project was developed by **Diogo Fonseca** as part of the **Ironhack AI Engineering Bootcamp**, using the synthetic IronStore dataset supplied in the [original project brief](https://github.com/ironhack-rmt-AI-student-materials/project-brief-enterprise-ai-assistant).

## Features

- **Retrieval-Augmented Generation (RAG):** answers grounded in a Pinecone vector index built from 83 PDF documents.
- **Conversational AI:** a LangChain-powered assistant using OpenAI models and document-search tools.
- **Real-time streaming:** answers appear incrementally in the React interface via an NDJSON stream.
- **Document references:** PDF filenames and page numbers, with clickable links to the original documents.
- **Multi-question support:** handles questions containing multiple requests.
- **Response feedback:** thumbs-up/down ratings submitted to the backend and stored locally in SQLite.
- **Chat history:** conversations saved in the browser using `localStorage`, with a New Chat action.
- **Responsive dashboard:** glassmorphism-inspired interface built with React, Vite, and Tailwind CSS.
- **Basic safety checks:** filters for suspicious retrieval content and prompt-injection patterns; these are not a substitute for production security controls.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS |
| Backend API | Python, FastAPI, Uvicorn |
| LLM | OpenAI (`gpt-4.1-mini`) |
| Embeddings | OpenAI (`text-embedding-3-small`) |
| RAG and agent orchestration | LangChain |
| Vector database | Pinecone |
| Document processing | PDF ingestion, text splitting, vector embeddings |
| Feedback storage | SQLite |
| Automated tests | Pytest |

## Architecture

```text
Browser — React / Vite / Tailwind
       |
       | HTTP requests + streamed NDJSON
       v
FastAPI backend
       |
       +-- Chat and multi-question orchestration
       +-- LangChain agent and document-search tools
       |       |
       |       +-- OpenAI (generation + embeddings)
       |       +-- Pinecone (vector retrieval)
       |
       +-- PDF reference endpoints
       +-- SQLite feedback storage
       |
       v
83 synthetic IronStore PDF documents
```

The original documents are included under `documents/extracted/documents/`. The Pinecone index is populated separately during ingestion; starting the API does not automatically re-index the PDFs.

## Project structure

```text
ironstore-ai-assistant/
├── api.py                  # FastAPI endpoints
├── app.py                  # Earlier Streamlit interface
├── requirements.txt        # Python dependencies
├── .python-version         # Python runtime version
├── src/
│   ├── rag.py              # Retrieval and grounded answering
│   ├── ironstore_agent.py  # LangChain agent
│   ├── agent_tools.py      # Document-search tools
│   ├── multi_qa.py         # Multi-question handling and streaming
│   ├── multi_question.py   # Question splitting
│   ├── ingestion.py        # PDF processing
│   ├── ingest_all.py       # Document ingestion script
│   ├── source_utils.py     # Document reference utilities
│   └── feedback_db.py      # SQLite feedback
├── documents/
│   └── extracted/documents/ # Synthetic internal docs and catalogs
├── tests/                  # Automated API and security tests
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/      # Sidebar, messages, sources, icons
    │   └── lib/api.js      # Backend requests and NDJSON parser
    └── vite.config.js
```

## Run locally

### Prerequisites

- Python 3.13
- Node.js and npm, compatible with the included Vite version
- OpenAI API key
- Pinecone API key and an existing, populated Pinecone index

### 1. Clone the repository

```bash
git clone https://github.com/fonsecadiogo/ironstore-ai-assistant.git
cd ironstore-ai-assistant
```

### 2. Set up the Python environment (Windows PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 3. Configure backend environment variables

Create a `.env` file in the project root:

```dotenv
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ironstore-rag
```

Use the name of your existing Pinecone index if it differs from `ironstore-rag`. **Never commit real API keys.**

### 4. Start the FastAPI backend

```powershell
python -m uvicorn api:app --reload --port 8000
```

Useful local URLs:

- Health check: `http://127.0.0.1:8000/api/health`
- API documentation: `http://127.0.0.1:8000/docs`

### 5. Start the React frontend

In a **second terminal**:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173` in the browser. The Vite development server proxies `/api` requests to the local FastAPI backend. Alternatively, `frontend/.env.local` can define `VITE_API_BASE_URL=http://127.0.0.1:8000`.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/chat` | Get a complete AI response |
| `POST` | `/api/chat/stream` | Stream a response as NDJSON events |
| `GET` | `/api/documents/{filename}` | Open a referenced PDF |
| `POST` | `/api/feedback` | Record an up/down rating |

Example streaming request:

```json
{
  "question": "What is IronStore's remote work policy?"
}
```

The streaming endpoint emits events such as `start`, `token`, `sources`, and `done`. Document references include filenames and page numbers.

Example feedback payload:

```json
{
  "message_id": "response-message-id",
  "rating": "up"
}
```

## Build and tests

From the project root, run backend tests:

```powershell
python -m pytest tests/ -v
```

To build the frontend:

```powershell
cd frontend
npm run build
```

The production frontend build is generated in `frontend/dist/`.

## Deployment configuration

The application is structured for a **FastAPI backend on Render** and a **React frontend on Vercel**. Deployment URLs are not included until the services are published.

**Render (backend)**

- Root directory: repository root
- Build command: `pip install -r requirements.txt`
- Start command: `python -m uvicorn api:app --host 0.0.0.0 --port $PORT`
- Environment variables: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `CORS_ORIGINS`

**Vercel (frontend)**

- Root directory: `frontend`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-backend-service.onrender.com`

Set `CORS_ORIGINS` on the backend to the actual HTTPS URL of the deployed frontend.

> **Deployment note:** The current project is a bootcamp demonstration, not a hardened multi-user service. Chat history is browser-local, SQLite feedback can be lost on an ephemeral host, and the API needs access controls/rate limiting before unrestricted public use with paid API credentials.

## Dataset and limitations

The dataset contains **83 synthetic PDFs** comprising internal company policies, operational documentation, and product catalogs. The documents were provided for an Ironhack educational exercise and do not represent a real company's confidential information.

Answers are based on retrieved documents, not live business systems. In particular, historical catalog information must **not** be presented as verified current stock or pricing. The assistant can make mistakes, so important information should be checked against the referenced documents.

## Author and attribution

**Diogo Fonseca** — AI Engineering Bootcamp, Ironhack

- [GitHub](https://github.com/fonsecadiogo)
- [LinkedIn](https://www.linkedin.com/in/diogo-fonseca-ai/)

Project concept and synthetic dataset: [Ironhack — Mini-Project: Enterprise AI Assistant](https://github.com/ironhack-rmt-AI-student-materials/project-brief-enterprise-ai-assistant).
