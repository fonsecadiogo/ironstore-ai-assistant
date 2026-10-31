from langchain_core.tools import tool

from src.rag import (
    vector_store,
    retrieve_safe_documents,
    filter_unsafe_documents,
    build_context,
    is_prompt_injection,
    asks_for_live_data,
    LIVE_DATA_WARNING,
    BLOCKED_MESSAGE,
)


# ==================================================
# 1. COMPANY DOCUMENT SEARCH TOOL
# ==================================================

@tool
def search_company_documents(query: str) -> str:
    """Search IronStore company policies and procedures.

    Use for HR, Finance, IT, Deliveries, Sales,
    Customer Support, Legal and internal operations.
    """

    if is_prompt_injection(query):
        return BLOCKED_MESSAGE

    if asks_for_live_data(query):
        return LIVE_DATA_WARNING

    docs = retrieve_safe_documents(query, k=4)

    if not docs:
        return "No relevant safe documents found."

    return build_context(docs)


# ==================================================
# 2. PRODUCT CATALOG SEARCH TOOL
# ==================================================

@tool
def search_product_catalog(query: str) -> str:
    """Search IronStore product catalogs.

    Use for product descriptions, specifications,
    categories and historical catalog information.
    Do not treat catalog prices as live prices.
    """

    if is_prompt_injection(query):
        return BLOCKED_MESSAGE

    if asks_for_live_data(query):
        return LIVE_DATA_WARNING

    # Search only product catalog vectors
    candidates = vector_store.similarity_search(
        query,
        k=8,
        filter={"department": "product_catalog"}
    )

    docs = filter_unsafe_documents(candidates)[:4]

    if not docs:
        return "No relevant safe catalog documents found."

    return (
        "NOTICE: Catalogs are static documents. "
        "Prices and stock may be outdated.\n\n"
        + build_context(docs)
    )
