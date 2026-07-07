from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import database
import models
import schemas
import auth
import ai_service

router = APIRouter()

# --- Auth Routes ---

@router.post("/auth/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserRegister, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
    
    hashed_pwd = auth.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        monthly_income=user_in.monthly_income,
        currency=user_in.currency
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not db_user or not auth.verify_password(user_in.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/auth/me", response_model=schemas.UserResponse)
def update_profile(profile_in: schemas.UserProfileUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    current_user.monthly_income = profile_in.monthly_income
    if profile_in.currency is not None:
        current_user.currency = profile_in.currency
    db.commit()
    db.refresh(current_user)
    return current_user


# --- Loans Routes ---

@router.get("/loans", response_model=List[schemas.LoanResponse])
def read_loans(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    return db.query(models.Loan).filter(models.Loan.user_id == current_user.id).all()

@router.post("/loans", response_model=schemas.LoanResponse, status_code=status.HTTP_201_CREATED)
def create_loan(loan_in: schemas.LoanCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    # Validate status
    if loan_in.status not in ["Current", "30 Days Late", "90+ Days Late"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'Current', '30 Days Late', or '90+ Days Late'"
        )
    db_loan = models.Loan(
        user_id=current_user.id,
        creditor_name=loan_in.creditor_name,
        total_balance=loan_in.total_balance,
        minimum_payment=loan_in.minimum_payment,
        interest_rate=loan_in.interest_rate,
        status=loan_in.status
    )
    db.add(db_loan)
    db.commit()
    db.refresh(db_loan)
    return db_loan

@router.put("/loans/{loan_id}", response_model=schemas.LoanResponse)
def update_loan(loan_id: int, loan_in: schemas.LoanUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db_loan = db.query(models.Loan).filter(models.Loan.id == loan_id, models.Loan.user_id == current_user.id).first()
    if not db_loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found or unauthorized access"
        )
    
    update_data = loan_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] not in ["Current", "30 Days Late", "90+ Days Late"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'Current', '30 Days Late', or '90+ Days Late'"
        )
        
    for key, value in update_data.items():
        setattr(db_loan, key, value)
        
    db.commit()
    db.refresh(db_loan)
    return db_loan

@router.delete("/loans/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan(loan_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db_loan = db.query(models.Loan).filter(models.Loan.id == loan_id, models.Loan.user_id == current_user.id).first()
    if not db_loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found or unauthorized access"
        )
    db.delete(db_loan)
    db.commit()
    return None


# --- Analytics Routes ---

@router.get("/analytics/health", response_model=schemas.FinancialHealthResponse)
def get_health(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    loans = db.query(models.Loan).filter(models.Loan.user_id == current_user.id).all()
    
    total_debt = sum(l.total_balance for l in loans)
    monthly_debt_burden = sum(l.minimum_payment for l in loans)
    
    # Calculate DTI
    if current_user.monthly_income > 0:
        dti_ratio = (monthly_debt_burden / current_user.monthly_income) * 100
    else:
        dti_ratio = 100.0 if monthly_debt_burden > 0 else 0.0
        
    # Categorize status counts
    status_counts = {"Current": 0, "30 Days Late": 0, "90+ Days Late": 0}
    for l in loans:
        if l.status in status_counts:
            status_counts[l.status] += 1
        else:
            status_counts["Current"] += 1 # Default fallback
            
    # Calculate score (out of 100)
    # Factor 1: DTI Penalty (max 40 pts penalty)
    if dti_ratio <= 20:
        dti_penalty = 0
    elif dti_ratio <= 50:
        dti_penalty = (dti_ratio - 20) * 1.0  # Up to 30 pts
    else:
        dti_penalty = 30 + min((dti_ratio - 50) * 0.5, 10.0)  # Caps at 40 pts
        
    # Factor 2: Delinquency Penalty (max 40 pts penalty)
    delinquency_penalty = (status_counts["30 Days Late"] * 15) + (status_counts["90+ Days Late"] * 30)
    delinquency_penalty = min(delinquency_penalty, 40)
    
    # Factor 3: Interest Penalty (max 20 pts penalty)
    if total_debt > 0:
        avg_interest = sum(l.interest_rate * l.total_balance for l in loans) / total_debt
    else:
        avg_interest = sum(l.interest_rate for l in loans) / len(loans) if loans else 0.0
        
    if avg_interest <= 8.0:
        interest_penalty = 0
    else:
        interest_penalty = min((avg_interest - 8.0) * 1.0, 20.0) # 1 pt penalty per 1% above 8%, max 20
        
    raw_score = 100 - (dti_penalty + delinquency_penalty + interest_penalty)
    financial_health_score = max(int(raw_score), 0)
    
    return {
        "dti_ratio": round(dti_ratio, 2),
        "financial_health_score": financial_health_score,
        "total_debt": round(total_debt, 2),
        "monthly_debt_burden": round(monthly_debt_burden, 2),
        "status_counts": status_counts
    }


# --- AI Routes ---

@router.get("/ai/predict-settlement/{loan_id}", response_model=schemas.SettlementPredictionResponse)
def get_ai_prediction(loan_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    db_loan = db.query(models.Loan).filter(models.Loan.id == loan_id, models.Loan.user_id == current_user.id).first()
    if not db_loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found or unauthorized access"
        )
        
    # Get current health metrics to pass as context
    loans = db.query(models.Loan).filter(models.Loan.user_id == current_user.id).all()
    monthly_debt_burden = sum(l.minimum_payment for l in loans)
    if current_user.monthly_income > 0:
        dti = (monthly_debt_burden / current_user.monthly_income) * 100
    else:
        dti = 100.0 if monthly_debt_burden > 0 else 0.0
        
    prediction = ai_service.predict_settlement(
        loan_balance=db_loan.total_balance,
        monthly_income=current_user.monthly_income,
        dti=dti,
        status=db_loan.status
    )
    return prediction

@router.post("/ai/generate-letter", response_model=schemas.LetterResponse)
def get_ai_letter(req: schemas.LetterRequest, current_user: models.User = Depends(auth.get_current_user)):
    user_details = {
        "email": current_user.email,
        "monthly_income": current_user.monthly_income
    }
    letter_text = ai_service.generate_hardship_letter(
        user_details=user_details,
        creditor_name=req.creditor_name,
        total_balance=req.total_balance,
        hardship_reason=req.hardship_reason,
        proposed_settlement_amount=req.proposed_settlement_amount
    )
    return {"letter_text": letter_text}
