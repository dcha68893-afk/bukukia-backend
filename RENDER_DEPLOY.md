# Deploying to Render (step-by-step)

## 1. Create a PostgreSQL database on Render

1. Go to https://dashboard.render.com → **New** → **PostgreSQL**
2. Give it a name (e.g. `pefa-church-db`), choose the free plan, click **Create Database**
3. Once provisioned, open the database → click **"Connect"** tab
4. Copy the **"External Database URL"** (starts with `postgres://…`)

## 2. Create a Web Service on Render

1. **New** → **Web Service**
2. Connect your GitHub repo (push the `backend/` folder as the repo root, or set the root directory)
3. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Node version**: 18+ (set in Environment or add a `.node-version` file)

## 3. Set environment variables on Render

Go to your Web Service → **Environment** → add these:

| Key | Value |
|---|---|
| `DATABASE_URL` | Paste the External Database URL from step 1 |
| `JWT_SECRET` | A long random string (use: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your frontend URL (e.g. `https://gwikongepefa.org`) |
| `SITE_NAME` | `Gwikonge PEFA Church` |
| `SITE_EMAIL` | `info@gwikongepefa.org` |
| `PORT` | Leave blank — Render sets this automatically |

Optional (for email notifications):
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | your Gmail App Password |
| `SMTP_FROM` | `no-reply@gwikongepefa.org` |

## 4. Seed the database

After the first deploy succeeds, go to your Web Service → **Shell** and run:
```
node src/utils/seed.js
```
This creates the first super admin: `admin@gwikongepefa.org` / `ChangeMe123!`  
**Change this password immediately after first login.**

## 5. Common errors

| Error | Fix |
|---|---|
| `ECONNREFUSED` | `DATABASE_URL` is missing or wrong — check step 1 & 3 |
| `Cannot find module 'cors'` | Run `npm install` locally first |
| `JWT_SECRET` warning | Set a real secret in environment variables (not the placeholder) |
| 502 Bad Gateway on Render | Service is waking from sleep (free tier); wait 30–60s |

## 6. Frontend deployment

The frontend is plain HTML/CSS/JS — deploy it to any static host:
- **Render Static Site**: New → Static Site → root = `frontend/` → publish dir = `.`
- **Netlify / Vercel / GitHub Pages**: drag-and-drop the `frontend/` folder
- **API URL**: `frontend/js/api.js` auto-detects production vs. localhost, so no edit
  is needed for the standard deployment (backend at
  `https://bukukia-backend.onrender.com`, frontend at
  `https://bukuria-frontend.onrender.com`). To point at a different backend, add this
  to a page's `<head>` before `api.js` loads:
  ```html
  <script>window.PEFA_API_BASE_URL = 'https://your-backend.onrender.com/api';</script>
  ```
- **Important**: whatever origin the frontend is actually deployed at, set the
  backend's `CLIENT_URL` environment variable to match it exactly, or the browser
  will block API requests with a CORS error.
