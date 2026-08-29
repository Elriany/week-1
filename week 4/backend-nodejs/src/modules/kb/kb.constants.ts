/** Seeded KB categories. Codes are stable; names are editable through the API. */
export const KB_CATEGORY_CATALOGUE = [
  { code: 'GETTING_STARTED', nameEn: 'Getting Started', nameAr: 'البداية', sortOrder: 0 },
  { code: 'ACCOUNT', nameEn: 'Account & Billing', nameAr: 'الحساب والفوترة', sortOrder: 1 },
  { code: 'TECHNICAL', nameEn: 'Technical Help', nameAr: 'المساعدة التقنية', sortOrder: 2 },
  { code: 'POLICIES', nameEn: 'Policies', nameAr: 'السياسات', sortOrder: 3 },
];

/** Max length of the generated excerpt returned by list endpoints. */
export const KB_EXCERPT_LENGTH = 200;
