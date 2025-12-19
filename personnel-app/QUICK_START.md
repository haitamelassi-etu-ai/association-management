# ⚠️ خطوات التشغيل السريع

## 1. افتح Terminalين منفصلين

### Terminal 1 - Vite Development Server:
```powershell
cd c:\Users\hp\ss\personnel-app
npm run dev
```
انتظر حتى تظهر رسالة: `VITE v5.x.x ready in...`

### Terminal 2 - Electron App:
```powershell
cd c:\Users\hp\ss\personnel-app
npm run electron:dev
```

سينطلق التطبيق تلقائياً!

---

## 2. استخدم البيانات الافتراضية:
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin123`

---

## 3. للبناء النهائي (.exe):
```powershell
npm run build
npm run package
```

الملف سيكون في: `dist-electron/`

---

✅ **التطبيق الآن جاهز ويعمل بشكل مستقل مع تخزين محلي كامل!**
