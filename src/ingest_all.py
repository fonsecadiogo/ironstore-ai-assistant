
import os
import hashlib
from pathlib import Path

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

DOCS_DIR = ROOT / "documents" / "extracted"


ALREADY_INDEXED = {
    "IronStore_Customer_Support_Escalation_Procedures.pdf",
    "IronStore_Customer_Support_Knowledge_Base_Style_Guide.pdf",
}


pdf_files = sorted(
    p for p in DOCS_DIR.rglob("*.pdf")
    if not p.name.startswith("._")
)

pending_files = [
    p for p in pdf_files
    if p.name not in ALREADY_INDEXED
]

print(f"Total PDFs: {len(pdf_files)}")
print(f"Already indexed: {len(pdf_files) - len(pending_files)}")
print(f"PDFs to process: {len(pending_files)}")


splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150
)


embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small"
)


vector_store = PineconeVectorStore(
    index_name=os.environ["PINECONE_INDEX_NAME"],
    embedding=embeddings
)

total_chunks = 0
successful_files = 0
failed_files = []


for number, pdf in enumerate(pending_files, start=1):

    print(f"\n[{number}/{len(pending_files)}] {pdf.name}")

    try:
        pages = PyPDFLoader(str(pdf)).load()

        for page in pages:
            page.metadata["source"] = pdf.name
            page.metadata["relative_path"] = str(
                pdf.relative_to(DOCS_DIR)
            )
            page.metadata["department"] = pdf.parent.name

        chunks = splitter.split_documents(pages)
        chunks = [
            chunk for chunk in chunks
            if chunk.page_content.strip()
        ]

        if not chunks:
            raise ValueError("No text extracted")

       
        ids = []

        for i, chunk in enumerate(chunks):
            key = f"{pdf.relative_to(DOCS_DIR)}:{i}"
            ids.append(
                hashlib.sha256(key.encode()).hexdigest()
            )

      
        batch_size = 50

        for start in range(0, len(chunks), batch_size):
            end = start + batch_size

            vector_store.add_documents(
                chunks[start:end],
                ids=ids[start:end]
            )

        total_chunks += len(chunks)
        successful_files += 1

        print(f"SUCCESS: {len(chunks)} chunks uploaded")

    except Exception as error:
        failed_files.append(pdf.name)
        print(f"ERROR: {error}")


print("\n========== INGESTION REPORT ==========")
print(f"Previously indexed PDFs: {len(pdf_files) - len(pending_files)}")
print(f"New PDFs processed: {successful_files}")
print(f"New chunks uploaded: {total_chunks}")
print(f"Failed PDFs: {len(failed_files)}")

if failed_files:
    print("\nFiles requiring attention:")
    for name in failed_files:
        print(f"- {name}")
else:
    print("\nSUCCESS: All 83 PDFs processed!")
