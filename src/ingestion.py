import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

load_dotenv()

DOCUMENTS_DIR = Path("documents/extracted")
INDEX_NAME = os.environ["PINECONE_INDEX_NAME"]

pdf_files = sorted(
    p for p in DOCUMENTS_DIR.rglob("*.pdf")
    if not p.name.startswith("._")
)[:2]

if len(pdf_files) < 2:
    raise RuntimeError("Not enough valid PDF files found.")

documents = []

for pdf in pdf_files:
    print(f"Loading: {pdf.name}")

    loader = PyPDFLoader(str(pdf))
    pages = loader.load()

    for page in pages:
        page.metadata["source"] = pdf.name

    documents.extend(pages)

print(f"Pages loaded: {len(documents)}")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150
)

chunks = splitter.split_documents(documents)
chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

print(f"Chunks created: {len(chunks)}")

if not chunks:
    raise RuntimeError("No text chunks were created.")

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small"
)

vector_store = PineconeVectorStore(
    index_name=INDEX_NAME,
    embedding=embeddings
)

vector_store.add_documents(chunks)

print("SUCCESS: Documents stored in Pinecone!")
