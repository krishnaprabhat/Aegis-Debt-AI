from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

# --- User Schemas ---

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    monthly_income: float = Field(default=0.0, ge=0.0, description="Monthly net income in dollars")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    monthly_income: float = Field(..., ge=0.0)

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    monthly_income: float

    class Config:
        from_attributes = True


# --- Token Schemas ---

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# --- Loan Schemas ---

class LoanBase(BaseModel):
    creditor_name: str
    total_balance: float = Field(..., ge=0.0)
    minimum_payment: float = Field(..., ge=0.0)
    interest_rate: float = Field(..., ge=0.0, le=100.0)
    status: str = Field(default="Current", description="Must be 'Current', '30 Days Late', or '90+ Days Late'")

class LoanCreate(LoanBase):
    pass

class LoanUpdate(BaseModel):
    creditor_name: Optional[str] = None
    total_balance: Optional[float] = Field(None, ge=0.0)
    minimum_payment: Optional[float] = Field(None, ge=0.0)
    interest_rate: Optional[float] = Field(None, ge=0.0, le=100.0)
    status: Optional[str] = Field(None, description="Must be 'Current', '30 Days Late', or '90+ Days Late'")

class LoanResponse(LoanBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# --- Analytics & AI Schemas ---

class FinancialHealthResponse(BaseModel):
    dti_ratio: float = Field(..., description="Debt-to-Income ratio in percentage")
    financial_health_score: int = Field(..., description="Financial health score out of 100")
    total_debt: float = Field(..., description="Total aggregate debt balance")
    monthly_debt_burden: float = Field(..., description="Total monthly minimum debt payments")
    status_counts: dict = Field(..., description="Counts of loans in each status category")

class SettlementPredictionResponse(BaseModel):
    target_settlement_percentage: float = Field(..., description="Predicted percentage of the debt to settle for")
    estimated_savings: float = Field(..., description="Calculated total dollars saved")
    negotiation_strategy: str = Field(..., description="AI negotiation playbook and strategic path")
    success_likelihood: str = Field(..., description="E.g., High, Medium, Low")

class LetterRequest(BaseModel):
    creditor_name: str
    total_balance: float
    hardship_reason: str
    proposed_settlement_amount: Optional[float] = None

class LetterResponse(BaseModel):
    letter_text: str
