from dotenv import load_dotenv
import os

load_dotenv()

# carregando variáveis do .env
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")