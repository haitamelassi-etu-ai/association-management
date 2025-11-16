# خطوات نشر الموقع على الإنترنت 🌐

## الخطوة 1️⃣: إنشاء حساب GitHub
1. اذهب إلى: https://github.com/signup
2. سجل بإيميلك
3. تحقق من الإيميل

## الخطوة 2️⃣: إنشاء Repository
1. اضغط على "+" في الأعلى → "New repository"
2. اسم المشروع: `association-management`
3. اختر: Public
4. اضغط "Create repository"

## الخطوة 3️⃣: رفع الكود
في PowerShell نفذ:
```powershell
cd c:\Users\hp\ss
git remote add origin https://github.com/YOUR_USERNAME/association-management.git
git branch -M main
git push -u origin main
```
استبدل YOUR_USERNAME باسمك في GitHub

## الخطوة 4️⃣: نشر Frontend على Vercel (مجاني)
1. اذهب إلى: https://vercel.com/signup
2. سجل دخول بحساب GitHub
3. اضغط "Import Project"
4. اختر repository: `association-management`
5. Configure:
   - Framework Preset: Vite
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. اضغط "Deploy"

✅ بعد دقيقتين ستحصل على رابط مثل: `https://your-project.vercel.app`

## الخطوة 5️⃣: نشر Backend على Render (مجاني)
1. اذهب إلى: https://render.com/register
2. سجل دخول بحساب GitHub
3. اضغط "New +" → "Web Service"
4. اختر repository: `association-management`
5. Configure:
   - Name: `association-backend`
   - Root Directory: `backend`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. أضف Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://...  (من MongoDB Atlas)
   JWT_SECRET=your-secret-key-here
   NODE_ENV=production
   ```
7. اضغط "Create Web Service"

✅ ستحصل على رابط مثل: `https://association-backend.onrender.com`

## الخطوة 6️⃣: تحديث Frontend للإشارة إلى Backend
عدل `src/services/api.js`:
```javascript
const API_URL = import.meta.env.PROD 
  ? 'https://association-backend.onrender.com/api'
  : 'http://localhost:5000/api';
```

ثم:
```powershell
git add .
git commit -m "Update API URL for production"
git push
```

Vercel سينشر التحديث تلقائياً!

## 🎉 الموقع جاهز!
- **Frontend**: https://your-project.vercel.app
- **Backend**: https://association-backend.onrender.com

شارك الرابط مع الموظفين ليستخدموه! 📱💻

## 💡 ملاحظات مهمة:
- ✅ Vercel مجاني بدون حدود
- ✅ Render مجاني (750 ساعة/شهر)
- ✅ MongoDB Atlas مجاني (512 MB)
- ✅ كل تحديث يرفع تلقائياً
- ⚠️ Render ينام بعد 15 دقيقة بدون استخدام (يستيقظ في 30 ثانية)
