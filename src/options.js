// ═══════════════════════════════════════════════
//  TASALO — Options Page v1
//  Configuración simple y plug & play
// ═══════════════════════════════════════════════

import { DEFAULT_SETTINGS, CURRENCY_META, PREFERRED_ORDER, browser } from './constants.js';

let settings = {};
let availableCurrencies = [];

// ═══════════════════════════════════════════════
//  Init
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupNavigation();
  setupFormListeners();
  renderCurrenciesList();
  updateRangeValues();
});

async function loadSettings() {
  const data = await browser.storage.local.get('settings');
  settings = { ...DEFAULT_SETTINGS, ...data.settings };
  
  // Cargar valores en el formulario
  loadFormValues();
}

function loadFormValues() {
  // General
  document.getElementById('updateInterval').value = settings.updateInterval || 5;
  document.getElementById('newTabEnabled').checked = settings.newTabEnabled !== false;
  document.getElementById('iconRotateEnabled').checked = settings.iconRotateEnabled !== false;
  document.getElementById('iconRotateInterval').value = settings.iconRotateInterval || 2;
  
  // Theme
  const theme = settings.colorBg || 'auto';
  document.querySelectorAll('#themeGroup .seg-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === theme);
  });
  
  // Display
  document.getElementById('fontSize').value = settings.fontSize || 13;
  document.getElementById('showCurrencyFlag').checked = settings.showCurrencyFlag !== false;
  document.getElementById('showTimestamp').checked = settings.showTimestamp !== false;
  document.getElementById('compactMode').checked = settings.compactMode || false;
  document.getElementById('colorUp').value = settings.colorUp || '#ff6b6b';
  document.getElementById('colorDown').value = settings.colorDown || '#4ade80';
}

// ═══════════════════════════════════════════════
//  Navigation
// ═══════════════════════════════════════════════
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Update active section
      const sectionId = item.dataset.section;
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${sectionId}`).classList.add('active');
    });
  });
}

// ═══════════════════════════════════════════════
//  Form Listeners
// ═══════════════════════════════════════════════
function setupFormListeners() {
  // Range inputs
  document.querySelectorAll('.range').forEach(range => {
    range.addEventListener('input', updateRangeValues);
  });
  
  // Theme buttons
  document.querySelectorAll('#themeGroup .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#themeGroup .seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Save button
  document.getElementById('btnSave').addEventListener('click', saveSettings);
  
  // Reset button
  document.getElementById('btnReset').addEventListener('click', resetSettings);
  
  // Select all/none currencies
  document.getElementById('btnSelectAll')?.addEventListener('click', () => selectAllCurrencies(true));
  document.getElementById('btnSelectNone')?.addEventListener('click', () => selectAllCurrencies(false));
}

function updateRangeValues() {
  const interval = document.getElementById('updateInterval').value;
  document.getElementById('updateIntervalVal').textContent = 
    interval < 60 ? `${interval} min` : `${(interval / 60).toFixed(1)} h`;
  
  const rotateInterval = document.getElementById('iconRotateInterval').value;
  document.getElementById('iconRotateIntervalVal').textContent = `${rotateInterval} seg`;
  
  const fontSize = document.getElementById('fontSize').value;
  document.getElementById('fontSizeVal').textContent = `${fontSize} px`;
}

// ═══════════════════════════════════════════════
//  Currencies List
// ═══════════════════════════════════════════════
async function renderCurrenciesList() {
  const container = document.getElementById('currenciesList');
  if (!container) return;
  
  // Get available currencies from storage (loaded rates)
  const data = await browser.storage.local.get('currentRates');
  const loadedCurrencies = Object.keys(data.currentRates || {});
  
  // Use predefined list if no rates loaded
  availableCurrencies = loadedCurrencies.length > 0 ? loadedCurrencies : PREFERRED_ORDER;
  
  const selected = settings.selectedCurrencies || [];
  
  container.innerHTML = availableCurrencies.map(currency => {
    const meta = CURRENCY_META[currency] || { name: currency, flag: '💱' };
    const isSelected = selected.length === 0 || selected.includes(currency);
    
    return `
      <div class="currency-item ${isSelected ? 'selected' : ''}" data-currency="${currency}">
        <div class="currency-left">
          <span class="currency-flag">${meta.flag}</span>
          <div>
            <div class="currency-code">${currency}</div>
            <div class="currency-name">${meta.name}</div>
          </div>
        </div>
        <input type="checkbox" class="currency-checkbox" ${isSelected ? 'checked' : ''}>
      </div>
    `;
  }).join('');
  
  // Add click listeners
  container.querySelectorAll('.currency-item').forEach(item => {
    item.addEventListener('click', () => {
      const checkbox = item.querySelector('.currency-checkbox');
      checkbox.checked = !checkbox.checked;
      item.classList.toggle('selected', checkbox.checked);
    });
  });
}

function getSelectedCurrencies() {
  const checkboxes = document.querySelectorAll('.currency-checkbox');
  const selected = [];
  
  checkboxes.forEach((cb, index) => {
    if (cb.checked) {
      selected.push(availableCurrencies[index]);
    }
  });
  
  return selected;
}

function selectAllCurrencies(select) {
  document.querySelectorAll('.currency-item').forEach(item => {
    const checkbox = item.querySelector('.currency-checkbox');
    checkbox.checked = select;
    item.classList.toggle('selected', select);
  });
}

// ═══════════════════════════════════════════════
//  Save/Reset
// ═══════════════════════════════════════════════
async function saveSettings() {
  // Get theme
  const themeBtn = document.querySelector('#themeGroup .seg-btn.active');
  const theme = themeBtn ? themeBtn.dataset.val : 'auto';
  
  // Get selected currencies
  const selectedCurrencies = getSelectedCurrencies();
  
  // Build settings object
  const newSettings = {
    ...settings,
    updateInterval: parseInt(document.getElementById('updateInterval').value),
    newTabEnabled: document.getElementById('newTabEnabled').checked,
    iconRotateEnabled: document.getElementById('iconRotateEnabled').checked,
    iconRotateInterval: parseInt(document.getElementById('iconRotateInterval').value),
    colorBg: theme,
    fontSize: parseInt(document.getElementById('fontSize').value),
    showCurrencyFlag: document.getElementById('showCurrencyFlag').checked,
    showTimestamp: document.getElementById('showTimestamp').checked,
    compactMode: document.getElementById('compactMode').checked,
    colorUp: document.getElementById('colorUp').value,
    colorDown: document.getElementById('colorDown').value,
    selectedCurrencies: selectedCurrencies.length > 0 ? selectedCurrencies : [],
  };
  
  // Save to storage
  await browser.storage.local.set({ settings: newSettings });
  
  // Notify background script
  await browser.runtime.sendMessage({ 
    type: 'UPDATE_SETTINGS', 
    settings: newSettings 
  });
  
  // Show toast
  showToast();
}

function resetSettings() {
  if (confirm('¿Restaurar configuración a valores por defecto?')) {
    settings = { ...DEFAULT_SETTINGS };
    loadFormValues();
    renderCurrenciesList();
    saveSettings();
  }
}

function showToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
