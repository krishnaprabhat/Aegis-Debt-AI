from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine
from routes import router

# Bind database models on startup (creates SQLite tables if they do not exist)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Aegis Debt AI API",
    description="AI-Powered Debt Relief & Financial Recovery Platform Backend",
    version="1.0.0"
)

# CORS Configurations
origins = [
    "http://localhost:5173", # standard Vite React server
    "http://localhost:3000",
    "https://bright-pithivier-c4268b.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*\\.netlify\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register central router
app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Aegis Debt AI Backend API. Go to /docs for swagger specifications."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
