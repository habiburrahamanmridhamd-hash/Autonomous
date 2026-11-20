import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .core.config import settings
from .routers import auth, social, ai

app = FastAPI(title="NEXORA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origins] if settings.cors_origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.media_root, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_root), name="media")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(social.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")

class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_personal(self, user_id: str, data: str):
        ws = self.active.get(user_id)
        if ws:
            await ws.send_text(data)

manager = ConnectionManager()

@app.get("/health")
async def health():
    return {"status": "ok", "service": "nexora-api"}

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: str):
    await manager.connect(user_id, ws)
    try:
        while True:
            payload = await ws.receive_text()
            await manager.send_personal(user_id, payload)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
