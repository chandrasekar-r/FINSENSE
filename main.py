import os
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config.database import init_database
from src.config.redis import init_redis
from src.api import auth, users, transactions, budgets, categories, receipts, chat
from src.middleware.error_handler import add_error_handlers
from src.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting FinSense application...")
    await init_database()
    await init_redis()
    logger.info("FinSense application started successfully")
    yield
    # Shutdown
    logger.info("Shutting down FinSense application...")


app = FastAPI(
    title="FinSense API",
    description="AI-powered personal finance management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add error handlers
add_error_handlers(app)

# API routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["Budgets"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(receipts.router, prefix="/api/receipts", tags=["Receipts"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "OK", "timestamp": "2025-01-11T12:00:00Z"}

# Serve static files (React frontend)
if os.path.exists("frontend/dist"):
    # Mount assets directory at /assets path to match frontend expectations
    if os.path.exists("frontend/dist/assets"):
        app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    
    # Mount other static files at /static
    app.mount("/static", StaticFiles(directory="frontend/dist"), name="static")


# Frontend routes (specific patterns to avoid conflicting with API)
@app.get("/")
async def serve_index():
    """Serve the main index.html"""
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    raise HTTPException(status_code=404, detail="Frontend not found")


@app.get("/login")
@app.get("/register") 
@app.get("/dashboard")
@app.get("/transactions")
@app.get("/budgets")
@app.get("/categories")
@app.get("/scan")
@app.get("/chat")
@app.get("/settings")
async def serve_spa_routes():
    """Serve index.html for SPA routes"""
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    raise HTTPException(status_code=404, detail="Frontend not found")


@app.get("/vite.svg")
@app.get("/favicon.ico")
async def serve_root_assets(request: Request):
    """Serve root-level assets like vite.svg, favicon.ico"""
    file_name = request.url.path.lstrip('/')
    file_path = f"frontend/dist/{file_name}"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")


# Run the application with uvicorn when executed directly
if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 3000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)