import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

index_name = os.environ["PINECONE_INDEX_NAME"]

if not pc.has_index(index_name):
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )
    print("Index created successfully!")
else:
    print("Index already exists.")

index = pc.describe_index(index_name)

print("Index:", index.name)
print("Dimensions:", index.dimension)
print("Metric:", index.metric)
print("Ready:", index.status.ready)

if index.dimension != 1536 or index.metric != "cosine":
    raise ValueError("Index configuration does not match!")
