
const STORAGE_KEY = 'monica_customers';
const SETTINGS_KEY = 'monica_settings';
const AUTH_KEY = 'me_auth';

const DEFAULT_SETTINGS = {
  creditLimit: 50000,
  appName: 'Monica Energy',
  companyTag: 'Customer Management Service',
  fuelPrices: {
    'Octane 92': 2790,
    'Octane 95': 3015,
    'Diesel': 2440,
    'Premium Diesel': 2520
  }
};

function fmt(n){ return Number(n || 0).toLocaleString(); }

function readSettings(){
  try{
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return {
      ...DEFAULT_SETTINGS,
      ...(raw || {}),
      fuelPrices: { ...DEFAULT_SETTINGS.fuelPrices, ...((raw && raw.fuelPrices) || {}) }
    };
  }catch(e){
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function sumAmount(items){
  return (items || []).reduce((s, x) => s + Number(x.amount || 0), 0);
}

function ensureHistoryDate(value){
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function ensureCustomerShape(c){
  const salesHistory = Array.isArray(c.salesHistory) ? c.salesHistory : (Array.isArray(c.history) ? c.history : []);
  const repaymentHistory = Array.isArray(c.repaymentHistory) ? c.repaymentHistory : [];
  const totalCredit = Number(c.totalCredit || sumAmount(salesHistory));
  const totalPaid = Number(c.totalPaid || sumAmount(repaymentHistory));
  return {
    id: c.id || ('cust_' + Date.now() + '_' + Math.floor(Math.random() * 9999)),
    name: c.name || '',
    phone: c.phone || '---',
    totalCredit,
    totalPaid,
    currentBalance: Math.max(0, totalCredit - totalPaid),
    creditLimit: Number(c.creditLimit || 0),
    salesHistory: salesHistory.map(x => ({
      date: ensureHistoryDate(x.date),
      fuelType: x.fuelType || 'Fuel',
      qty: x.qty || '',
      amount: Number(x.amount || 0),
      note: x.note || ''
    })),
    repaymentHistory: repaymentHistory.map(x => ({
      date: ensureHistoryDate(x.date),
      amount: Number(x.amount || 0),
      note: x.note || ''
    }))
  };
}

function readCustomers(){
  try{
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const shaped = list.map(ensureCustomerShape);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shaped));
    return shaped;
  }catch(e){
    return [];
  }
}

function saveCustomers(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map(ensureCustomerShape)));
}

function requireAuth(){
  if(localStorage.getItem(AUTH_KEY) !== '1'){
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function normalizePhone(v){
  return String(v || '').replace(/[^\d+]/g, '');
}

function displayDateTime(value){
  const d = new Date(value);
  if(isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function displayDate(value){
  const d = new Date(value);
  if(isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function monthKey(value){
  const d = new Date(value);
  if(isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
}

function yearKey(value){
  const d = new Date(value);
  if(isNaN(d.getTime())) return '';
  return String(d.getFullYear());
}

function dayKey(value){
  const d = new Date(value);
  if(isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function matchesPeriod(value, mode){
  if(mode === 'all') return true;
  if(mode === 'daily') return dayKey(value) === dayKey(new Date());
  if(mode === 'monthly') return monthKey(value) === monthKey(new Date());
  if(mode === 'yearly') return yearKey(value) === yearKey(new Date());
  return true;
}

function calcTotals(c){
  const totalCredit = Number(c.totalCredit || sumAmount(c.salesHistory || []));
  const totalPaid = Number(c.totalPaid || sumAmount(c.repaymentHistory || []));
  const currentBalance = Math.max(0, totalCredit - totalPaid);
  return { totalCredit, totalPaid, currentBalance };
}

function customerLimit(c){
  const settings = readSettings();
  return Number(c.creditLimit || settings.creditLimit || 0);
}

function creditStatus(c){
  const { currentBalance } = calcTotals(c);
  const limit = customerLimit(c);
  return {
    limit,
    exceeded: limit > 0 && currentBalance > limit,
    warning: limit > 0 && currentBalance >= Math.floor(limit * 0.8)
  };
}

function formatMoney(n){ return `${fmt(n)} ကျပ်`; }

function setBrand(){
  const n = document.querySelector('[data-brand-name]');
  const t = document.querySelector('[data-brand-tag]');
  const s = readSettings();
  if(n) n.textContent = s.appName;
  if(t) t.textContent = s.companyTag;
}
