import os
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

def get_llm() -> BaseChatModel:
    """
    Swap LLM ที่นี่ที่เดียว ไม่ต้องแก้ทั้ง codebase
    Set env: LLM_PROVIDER = openai | claude | ollama
    """

    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=0,
        api_key=os.getenv("LLM_API_KEY"),
    )

    raise ValueError(f"ERROR: Unknown")