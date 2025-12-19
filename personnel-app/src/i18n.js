import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ar: {
    translation: {
      "dashboard": "لوحة التحكم",
      "attendance": "الحضور",
      "beneficiaries": "المستفيدين",
      "announcements": "الإعلانات",
      "reports": "التقارير",
      "logout": "تسجيل الخروج",
      "login": "تسجيل الدخول",
      "username": "اسم المستخدم",
      "password": "كلمة المرور",
      "checkIn": "تسجيل حضور",
      "checkOut": "تسجيل مغادرة",
      "total": "الإجمالي",
      "present": "حاضر",
      "absent": "غائب",
      "name": "الاسم",
      "code": "الكود",
      "status": "الحالة",
      "date": "التاريخ",
      "save": "حفظ",
      "cancel": "إلغاء",
      "add": "إضافة",
      "edit": "تعديل",
      "delete": "حذف"
    }
  },
  fr: {
    translation: {
      "dashboard": "Tableau de bord",
      "attendance": "Présence",
      "beneficiaries": "Bénéficiaires",
      "announcements": "Annonces",
      "reports": "Rapports",
      "logout": "Déconnexion",
      "login": "Connexion",
      "username": "Nom d'utilisateur",
      "password": "Mot de passe",
      "checkIn": "Pointer l'arrivée",
      "checkOut": "Pointer la sortie",
      "total": "Total",
      "present": "Présent",
      "absent": "Absent",
      "name": "Nom",
      "code": "Code",
      "status": "Statut",
      "date": "Date",
      "save": "Enregistrer",
      "cancel": "Annuler",
      "add": "Ajouter",
      "edit": "Modifier",
      "delete": "Supprimer"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
