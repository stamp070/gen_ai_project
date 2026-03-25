import os
from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def get_llm() -> BaseChatModel:
    """
    Swap LLM ที่นี่ที่เดียว ไม่ต้องแก้ทั้ง codebase
    Set env: LLM_PROVIDER = openai | claude | ollama
    """

    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        temperature=0,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

    raise ValueError(f"ERROR: Unknown")