import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

load_dotenv()

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small"
)

vector_store = PineconeVectorStore(
    index_name=os.environ["PINECONE_INDEX_NAME"],
    embedding=embeddings
)

question = "How should a customer support issue be escalated at IronStore?"

print(f"\nQUESTION: {question}\n")

results = vector_store.similarity_search(
    question,
    k=3
)

print(f"RESULTS FOUND: {len(results)}")

for i, doc in enumerate(results, start=1):
    print(f"\n--- RESULT {i} ---")
    print("SOURCE:", doc.metadata.get("source"))
    print("PAGE:", doc.metadata.get("page", 0) + 1)
    print("CONTENT:")
    print(doc.page_content[:700])
