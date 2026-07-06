import os
import json
import logging
from datetime import datetime
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in .env file.")
    return genai.Client(api_key=api_key)

def predict_settlement(loan_balance: float, monthly_income: float, dti: float, status: str) -> dict:
    try:
        client = get_client()
        prompt = f"""
        Analyze the following loan and user financial profile for a debt settlement negotiation:
        - Loan Balance: ${loan_balance:.2f}
        - User's Monthly Income: ${monthly_income:.2f}
        - Debt-To-Income (DTI) Ratio: {dti:.2f}%
        - Delinquency Status: {status}
        
        Predict the target settlement terms. You must strictly output JSON matching this structure:
        {{
            "target_settlement_percentage": float,
            "estimated_savings": float,
            "negotiation_strategy": string,
            "success_likelihood": string
        }}
        
        Make the target settlement percentage lower if status is "90+ Days Late" (e.g. 35%-45%), moderate if "30 Days Late" (e.g. 50%-55%), and higher if "Current" (e.g. 70%-80%). The success_likelihood should be "High" for 90+ Days Late, "Medium" for 30 Days Late, and "Low" for Current.
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "target_settlement_percentage": types.Schema(type=types.Type.NUMBER),
                        "estimated_savings": types.Schema(type=types.Type.NUMBER),
                        "negotiation_strategy": types.Schema(type=types.Type.STRING),
                        "success_likelihood": types.Schema(type=types.Type.STRING),
                    },
                    required=["target_settlement_percentage", "estimated_savings", "negotiation_strategy", "success_likelihood"]
                )
            )
        )
        data = json.loads(response.text)
        return data
    except Exception as e:
        logger.warning(f"Gemini AI Service failed or not configured: {str(e)}. Using fallback deterministic mock engine.")
        # Fallback implementation:
        if status == "90+ Days Late":
            pct = 40.0
            likelihood = "High"
            strat = "With the debt being 90+ days delinquent, the creditor has likely written it off as a bad debt. They will be highly motivated to settle. Call their recovery department and make an initial offer of 30%, settling eventually at 40%. Emphasize your low DTI score and willingness to resolve the ledger immediately."
        elif status == "30 Days Late":
            pct = 55.0
            likelihood = "Medium"
            strat = "Since the debt is 30 days late, the creditor will be open to discussion but may try to get full payment. Explain your hardship clearly, request interest rate relief or a one-time settlement of 55%."
        else: # Current
            pct = 75.0
            likelihood = "Low"
            strat = "Because your account is current, the creditor has little incentive to negotiate a reduction. You must demonstrate a severe, impending hardship (like medical bills or job reduction) to get them to agree to a 75% settlement."
            
        savings = loan_balance * (1 - pct / 100.0)
        return {
            "target_settlement_percentage": pct,
            "estimated_savings": round(savings, 2),
            "negotiation_strategy": f"[MOCK ENGINE - Gemini Offline] {strat}",
            "success_likelihood": likelihood
        }

def generate_hardship_letter(user_details: dict, creditor_name: str, total_balance: float, hardship_reason: str, proposed_settlement_amount: float = None) -> str:
    try:
        client = get_client()
        prop_str = f" proposing a lump-sum settlement of ${proposed_settlement_amount:.2f}" if proposed_settlement_amount else ""
        prompt = f"""
        Draft a highly polished, professional, and legally sound debt hardship and settlement proposal letter.
        - User Info: Name/Email: {user_details.get('email')} (Monthly Income: ${user_details.get('monthly_income', 0):.2f})
        - Creditor Name: {creditor_name}
        - Total Balance: ${total_balance:.2f}
        - Hardship Reason: {hardship_reason}
        {prop_str}
        
        The letter should politely explain the hardship, request a balance reduction or a structured repayment plan, and provide a professional call-to-action. Do not include any placeholder bracket text like [Your Name] or [Date]; generate complete, realistic, and ready-to-send content. Put logical placeholder values or default fields that look fully completed.
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        logger.warning(f"Gemini AI Service failed or not configured: {str(e)}. Using fallback mock engine.")
        # Fallback hardship letter draft:
        amount_clause = f"a one-time settlement payment of ${proposed_settlement_amount:.2f} in exchange for full discharge of the debt" if proposed_settlement_amount else "a structured, lower monthly repayment plan that fits my reduced budget"
        return f"""Date: {datetime.utcnow().strftime('%B %d, %Y')}

To: Debt Recovery & Settlement Division
{creditor_name}

Re: Account Settlement Proposal
Account Balance: ${total_balance:,.2f}
Debtor Email Reference: {user_details.get('email')}

Dear Settlement Representative,

I am writing this letter to formally request a debt settlement or restructured repayment plan for the above-referenced account. I am currently experiencing severe financial hardship due to: {hardship_reason}. 

Because of these unforeseen circumstances, my monthly net income is now ${user_details.get('monthly_income', 0):,.2f}, which makes it impossible for me to meet the minimum monthly payment requirements while covering basic living necessities.

To resolve this liability and prevent bankruptcy, I would like to propose {amount_clause}. I believe this represents a fair-faith effort to pay what I can under my current financial limits.

Please review my request. You can contact me at {user_details.get('email')} to discuss this proposal or coordinate the agreement in writing. Thank you for your time and understanding.

Sincerely,

Aegis Debt AI Client
({user_details.get('email')})
"""
