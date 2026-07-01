from supabase import create_client, Client
import os

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_admin_client() -> Client:
    """Cliente con service role — omite RLS. Usar solo para operaciones admin internas."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_user_client(user_jwt: str) -> Client:
    """
    Cliente con el JWT del usuario autenticado.
    Las consultas a PostgREST llevan el token → RLS aplica automáticamente.
    """
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    client.postgrest.auth(user_jwt)
    return client
