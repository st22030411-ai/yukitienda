# TRUEQUE — Tienda de Segunda Mano con Pagos Reales

Tienda de segunda mano con pago real via **MercadoPago Checkout Pro**.  
Proyecto académico · Python + FastAPI · PWA · Deploy en Render.com

---

## ¿Qué hace esta app?

1. Muestra una tienda con productos de demo a **$10 MXN**
2. El usuario hace clic en "Comprar ahora" → ingresa nombre y correo
3. El backend crea una preferencia de pago en MercadoPago
4. El usuario es redirigido al checkout oficial de MercadoPago para pagar con tarjeta real
5. MercadoPago redirige de vuelta a `/result?status=success` (o `failure` / `pending`)

---

## Estructura del proyecto

```
trueque/
├── backend/
│   └── app/
│       └── main.py          ← FastAPI: 3 endpoints + sirve frontend
├── frontend/
│   ├── index.html           ← Tienda principal (PWA)
│   ├── result.html          ← Página de resultado post-pago
│   ├── manifest.json        ← Manifiesto PWA
│   ├── sw.js                ← Service Worker (cache-first)
│   ├── favicon.ico          ← Favicon (sin errores 404)
│   ├── assets/
│   │   ├── logo.png
│   │   ├── icon-192.png     ← Icono PWA
│   │   └── icon-512.png     ← Icono PWA splash
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── requirements.txt
├── render.yaml              ← Config de deploy para Render
├── .env.example             ← Plantilla de variables (copia a .env)
├── .gitignore
└── README.md
```

---

## Requisitos previos

- Python 3.11+
- Cuenta en [MercadoPago Developers](https://developers.mercadopago.com)
- Cuenta en [Render.com](https://render.com)
- Cuenta en [GitHub](https://github.com)

---

## Configuración local

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/TU_USUARIO/trueque.git
cd trueque
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Obtener credenciales de MercadoPago

1. Ve a [developers.mercadopago.com](https://developers.mercadopago.com)
2. Inicia sesión con tu cuenta de MercadoPago México
3. Ve a **Tus integraciones → Nueva aplicación**
4. Nombre: `trueque-demo`, selecciona **Checkout Pro**
5. En **Credenciales de producción** copia tu **Access Token** (empieza con `APP_USR-`)

> ⚠️ Las credenciales de **producción** cobran con tarjetas reales.  
> Las de **prueba** (`TEST-...`) usan tarjetas ficticias de sandbox.

### 3. Crear el archivo .env

```bash
cp .env.example .env
```

Edita `.env`:

```env
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_URL=http://localhost:8000
```

### 4. Correr el servidor localmente

```bash
uvicorn backend.app.main:app --reload --port 8000
```

Abre [http://localhost:8000](http://localhost:8000)

---

## Despliegue en Render

### Paso 1 — Subir a GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/trueque.git
git push -u origin main
```

> **Importante:** asegúrate de que `.env` esté en `.gitignore` (ya lo está).  
> Nunca subas tu token real a GitHub.

### Paso 2 — Crear el servicio en Render

1. Ve a [render.com](https://render.com) e inicia sesión
2. **New → Web Service**
3. Conecta tu repositorio GitHub (`trueque`)
4. Render detecta `render.yaml` automáticamente. Verifica:
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`

### Paso 3 — Variables de entorno en Render

Panel del servicio → **Environment → Add Environment Variable**:

| Variable | Valor |
|----------|-------|
| `MP_ACCESS_TOKEN` | Tu access token de producción (`APP_USR-...`) |
| `BASE_URL` | `https://TU-APP.onrender.com` ← la URL que Render te asigna |

> Primero despliega para obtener la URL, luego agrega `BASE_URL` y haz **Manual Deploy**.

### Paso 4 — Configurar Webhook en MercadoPago (opcional pero recomendado)

En el panel de tu app de MP → **Webhooks → URL de producción**:  
`https://TU-APP.onrender.com/api/webhook`

### Paso 5 — Listo 🚀

Cada `git push` a `main` redespliega automáticamente.

---

## Endpoints del API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (Render lo usa para saber que está vivo) |
| `POST` | `/api/create-payment` | Crea preferencia de pago en MercadoPago |
| `POST` | `/api/webhook` | Recibe notificaciones de MercadoPago |
| `GET` | `/result?status=...` | Página de resultado post-pago |
| `GET` | `/api/docs` | Swagger UI (documentación interactiva) |

---

## Flujo del pago

```
Usuario → "Comprar ahora"
    ↓
Modal: ingresa nombre + correo
    ↓
POST /api/create-payment  →  FastAPI  →  MercadoPago API
    ↓
Respuesta: { init_point }
    ↓
Redirección a init_point (página oficial de MercadoPago)
    ↓
Usuario ingresa su tarjeta Visa/Mastercard
    ↓
MercadoPago procesa el pago
    ↓
Redirección a /result?status=success (o failure / pending)
    ↓
MercadoPago envía POST a /api/webhook (confirmación en background)
```

---

## PWA — Instalar como app

Esta app es una **Progressive Web App**. En Chrome/Edge:
- Abre la URL en el navegador
- Aparece el banner "Instalar app" o usa el ícono ⊕ en la barra de direcciones
- Se instala como app nativa en tu dispositivo

---

## Notas importantes

- `init_point` → URL de producción (cobra tarjeta real)
- `sandbox_init_point` → URL de sandbox (para pruebas sin cobrar)
- Para cambiar entre producción y sandbox: cambia el `MP_ACCESS_TOKEN` en Render
- El Service Worker cachea los estáticos — si haces cambios, actualiza `CACHE_NAME` en `sw.js`

---

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Backend | Python 3.11 · FastAPI 0.111 · Uvicorn |
| Pagos | MercadoPago SDK Python v2 · Checkout Pro |
| Frontend | HTML · CSS · Vanilla JS |
| PWA | Web App Manifest · Service Worker |
| Deploy | Render.com |
| Config | python-dotenv |
