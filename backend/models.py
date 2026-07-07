from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    monthly_income = Column(Float, default=0.0)
    currency = Column(String, default="USD")

    # Relationships
    loans = relationship("Loan", back_populates="user", cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    creditor_name = Column(String, nullable=False)
    total_balance = Column(Float, nullable=False)
    minimum_payment = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)
    status = Column(String, default="Current")  # Can be "Current", "30 Days Late", or "90+ Days Late"

    # Relationships
    user = relationship("User", back_populates="loans")
