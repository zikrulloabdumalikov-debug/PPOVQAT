/*
 * Ilova sozlamasi. API_URL — Supabase "api" Edge Function manzili.
 * forceFunctionRegion: funksiya baza bilan bir regionda (ap-southeast-2) ishlaydi — kamroq kechikish.
 * Bu yerda hech qanday maxfiy kalit yo'q: kirish Telegram initData imzosi bilan tekshiriladi.
 * Lokal ishlab chiqishda dev/server.js bu faylni o'zi almashtiradi.
 */
window.APP_CONFIG = {
  API_URL: 'https://ewxrdloawszmxyojlzdh.supabase.co/functions/v1/api?forceFunctionRegion=ap-southeast-2',
  DEV: false
};
