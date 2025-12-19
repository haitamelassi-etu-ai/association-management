const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const Store = require('electron-store');

// إعداد التخزين المحلي
const store = new Store();
let mainWindow;
let db;

// مسار قاعدة البيانات في مجلد البرنامج
const dbPath = path.join(app.getPath('userData'), 'personnel.db');

async function createDatabase() {
  console.log('📁 مسار قاعدة البيانات:', dbPath);
  
  const SQL = await initSqlJs();
  
  // Load existing database or create new
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // إنشاء جدول المستخدمين
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // إنشاء جدول الحضور
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // إنشاء جدول المستفيدين
  db.run(`
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      phone TEXT,
      address TEXT,
      status TEXT DEFAULT 'heberge',
      admission_date DATE,
      notes TEXT,
      photo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // إنشاء جدول الإعلانات
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT,
      priority TEXT DEFAULT 'normal',
      author_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `);

  // إضافة مستخدم افتراضي للاختبار
  const checkUser = db.exec('SELECT * FROM users WHERE username = "admin"');
  if (!checkUser[0] || checkUser[0].values.length === 0) {
    db.run(`
      INSERT INTO users (username, password, name, role, email)
      VALUES ('admin', 'admin123', 'المدير', 'admin', 'admin@personnel.app')
    `);
    
    console.log('✅ تم إنشاء حساب افتراضي: admin / admin123');
  }
  
  // حفظ قاعدة البيانات
  saveDatabase();
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, data);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    autoHideMenuBar: true,
    title: 'لوحة الموظفين - Personnel Panel'
  });

  // في التطوير، حمل من Vite server
  if (process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // في الإنتاج، حمل من الملفات المبنية
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// تهيئة التطبيق
app.whenReady().then(async () => {
  await createDatabase();
  createWindow();
  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (db) {
    saveDatabase();
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ======= IPC Handlers - API المحلي =======

function setupIPC() {
  // تسجيل الدخول
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      const result = db.exec(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`);
      
      if (result[0] && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        const user = {};
        columns.forEach((col, idx) => {
          if (col !== 'password') user[col] = values[idx];
        });
        return { success: true, user };
      }
      return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      return { success: false, message: error.message };
    }
  });

  // جلب بيانات الحضور
  ipcMain.handle('attendance:get', async (event, { userId, month, year }) => {
    try {
      let query = `SELECT * FROM attendance WHERE user_id = ${userId}`;
      
      if (month !== undefined && year !== undefined) {
        const monthStr = String(month + 1).padStart(2, '0');
        query += ` AND strftime('%m', date) = '${monthStr}' AND strftime('%Y', date) = '${year}'`;
      }
      
      query += ' ORDER BY date DESC, created_at DESC';
      const result = db.exec(query);
      
      const records = [];
      if (result[0]) {
        const columns = result[0].columns;
        result[0].values.forEach(row => {
          const record = {};
          columns.forEach((col, idx) => {
            record[col] = row[idx];
          });
          records.push(record);
        });
      }
      
      return { success: true, data: records };
    } catch (error) {
      console.error('❌ خطأ في جلب الحضور:', error);
      return { success: false, message: error.message };
    }
  });

  // تسجيل الحضور
  ipcMain.handle('attendance:checkIn', async (event, { userId }) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkInTime = new Date().toLocaleTimeString('en-GB');
      
      // التحقق إذا كان قد سجل اليوم
      const existing = db.exec(`SELECT * FROM attendance WHERE user_id = ${userId} AND date = '${today}'`);
      
      if (existing[0] && existing[0].values.length > 0) {
        return { success: false, message: 'لقد سجلت الحضور اليوم بالفعل' };
      }
      
      db.run(`
        INSERT INTO attendance (user_id, date, check_in, status)
        VALUES (${userId}, '${today}', '${checkInTime}', 'present')
      `);
      saveDatabase();
      
      return { success: true, data: { check_in: checkInTime } };
    } catch (error) {
      console.error('❌ خطأ في تسجيل الحضور:', error);
      return { success: false, message: error.message };
    }
  });

  // تسجيل المغادرة
  ipcMain.handle('attendance:checkOut', async (event, { userId }) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const checkOutTime = new Date().toLocaleTimeString('en-GB');
      
      db.run(`
        UPDATE attendance 
        SET check_out = '${checkOutTime}'
        WHERE user_id = ${userId} AND date = '${today}' AND check_out IS NULL
      `);
      saveDatabase();
      
      return { success: true, data: { check_out: checkOutTime } };
    } catch (error) {
      console.error('❌ خطأ في تسجيل المغادرة:', error);
      return { success: false, message: error.message };
    }
  });

  // جلب المستفيدين
  ipcMain.handle('beneficiaries:getAll', async () => {
    try {
      const result = db.exec('SELECT * FROM beneficiaries ORDER BY created_at DESC');
      
      const beneficiaries = [];
      if (result[0]) {
        const columns = result[0].columns;
        result[0].values.forEach(row => {
          const ben = {};
          columns.forEach((col, idx) => {
            ben[col] = row[idx];
          });
          beneficiaries.push(ben);
        });
      }
      
      return { success: true, data: beneficiaries };
    } catch (error) {
      console.error('❌ خطأ في جلب المستفيدين:', error);
      return { success: false, message: error.message };
    }
  });

  // إضافة مستفيد
  ipcMain.handle('beneficiaries:create', async (event, beneficiary) => {
    try {
      db.run(`
        INSERT INTO beneficiaries (code, name, age, gender, phone, address, status, admission_date, notes)
        VALUES ('${beneficiary.code}', '${beneficiary.name}', ${beneficiary.age || 'NULL'}, 
                '${beneficiary.gender}', '${beneficiary.phone || ''}', '${beneficiary.address || ''}', 
                '${beneficiary.status || 'heberge'}', '${beneficiary.admission_date}', '${beneficiary.notes || ''}')
      `);
      saveDatabase();
      
      return { success: true, data: beneficiary };
    } catch (error) {
      console.error('❌ خطأ في إضافة المستفيد:', error);
      return { success: false, message: error.message };
    }
  });

  // إحصائيات المستفيدين
  ipcMain.handle('beneficiaries:stats', async () => {
    try {
      const totalRes = db.exec('SELECT COUNT(*) as count FROM beneficiaries');
      const hebergeRes = db.exec("SELECT COUNT(*) as count FROM beneficiaries WHERE status = 'heberge'");
      const monthRes = db.exec(`
        SELECT COUNT(*) as count FROM beneficiaries 
        WHERE strftime('%Y-%m', admission_date) = strftime('%Y-%m', 'now')
      `);
      
      const total = totalRes[0] ? totalRes[0].values[0][0] : 0;
      const heberge = hebergeRes[0] ? hebergeRes[0].values[0][0] : 0;
      const thisMonth = monthRes[0] ? monthRes[0].values[0][0] : 0;
      
      return {
        success: true,
        data: {
          total,
          heberge,
          nouveauxCeMois: thisMonth,
          enSuivi: heberge
        }
      };
    } catch (error) {
      console.error('❌ خطأ في جلب الإحصائيات:', error);
      return { success: false, message: error.message };
    }
  });

  // جلب الإعلانات
  ipcMain.handle('announcements:getAll', async () => {
    try {
      const result = db.exec(`
        SELECT a.*, u.name as author_name 
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        ORDER BY created_at DESC
      `);
      
      const announcements = [];
      if (result[0]) {
        const columns = result[0].columns;
        result[0].values.forEach(row => {
          const ann = {};
          columns.forEach((col, idx) => {
            ann[col] = row[idx];
          });
          announcements.push(ann);
        });
      }
      
      return { success: true, data: announcements };
    } catch (error) {
      console.error('❌ خطأ في جلب الإعلانات:', error);
      return { success: false, message: error.message };
    }
  });

  console.log('✅ تم تفعيل IPC Handlers');
}

// معالجة الأخطاء
process.on('uncaughtException', (error) => {
  console.error('❌ خطأ غير متوقع:', error);
});
