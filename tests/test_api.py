import json

from fastapi.testclient import TestClient
import api as api_module


client = TestClient(api_module.app)


# 1. Health endpoint
def test_health():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# 2. Reject empty questions
def test_empty_question():
    response = client.post(
        "/api/chat",
        json={"question": ""}
    )

    assert response.status_code == 422


# 3. Chat response and document sources
def test_chat_with_sources(monkeypatch):
    def fake_answer(question):
        return {
            "answer": "Test response.",
            "sources": [
                {
                    "filename": "IronStore_Remote_Work_Policy.pdf",
                    "page": 2
                }
            ]
        }

    monkeypatch.setattr(
        api_module,
        "answer_multi_with_sources",
        fake_answer
    )

    monkeypatch.setattr(
        api_module,
        "register_message",
        lambda message_id: None
    )

    response = client.post(
        "/api/chat",
        json={"question": "Remote work policy?"}
    )

    data = response.json()

    assert response.status_code == 200
    assert data["answer"] == "Test response."
    assert data["message_id"]
    assert len(data["sources"]) == 1
    assert data["sources"][0]["url"].endswith(
        "IronStore_Remote_Work_Policy.pdf#page=2"
    )


# 4. Streaming event protocol
def test_streaming_events(monkeypatch):
    def fake_stream(question, collected_sources=None):
        yield "Hello"
        collected_sources.append({
            "filename": "IronStore_Remote_Work_Policy.pdf",
            "page": 1
        })
        yield " world"

    monkeypatch.setattr(
        api_module,
        "stream_multi_answer",
        fake_stream
    )

    monkeypatch.setattr(
        api_module,
        "register_message",
        lambda message_id: None
    )

    response = client.post(
        "/api/chat/stream",
        json={"question": "Test streaming"}
    )

    events = [
        json.loads(line)
        for line in response.text.splitlines()
        if line.strip()
    ]

    types = [event["type"] for event in events]

    assert response.status_code == 200
    assert types == [
        "start", "token", "token", "sources", "done"
    ]

    assert events[0]["message_id"] == events[-1]["message_id"]
    assert events[3]["sources"][0]["page"] == 1


# 5. Invalid feedback rating
def test_invalid_feedback():
    response = client.post(
        "/api/feedback",
        json={
            "message_id": "test-id",
            "rating": "excellent"
        }
    )

    assert response.status_code == 422


# 6. Unknown feedback message
def test_unknown_feedback(monkeypatch):
    monkeypatch.setattr(
        api_module,
        "save_feedback",
        lambda message_id, rating: False
    )

    response = client.post(
        "/api/feedback",
        json={
            "message_id": "unknown-id",
            "rating": "up"
        }
    )

    assert response.status_code == 404


# 7. Unknown PDF
def test_unknown_document():
    response = client.get(
        "/api/documents/nonexistent.pdf"
    )

    assert response.status_code == 404


# 8. External AI service failure
def test_chat_service_failure(monkeypatch):
    def fake_failure(question):
        raise RuntimeError("PRIVATE_INTERNAL_ERROR")

    monkeypatch.setattr(
        api_module,
        "answer_multi_with_sources",
        fake_failure
    )

    response = client.post(
        "/api/chat",
        json={"question": "Test failure"}
    )

    assert response.status_code == 503
    assert "PRIVATE_INTERNAL_ERROR" not in response.text


# 9. Streaming failure handling
def test_streaming_service_failure(monkeypatch):
    def fake_stream(question, collected_sources=None):
        raise RuntimeError("PRIVATE_INTERNAL_ERROR")
        yield "never"

    monkeypatch.setattr(
        api_module,
        "stream_multi_answer",
        fake_stream
    )

    response = client.post(
        "/api/chat/stream",
        json={"question": "Test failure"}
    )

    events = [
        json.loads(line)
        for line in response.text.splitlines()
        if line.strip()
    ]

    assert response.status_code == 200
    assert [event["type"] for event in events] == [
        "start", "error"
    ]
    assert "PRIVATE_INTERNAL_ERROR" not in response.text
