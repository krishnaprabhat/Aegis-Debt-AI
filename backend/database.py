from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = "sqlite:///./aegis_debt.db"

# Create Engine
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

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
