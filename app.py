import streamlit as st
from src.multi_qa import stream_multi_answer

st.set_page_config(
    page_title="IronStore AI Assistant",
    page_icon="🤖"
)

st.title("IronStore AI Assistant")
st.caption("Internal company knowledge assistant powered by RAG")


if "messages" not in st.session_state:
    st.session_state.messages = []


for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])


if question := st.chat_input("Ask a question about IronStore..."):

    st.session_state.messages.append({
        "role": "user",
        "content": question
    })

    with st.chat_message("user"):
        st.markdown(question)
   
    with st.chat_message("assistant"):
        try:
            answer = st.write_stream(
    stream_multi_answer(question)
)
        except Exception as error:
            print(f"RAG error: {error}")
            answer = "Unable to process your question. Please try again."
            st.error(answer)

    st.session_state.messages.append({
        "role": "assistant",
        "content": answer
    })
