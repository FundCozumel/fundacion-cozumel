from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
import httpx
import os

bearer_scheme = HTTPBearer()

# Algoritmos aceptados: HS256 (secreto simétrico, proyectos antiguos)
# y ES256/RS256 (JWT Signing Keys asimétricas, proyectos nuevos).
ALLOWED_ALGORITHMS = ["HS256", "ES256", "RS256"]

# Caché en memoria del JWKS (claves públicas del proyecto Supabase).
_jwks_cache: dict | None = None


class TokenPayload(BaseModel):
    sub: str
    email: str | None = None
    role: str | None = None


def _jwks_url() -> str:
    """Construye la URL del JWKS leyendo el .env en tiempo de petición."""
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json" if base else ""


def _get_jwks(force: bool = False) -> dict:
    """Obtiene (y cachea) el JWKS público del proyecto Supabase."""
    global _jwks_cache
    if _jwks_cache is None or force:
        url = _jwks_url()
        if not url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SUPABASE_URL no está configurada en el backend (.env).",
            )
        resp = httpx.get(url, timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


def _find_signing_key(kid: str, force: bool = False) -> dict | None:
    for key in _get_jwks(force).get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> TokenPayload:
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")

        if alg == "HS256":
            key: object = os.getenv("SUPABASE_JWT_SECRET", "")
        else:
            # Token asimétrico: buscar la clave pública por kid (refrescando si rota).
            kid = header.get("kid")
            key = _find_signing_key(kid) or _find_signing_key(kid, force=True)
            if key is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No se encontró la clave pública del token (kid desconocido).",
                )

        payload = jwt.decode(
            token,
            key,
            algorithms=ALLOWED_ALGORITHMS,
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta sub",
            )
        return TokenPayload(
            sub=user_id,
            email=payload.get("email"),
            role=payload.get("role"),
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido o expirado: {exc}",
        ) from exc
