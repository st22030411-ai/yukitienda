# backend/app/main.py
# ─────────────────────────────────────────────────────────────
# TRUEQUE — Servidor de pagos con MercadoPago
# FastAPI + MercadoPago Checkout Pro
# ─────────────────────────────────────────────────────────────

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import mercadopago

load_dotenv()

# ── Configuración ─────────────────────────────
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN")   # Token de MercadoPago
BASE_URL        = os.getenv("BASE_URL", "http://localhost:8000")  # URL pública del servidor

if not MP_ACCESS_TOKEN:
    raise RuntimeError("Falta la variable de entorno MP_ACCESS_TOKEN")

sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# ── App ───────────────────────────────────────
app = FastAPI(
    title="TRUEQUE Pagos",
    docs_url="/api/docs",
    redoc_url=None,
)

# CORS — en producción solo permite el mismo origen
_cors_origins = ["http://localhost:8000", "http://localhost:3000"]
if BASE_URL and BASE_URL.startswith("http"):
    _cors_origins.append(BASE_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# MODELOS
# ─────────────────────────────────────────────

class CreatePaymentRequest(BaseModel):
    buyer_email: str       # correo del comprador (requerido por MP)
    buyer_name: str        # nombre del comprador


class PaymentResponse(BaseModel):
    init_point: str        # URL donde MP procesa el pago (producción)
    sandbox_init_point: str  # URL de sandbox para pruebas


# ─────────────────────────────────────────────
# ENDPOINTS DE PAGO
# ─────────────────────────────────────────────

@app.post("/api/create-payment", response_model=PaymentResponse)
async def create_payment(body: CreatePaymentRequest):
    """
    Crea una preferencia de pago en MercadoPago para el
    producto de demostración ($10 MXN).

    El frontend llama a este endpoint, recibe init_point
    y redirige al usuario a la página de pago de MP.
    """
    preference_data = {
        "items": [
            {
                "id": "producto-demo-001",
                "title": "Tenis Nike Air Max 90 — TRUEQUE Demo",
                "description": "Producto de demostración académica",
                "quantity": 1,
                "unit_price": 10.00,     # $10 MXN
                "currency_id": "MXN",
            }
        ],
        "payer": {
            "name": body.buyer_name,
            "email": body.buyer_email,
        },
        "back_urls": {
            "success": f"{BASE_URL}/result?status=success",
            "failure": f"{BASE_URL}/result?status=failure",
            "pending": f"{BASE_URL}/result?status=pending",
        },
        "auto_return": "approved",     # redirige automáticamente al éxito
        "statement_descriptor": "TRUEQUE DEMO",  # aparece en el estado de cuenta
        "external_reference": "demo-academico-001",
        "payment_methods": {
            # Solo aceptar tarjeta (visa, mastercard, amex, etc.)
            "excluded_payment_types": [
                {"id": "ticket"},       # excluir OXXO
                {"id": "atm"},          # excluir cajero
                {"id": "bank_transfer"},
            ],
            "installments": 1,          # sin meses sin intereses (demo)
        },
    }

    result = sdk.preference().create(preference_data)
    response = result.get("response", {})

    if result.get("status") != 201:
        # Loguear el error completo para depurar
        print(f"[MP ERROR] {result}")
        raise HTTPException(
            status_code=502,
            detail=f"MercadoPago rechazó la preferencia: {response.get('message', 'Error desconocido')}",
        )

    return PaymentResponse(
        init_point=response["init_point"],
        sandbox_init_point=response["sandbox_init_point"],
    )


@app.post("/api/webhook")
async def mercadopago_webhook(request_body: dict):
    """
    MercadoPago notifica aquí cuando el pago cambia de estado.
    En producción harías: marcar la orden como pagada en tu DB.
    Por ahora solo lo imprimimos para observar.
    """
    print(f"[WEBHOOK] Notificación recibida: {request_body}")
    return {"status": "ok"}


@app.get("/api/health")
async def health():
    """Verificar que el servidor está vivo (Render lo usa)."""
    return {"status": "ok", "service": "TRUEQUE Pagos"}


# ─────────────────────────────────────────────
# SERVIR EL FRONTEND (estático)
# Render sirve todo desde el mismo servidor
# ─────────────────────────────────────────────

# Ruta de resultado de pago (success / failure / pending)
@app.get("/result")
async def payment_result():
    return FileResponse("frontend/result.html")

# Favicon — evita 404 en browsers y PWA
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("frontend/favicon.ico")

# Servir archivos estáticos del frontend
# app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
