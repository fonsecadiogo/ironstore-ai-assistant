import os
from uuid import uuid4
from fastapi import FastAPI
from pydantic import BaseModel, Field
from src.multi_qa import answer_multi_with_sources, stream_multi_answer
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware

from src.feedback_db import (
    init_db,
    register_message,
    save_feedback,
)

import json


# API configuration
app = FastAPI(
    title="IronStore AI Assistant API",
    version="1.0.0",
    description="Enterprise AI assistant powered by RAG and ReAct agents."
)

# Configure allowed frontend origins
default_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173"
)

allowed_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        default_origins,
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Initialize feedback database
init_db()

# Document directory
DOCUMENTS_DIR = (
    Path(__file__).resolve().parent
    / "documents"
    / "extracted"
)

# Only allow existing IronStore PDF documents
PDF_FILES = {
    pdf.name: pdf
    for pdf in DOCUMENTS_DIR.rglob("*.pdf")
    if pdf.is_file() and not pdf.name.startswith("._")
}


# Request schema
class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=3000)


class FeedbackRequest(BaseModel):
    message_id: str
    rating: Literal["up", "down"]


# Health check
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "IronStore AI Assistant"
    }


# Chat endpoint

@app.post("/api/chat")
def chat(request: ChatRequest, http_request: Request):
    
    try:
        result = answer_multi_with_sources(request.question)
    except Exception:
     raise HTTPException(
        status_code=503,
        detail="AI service temporarily unavailable"
    )

    sources = []

    for source in result["sources"]:

        filename = source["filename"]
        page = source["page"]

        # Only expose known PDF documents
        if filename not in PDF_FILES:
            continue

        document_url = http_request.url_for(
            "get_document",
            filename=filename
        )

        sources.append({
            "filename": filename,
            "page": page,
            "url": f"{document_url}#page={page}"
        })

    
    # Register response for future feedback
    message_id = str(uuid4())
    register_message(message_id)

    return {
        "message_id": message_id,
        "answer": result["answer"],
        "sources": sources
    }




# PDF document access
@app.get("/api/documents/{filename}")
def get_document(filename: str):

    pdf_path = PDF_FILES.get(filename)

    if pdf_path is None:
        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename,
        content_disposition_type="inline"
    )


# ==================================================
# USER FEEDBACK
# ==================================================

@app.post("/api/feedback")
def submit_feedback(request: FeedbackRequest):
    """Save user feedback for an AI response."""

    saved = save_feedback(
        message_id=request.message_id,
        rating=request.rating
    )

    if not saved:
        raise HTTPException(
            status_code=404,
            detail="Message not found"
        )

    return {
        "status": "success",
        "message_id": request.message_id,
        "rating": request.rating
    }


# ==================================================
# STREAMING CHAT ENDPOINT
# ==================================================

@app.post("/api/chat/stream")
def chat_stream(request: ChatRequest, http_request: Request):
    """Stream AI responses as JSON Lines."""

    message_id = str(uuid4())

    def generate():
        # Send the response identifier
        yield json.dumps({
            "type": "start",
            "message_id": message_id
        }) + "\n"

        collected_sources = []

        try:
            # Stream the agent's answer
            for chunk in stream_multi_answer(
    request.question,
    collected_sources=collected_sources
):
                yield json.dumps({
                    "type": "token",
                    "content": chunk
                }, ensure_ascii=False) + "\n"


            # Build clickable document references
            sources = []
            seen = set()

            for source in collected_sources:
                filename = source["filename"]
                page = int(source["page"])

                if filename not in PDF_FILES or page < 1:
                    continue

                key = (filename, page)

                if key in seen:
                    continue

                seen.add(key)

                document_url = http_request.url_for(
                    "get_document",
                    filename=filename
                )

                sources.append({
                    "filename": filename,
                    "page": page,
                    "url": f"{document_url}#page={page}"
                })

            # Send document sources before completion
            yield json.dumps({
                "type": "sources",
                "sources": sources
            }, ensure_ascii=False) + "\n"


            # Register completed response for feedback
            register_message(message_id)

            yield json.dumps({
                "type": "done",
                "message_id": message_id
            }) + "\n"

        except Exception as error:
            print(f"Streaming error: {error}")

            yield json.dumps({
                "type": "error",
                "message": "Unable to complete the response."
            }) + "\n"

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
