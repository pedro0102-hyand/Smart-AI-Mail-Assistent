from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from app.services.google_auth_service import get_google_auth_flow

router = APIRouter()

@router.get("/auth/google")
def auth_google():
    flow = get_google_auth_flow()
    auth_url, _ = flow.authorization_url(prompt="consent")
    return RedirectResponse(auth_url)


@router.get("/auth/callback")
def auth_callback(code: str):
    flow = get_google_auth_flow()
    flow.fetch_token(code=code)

    credentials = flow.credentials

    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
    }