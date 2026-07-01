from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import httpx
import json
from logger import logger

router = APIRouter()

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:1b"  # User preferred chatbot model

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    lang: str = "en"

@router.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        # Convert messages to the format expected by Ollama
        ollama_messages = [
            {"role": "assistant" if msg.role == "ai" else msg.role, "content": msg.text} 
            for msg in request.messages
        ]
        
        system_prompt = "You are a helpful assistant for the WelfareIntel app. You help users with information about government schemes and scholarships in Tamil Nadu. Be concise and polite."
        if request.lang == "ta":
            system_prompt = "நீங்கள் WelfareIntel செயலியின் உதவியாளர். தமிழ்நாடு அரசின் திட்டங்கள் மற்றும் உதவித்தொகைகள் பற்றிய தகவல்களை வழங்குகிறீர்கள். சுருக்கமாகவும் கனிவாகவும் பதிலளிக்கவும். தமிழில் மட்டுமே பதிலளிக்கவும்."
            
        ollama_messages.insert(0, {"role": "system", "content": system_prompt})

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": ollama_messages,
                    "stream": False,
                    "options": {"temperature": 0.5, "num_predict": 512},
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Ollama error: {response.text}")
                raise HTTPException(status_code=500, detail="Error communicating with AI model")
                
            result = response.json()
            return {"reply": result.get("message", {}).get("content", "")}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
