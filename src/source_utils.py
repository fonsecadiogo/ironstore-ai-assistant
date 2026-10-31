
import re

from langchain_core.messages import ToolMessage


# Match source references returned by retrieval tools
SOURCE_PATTERN = re.compile(
    r"^Source:\s*(.+?\.pdf),\s*page\s+(\d+)\s*$",
    re.MULTILINE
)


def extract_retrieved_sources(messages):
    """Extract document sources from agent tool responses."""

    sources = []
    seen = set()

    for message in messages:

        if not isinstance(message, ToolMessage):
            continue

        if not isinstance(message.content, str):
            continue

        matches = SOURCE_PATTERN.findall(message.content)

        for filename, page in matches:

            filename = filename.strip()
            page = int(page)

            source_key = (filename, page)

            if source_key in seen:
                continue

            seen.add(source_key)

            sources.append({
                "filename": filename,
                "page": page
            })

    return sources
