# Pluga Bet - A Voting Website with Database

פרויקט אינטרקטיבי שמעביר הערות למסד נתונים ושומר סטטיסטיקות.

## 🚀 התקנה והגדרה

### 1️⃣ **הגדר את Supabase**

1. היכנס ל-[supabase.com](https://supabase.com)
2. יצור פרויקט חדש
3. בחר את ה-region הקרוב אליך
4. או בעמוד הפרויקט, הולך ל-**SQL Editor** ומריץ את ה-SQL הבא:

```sql
CREATE TABLE responses (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  answer TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

5. עכשיו הולך ל-**Settings > API** וקבל את:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (Anon Key)

### 2️⃣ **Vercel Deployment**

#### **עם GitHub (מומלץ):**

1. דחוף את הפרויקט לGitHub
2. היכנס ל-[vercel.com](https://vercel.com)
3. בחר **Import Project** וחבר את ה-GitHub repo
4. ב-**Environment Variables**, הוסף:
   - `SUPABASE_URL`: הערך מ-Supabase
   - `SUPABASE_KEY`: ה-Anon Key
5. **Deploy!** ✨

#### **בעזרת CLI:**

```bash
# התקן Vercel CLI
npm install -g vercel

# דחוף לVercel
vercel
```

### 3️⃣ **Local Development**

```bash
# התקן dependencies
npm install

# עדכן את .env.local עם הערכים של Supabase שלך
# Edit .env.local

# הרץ את הserver
npm run dev
```

ואז תקבל קישור ל-`http://localhost:3000`

---

## 📚 טכנולוגיה

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel

---

## 📋 מבנה הפרויקט

```
pluga-bet/
├── index.html           # Frontend HTML
├── style.css            # Styles
├── script.js            # Frontend JavaScript
├── api/
│   ├── handler.js       # Express server
│   └── db.js            # Supabase integration
├── package.json         # Dependencies
├── .env.local          # Environment variables (local)
└── .gitignore          # Git ignore
```

---

## 🔒 אבטחה

- ✅ API Key מאוחסן בטוח בـ Vercel Environment Variables
- ✅ Database queries מתבצעות רק בـ Backend
- ✅ Frontend לא יש גישה ישירה לDatabase

---

## 🎯 API Endpoints

### `POST /api/answer`
שומר תשובה חדשה

```json
{
  "answer": "yes" // או "no"
}
```

### `GET /api/stats`
חוזר סטטיסטיקות

```json
{
  "total": 123,
  "yes": 45,
  "no": 78
}
```

---

## 📝 License

ISC
