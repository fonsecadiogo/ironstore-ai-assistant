from src.multi_question import split_questions
from src.rag import (
    is_prompt_injection,
    BLOCKED_MESSAGE,
)

from src.ironstore_agent import stream_agent_answer, ask_agent 

# ==================================================
# 1. MULTI-QUESTION RAG WITH STREAMING
# ==================================================

def stream_multi_answer(
    user_request: str,
    collected_sources: list | None = None
):
    """
    Decompose user requests into independent questions.

    Retrieve relevant documents and generate an answer
    for each question using the existing secure RAG.
    """

    user_request = user_request.strip()

    if not user_request:
        yield "Please enter a question."
        return

    # Security check before question decomposition
    if is_prompt_injection(user_request):
        yield BLOCKED_MESSAGE
        return

    # Step 1: Decompose the request
    try:
        questions = split_questions(user_request)

    except ValueError as error:
        print(f"Question decomposition rejected: {error}")
        yield "Unable to process this request safely."
        return

    # Step 2: Handle a single question normally
    if len(questions) == 1:
        yield from stream_agent_answer(
    questions[0],
    collected_sources=collected_sources
)
        return

    # Step 3: Process each question independently
    for number, question in enumerate(questions, start=1):

        yield f"### {number}. {question}\n\n"

        # Each question gets its own Pinecone retrieval
        # and LLM response with streaming
        yield from stream_agent_answer(
    question,
    collected_sources=collected_sources
)

        yield "\n\n"


# ==================================================
# MULTI-QUESTION ANSWER WITH SOURCES
# ==================================================

def answer_multi_with_sources(user_request: str) -> dict:
    """Return answers and retrieved document references."""

    user_request = user_request.strip()

    if not user_request:
        return {"answer": "Please enter a question.", "sources": []}

    if is_prompt_injection(user_request):
        return {"answer": BLOCKED_MESSAGE, "sources": []}

    try:
        questions = split_questions(user_request)
    except ValueError:
        return {
            "answer": "Unable to process this request safely.",
            "sources": []
        }

    answers = []
    sources = []
    seen = set()

    for number, question in enumerate(questions, start=1):
        result = ask_agent(question)

        if len(questions) > 1:
            answers.append(
                f"### {number}. {question}\n\n{result['answer']}"
            )
        else:
            answers.append(str(result["answer"]))

        for source in result.get("sources", []):
            key = (source["filename"], source["page"])

            if key not in seen:
                seen.add(key)
                sources.append(source)

    return {
        "answer": "\n\n".join(answers),
        "sources": sources
    }


# ==================================================
# 2. LOCAL TEST
# ==================================================

if __name__ == "__main__":

    test_request = (
        "What is IronStore's remote work policy, "
        "how are employee expenses reimbursed, "
        "and what happens when a delivery is delayed?"
    )

    print("\n===== MULTI-QUESTION RAG TEST =====\n")

    # Print streamed chunks progressively
    for chunk in stream_multi_answer(test_request):
        print(chunk, end="", flush=True)

    print("\n\n===== TEST COMPLETED =====")
