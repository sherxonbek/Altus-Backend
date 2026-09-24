# C2C Backend API (Express + TypeScript + MongoDB)

Ushbu backend xizmati foydalanuvchilarni telefon raqam orqali ro'yxatdan o'tkazish, 5 xonali SMS kodni tekshirish va JWT token bilan ta'minlash uchun yaratilgan.

---

## 🚀 Ishga tushirish usullari

### 1. Docker orqali ishga tushirish (Tavsiya etiladi)

Docker va Docker Compose orqali server va MongoDB bazasi birgalikda ishga tushadi:

```bash
docker compose up --build
```

Yoki orqa fonda (detached) yurgizish:
```bash
docker compose up -d
```

To'xtatish:
```bash
docker compose down
```

---

### 2. Lokal (Node.js) orqali ishga tushirish

1. Kutubxonalarni o'rnatish:
   ```bash
   npm install
   ```

2. `.env` faylini sozlash (agar mavjud bo'lmasa `.env.example` dan nusxa oling).

3. Dasturchi rejimida yurgizish (Hot-reload):
   ```bash
   npm run dev
   ```

4. Production uchun qurish va ishga tushirish:
   ```bash
   npm run build
   npm start
   ```

---

## 📡 API Endpointlar

Barcha so'rovlar prefiksi: `/api/auth`

| Metod | Endpoint | Tavsif | Request Body |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-otp` | 1-bosqich: SMS kod yuborish | `{ "phone": "901234567" }` |
| `POST` | `/api/auth/verify-otp` | 2-bosqich: Kodni tekshirish | `{ "phone": "901234567", "code": "12345" }` |
| `POST` | `/api/auth/register` | 3-bosqich: Ro'yxatdan o'tish | `{ "phone": "901234567", "fullName": "Aliyev Vali", "password": "Password1" }` |
| `GET` | `/api/auth/me` | JWT orqali profilni olish | Header: `Authorization: Bearer <token>` |
| `GET` | `/api/health` | Server holatini tekshirish | - |

---

## 🔐 Xavfsizlik va Arxitektura
- **Parollar**: `bcryptjs` orqali xavfsiz tuz bilan hashlangan holda saqlanadi.
- **JWT Token**: Ro'yxatdan o'tgach foydalanuvchiga 7 kunlik yaroqli token qaytariladi.
- **Validatsiya**: Kiruvchi barcha so'rovlar `zod` orqali tekshiriladi.
- **OTP**: MongoDB TTL indeksi orqali 5 daqiqadan so'ng avtomatik o'chiriladi.
