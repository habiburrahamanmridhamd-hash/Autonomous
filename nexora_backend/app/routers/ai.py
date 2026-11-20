from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from ..core.config import settings

router = APIRouter(prefix="/ai", tags=["AI"])

class AiAssistReq(BaseModel):
    mode: str  # caption | hashtags | write | translate | recommend
    prompt: str
    target_language: str | None = "Spanish"

@router.post("/assist")
async def ai_assist(body: AiAssistReq):
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured on server")
    client = genai.Client(api_key=settings.gemini_api_key)
    instructions = {
        "caption": f"Write a compelling social media caption for: {body.prompt}",
        "hashtags": f"Generate 6 concise, relevant hashtags for: {body.prompt}",
        "write": f"Draft an engaging NEXORA post about: {body.prompt}",
        "translate": f"Translate accurately into {body.target_language}: {body.prompt}",
        "recommend": f"Suggest 4 creative content angles based on: {body.prompt}",
    }
    prompt_text = instructions.get(body.mode, body.prompt)
    resp = client.models.generate_content(model="gemini-4-hydrogen", contents=prompt_text)
    return {"result": resp.text}

@router.get("/search")
async def smart_search(q: str = ""):
    if not q.strip():
        return {"results": []}
    if not settings.gemini_api_key:
        return {"results": [q]}
    client = genai.Client(api_key=settings.gemini_api_key)
    resp = client.models.generate_content(
        model="gemini-4-hydrogen",
        contents=f"Provide 4 concise search topic refinements for query: {q}",
    )
    return {"results": [line.strip("-• ") for line in (resp.text or "").splitlines() if line.strip()][:4]}
