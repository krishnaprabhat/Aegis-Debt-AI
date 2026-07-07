from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Use DATABASE_URL env variable (PostgreSQL on Render) or fallback to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aegis_debt.db")

# Fix for Render PostgreSQL URL format (postgres:// -> postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create Engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# Local Session Maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base
Base = declarative_base()

# Dependency for DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
