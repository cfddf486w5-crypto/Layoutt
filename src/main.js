
import { ROWS, COLS, createDefaultCell as DEFAULT_CELL, createEmptyGrid, cellKey } from './model/grid.js';
import { createLayoutState } from './model/layoutState.js';
import { listBinModels, normalizeBinModel, getBinModelMeta, getCapacityLabel } from './model/binModels.js';
import { applyCellVisual as renderCell } from './ui/render.js';
import { loadLayoutFromStorage, saveLayoutToStorage, loadZoneNamesFromStorage, saveZoneNamesToStorage } from './services/storage.js';
import { buildExportObject } from './services/export.js';
import { runAudit as runAuditMetrics } from './audit/index.js';
import { createVisionAdapter } from './adapters/visionAdapter.js';

// ============================
// Damour Logistique — V9 PRO
// ============================
let gridData = createEmptyGrid(ROWS, COLS);
const layoutState = createLayoutState({ rows: ROWS, cols: COLS, gridData });
layoutState.subscribe((nextState) => {
  gridData = nextState.gridData;
});
const visionAdapter = createVisionAdapter();
void visionAdapter;

// DOM
const gridWrap = document.getElementById('gridWrap');
const gridEl = document.getElementById('grid');
const selBox = document.getElementById('selBox');
const coordsEl = document.getElementById('coords');
const statsEl = document.getElementById('stats');
const outputEl = document.getElementById('output');
const hintText = document.getElementById('hintText');
const toolBadge = document.getElementById('toolBadge');
const modal = document.getElementById('modal');
const sectionInput = document.getElementById('sectionInput');
const numeroInput = document.getElementById('numeroInput');
const saveBinBtn = document.getElementById('saveBin');
const cancelBinBtn = document.getElementById('cancelBin');
const paintDragEl = document.getElementById('paintDrag');
const selectModeEl = document.getElementById('selectMode');
const showLabelsEl = document.getElementById('showLabels');
const navModeEl = document.getElementById('navMode');
const dirtyBadge = document.getElementById('dirtyBadge');
const onlineBadge = document.getElementById('onlineBadge');
const toastEl = document.getElementById('toast');
const zoneSelect = document.getElementById('zoneSelect');
const cellFractionEl = document.getElementById('cellFraction');

// Layout background
const bgEl = document.getElementById('bgLayout');
const bgToggle = document.getElementById('bgToggle');
const bgOpacity = document.getElementById('bgOpacity');
const bgScale = document.getElementById('bgScale');
const bgFile = document.getElementById('bgFile');


// Zone names
const zoneNameA = document.getElementById('zoneNameA');
const zoneNameB = document.getElementById('zoneNameB');
const zoneNameC = document.getElementById('zoneNameC');
const zoneNameD = document.getElementById('zoneNameD');

// View filters
const fBins = document.getElementById('fBins');
const fWalls = document.getElementById('fWalls');
const fDoors = document.getElementById('fDoors');
const fWorks = document.getElementById('fWorks');
const fZones = document.getElementById('fZones');
const xray = document.getElementById('xray');

// Search
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('searchStatus');

// BIN list
const binList = document.getElementById('binList');
const binListFilter = document.getElementById('binListFilter');

// Audit
const auditSummary = document.getElementById('auditSummary');
const auditList = document.getElementById('auditList');

// State
let lastSelected = null;
let isPainting = false;
let dirty = false;
let currentTool = 'binrange';

// Selection
let isSelecting = false;
let selStart = null;
let selEnd = null;
let selection = new Set();

// Clipboard
let clipboard = null;

// Undo/Redo
const MAX_HISTORY = 150;
let history = [];
let future = [];

// BIN range
let binRangeState = { phase: 'idle', start: null, end: null, cells: [], head: null };

// Storage
const STORAGE_KEY = 'dl_shop_layout_v9';
const ZONES_KEY = 'dl_zonenames_v9';
// Mapping LOCATION -> TYPE (import Excel)
const LOCATION_TYPE_MAP = {"L3A02": "P2", "L3A04": "P2", "L3A06": "P2", "L3A08": "P3", "L3A10": "P7", "L3A12": "P7", "L3A14": "P7", "L3A16": "P7", "L3A18": "P7", "L3A20": "P7", "L3A22": "P7", "L3A24": "P7", "L3A26": "P7", "L3A28": "P7", "L3A30": "P7", "L3A32": "P7", "L3A34": "P7", "L3A36": "P7", "L3A38": "P7", "L3A40": "P7", "L3A42": "P7", "L3A44": "P7", "L3A46": "P6", "L3A48": "P6", "L3A50": "P6", "L3A52": "P6", "L3A54": "P6", "L3A56": "P7", "L3A58": "P7", "L3A60": "P7", "L3A62": "P7", "L3A64": "P7", "L3A66": "P7", "L3A68": "P7", "L3A70": "P7", "L3A72": "P7", "L3A74": "P7", "L3A76": "P7", "L3A78": "P7", "L3A80": "P7", "L3A82": "P7", "L3A84": "P7", "L3A86": "P7", "L3A88": "P5", "L3A90": "P3", "L3A92": "P3", "L3A94": "P3", "L3A96": "P3", "L3A01": "P4", "L3A03": "P4", "L3A05": "P4", "L3A07": "P4", "L3A09": "P4", "L3A11": "P4", "L3A13": "P4", "L3A15": "P4", "L3A17": "P4", "L3A19": "P4", "L3A21": "P4", "L3A23": "P4", "L3A25": "P4", "L3A27": "P4", "L3A29": "P4", "L3A31": "P4", "L3A33": "P4", "L3A35": "P4", "L3A37": "P4", "L3A39": "P4", "L3A41": "P4", "L3A43": "P4", "L3A45": "P4", "L3A47": "P4", "L3A49": "P4", "L3A51": "P4", "L3A53": "P4", "L3A55": "P4", "L3A57": "P4", "L3A59": "P4", "L3A61": "P4", "L3A63": "P4", "L3A65": "P4", "L3A67": "P4", "L3A69": "P4", "L3A71": "P4", "L3A73": "P4", "L3A75": "P4", "L3A77": "P4", "L3A79": "P4", "L3A81": "P4", "L3B02": "P2", "L3B04": "P2", "L3B06": "P2", "L3B08": "P2", "L3B10": "P2", "L3B12": "P2", "L3B14": "P2", "L3B16": "P2", "L3B18": "P2", "L3B20": "P2", "L3B22": "P2", "L3B24": "P2", "L3B26": "P2", "L3B28": "P2", "L3B30": "P2", "L3B32": "P2", "L3B34": "P2", "L3B36": "P2", "L3B38": "P2", "L3B40": "P2", "L3B42": "P2", "L3B44": "P2", "L3B46": "P2", "L3B48": "P2", "L3B50": "P2", "L3B52": "P2", "L3B54": "P2", "L3B56": "P2", "L3B58": "P2", "L3B60": "P2", "L3B62": "P2", "L3B64": "P2", "L3B66": "P2", "L3B68": "P2", "L3B70": "P2", "L3B72": "P2", "L3B74": "P2", "L3B76": "P2", "L3B78": "P2", "L3B80": "P2", "L3B01": "P2", "L3B03": "P2", "L3B05": "P2", "L3B07": "P2", "L3B09": "P2", "L3B11": "P2", "L3B13": "P2", "L3B15": "P2", "L3B17": "P2", "L3B19": "P2", "L3B21": "P2", "L3B23": "P2", "L3B25": "P2", "L3B27": "P2", "L3B29": "P2", "L3B31": "P2", "L3B33": "P2", "L3B35": "P2", "L3B37": "P2", "L3B39": "P2", "L3B41": "P2", "L3B43": "P2", "L3B45": "P2", "L3B47": "P2", "L3B49": "P2", "L3B51": "P2", "L3B53": "P2", "L3B55": "P2", "L3B57": "P2", "L3B59": "P2", "L3B61": "P2", "L3B63": "P2", "L3B65": "P2", "L3B67": "P2", "L3B69": "P2", "L3B71": "P2", "L3B73": "P2", "L3C02": "P4", "L3C04": "P4", "L3C06": "P4", "L3C08": "P4", "L3C10": "P4", "L3C12": "P4", "L3C14": "P4", "L3C16": "P4", "L3C18": "P4", "L3C20": "P4", "L3C22": "P4", "L3C24": "P4", "L3C26": "P4", "L3C28": "P4", "L3C30": "P4", "L3C32": "P4", "L3C34": "P4", "L3C36": "P4", "L3C38": "P4", "L3C40": "P4", "L3C42": "P4", "L3C44": "P4", "L3C46": "P4", "L3C48": "P4", "L3C50": "P4", "L3C52": "P4", "L3C54": "P4", "L3C56": "P4", "L3C58": "P4", "L3C60": "P4", "L3C62": "P4", "L3C64": "P4", "L3C66": "P4", "L3C68": "P4", "L3C70": "P4", "L3C72": "P4", "L3C74": "P4", "L3C76": "P4", "L3C01": "P1", "L3C03": "P1", "L3C05": "P1", "L3C07": "P1", "L3C09": "P1", "L3C11": "P1", "L3C13": "P1", "L3C15": "P1", "L3C17": "P1", "L3C19": "P1", "L3C21": "P1", "L3C23": "P1", "L3C25": "P1", "L3C27": "P1", "L3C29": "P1", "L3C31": "P1", "L3C33": "P1", "L3C35": "P1", "L3C37": "P1", "L3C39": "P1", "L3C41": "P1", "L3C43": "P1", "L3C45": "P1", "L3C47": "P1", "L3C49": "P1", "L3C51": "P1", "L3C53": "P1", "L3C55": "P1", "L3C57": "P1", "L3C59": "P1", "L3C61": "P1", "L3C63": "P1", "L3C65": "P1", "L3C67": "P1", "L3C69": "P1", "L3D00A": "P7", "L3D00B": "P7", "L3D00C": "6 X P1", "L3D02": "P1", "L3D04": "P1", "L3D06": "P1", "L3D08": "P1", "L3D10": "P1", "L3D12": "P1", "L3D14": "P1", "L3D16": "P1", "L3D18": "P1", "L3D20": "P1", "L3D22": "P1", "L3D24": "P1", "L3D26": "P1", "L3D28": "P1", "L3D30": "P1", "L3D32": "P1", "L3D34": "P1", "L3D36": "P1", "L3D38": "P1", "L3D40": "P1", "L3D42": "P1", "L3D44": "P1", "L3D46": "P1", "L3D48": "P1", "L3D50": "P1", "L3D52": "P1", "L3D54": "P1", "L3D56": "P1", "L3D58": "P1", "L3D60": "P1", "L3D62": "P1", "L3D64": "P1", "L3D66": "P1", "L3D68": "P1", "L3D70": "P1", "L3D01": "P4", "L3D03": "P3", "L3D05": "P3", "L3D07": "P3", "L3D09": "P3", "L3D11": "P3", "L3D13": "P3", "L3D15": "P3", "L3D17": "P3", "L3D19": "P3", "L3D21": "P3", "L3D23": "P3", "L3D25": "P2", "L3D27": "P2", "L3D29": "P2", "L3D31": "P2", "L3D33": "P2", "L3D35": "P2", "L3D37": "P2", "L3D39": "P2", "L3D41": "P2", "L3D43": "P3", "L3D45": "P3", "L3D47": "P3", "L3D49": "P3", "L3D51": "P3", "L3D53": "P3", "L3D55": "P3", "L3D57": "P3", "L3D59": "P3", "L3D61": "P3", "L3D63": "P3", "L3D65": "P3", "L3D67": "P3", "L2A01": "Temporaire 1", "L2A03": "Temporaire 2", "L2A05": "Temporaire 3", "L2A07": "P7", "L2A09": "P7", "L2A11": "P7", "L2A13": "P7", "L2A15": "P7", "L2A17": "P7", "L2A19": "P7", "L2A21": "P7", "L2A23": "P7", "L2A25": "P7", "L2A27": "P7", "L2A29": "P7", "L2A31": "P7", "L2A33": "P7", "L2A35": "P7", "L2A02": "P2", "L2A04": "P2", "L2A06": "P2", "L2A08": "P2", "L2A10": "P2", "L2A12": "P2", "L2A14": "P2", "L2A16": "P2", "L2A18": "P2", "L2A20": "P2", "L2B02": "P1", "L2B04": "P1", "L2B06": "P1", "L2B08": "P1", "L2B10": "P1", "L2B12": "P1", "L2B14": "P1", "L2B16": "P1", "L2B18": "P1", "L2B20": "P1", "L2B22": "P5", "L2B24": "P5", "L2B26": "P5", "L2B28": "P5", "L2B30": "P5", "L2B32": "P5", "L2B34": "P5", "L2B36": "P5", "L2B38": "P1", "L2B40": "P1", "L2B42": "P1", "L2B44": "P1", "L2B46": "P1", "L2B48": "P1", "L2B50": "P1", "L2B52": "P1", "L2B54": "P1", "L2B56": "P1", "L2B58": "P1", "L2I01H": "MAGASIN", "L2I03E": "MAGASIN", "L2I03G": "MAGASIN", "L2I04A": "MAGASIN", "L2I04B": "MAGASIN", "L2I04D": "MAGASIN", "L2I04F": "MAGASIN", "L2I04H": "MAGASIN", "L2I04I": "MAGASIN", "L2I05A": "MAGASIN", "L2I05B": "MAGASIN", "L2I05C": "MAGASIN", "L2I05D": "MAGASIN", "L2I05E": "MAGASIN", "L2I05F": "MAGASIN", "L2I05G": "MAGASIN", "L2I05H": "MAGASIN", "L2I05I": "MAGASIN", "L2I06A": "MAGASIN", "L2I06B": "MAGASIN", "L2I06D": "MAGASIN", "L2I06F": "MAGASIN", "L2I06H": "MAGASIN", "L2I07B": "MAGASIN", "L2I07C": "MAGASIN", "L2I07D": "MAGASIN", "L2I07E": "MAGASIN", "L2I07F": "MAGASIN", "L2I07G": "MAGASIN", "L2I07H": "MAGASIN", "L2I07I": "MAGASIN", "L2I08A": "MAGASIN", "L2I08B": "MAGASIN", "L2I08C": "MAGASIN", "L2I08D": "MAGASIN", "L2I08F": "MAGASIN", "L2I08H": "MAGASIN", "L2I09A": "MAGASIN", "L2I09B": "MAGASIN", "L2I09C": "MAGASIN", "L2I09D": "MAGASIN", "L2I09F": "MAGASIN", "L2I09G": "MAGASIN", "L2I09H": "MAGASIN", "L2I09I": "MAGASIN", "L2I10A": "MAGASIN", "L2I10B": "MAGASIN", "L2I10D": "MAGASIN", "L2I10E": "MAGASIN", "L2I10F": "MAGASIN", "L2I10H": "MAGASIN", "L2I11A": "MAGASIN", "L2I11B": "MAGASIN", "L2I11C": "MAGASIN", "L2I11D": "MAGASIN", "L2I11E": "MAGASIN", "L2I11F": "MAGASIN", "L2I11G": "MAGASIN", "L2I11H": "MAGASIN", "L2I11I": "MAGASIN", "L2I12A": "MAGASIN", "L2I12B": "MAGASIN", "L2I12D": "MAGASIN", "L2I12F": "MAGASIN", "L2I12H": "MAGASIN", "L2JRACK": "RACKING", "L2J01H": "RACKING", "L2J02": "RACKING", "L2J03C": "RACKING", "L2J04A": "RACKING", "L2J04B": "RACKING", "L2J05H": "RACKING", "L2J06A": "RACKING", "L2J06C": "RACKING", "L2J07F": "RACKING", "L2J07H": "RACKING", "L2J09H": "RACKING", "L2J11C": "RACKING", "L2J11H": "RACKING", "L2J13B": "RACKING", "L2J13C": "RACKING"};

const CELL_INCH = 50;
const CELL_FEET = +(CELL_INCH / 12).toFixed(4);

const PLAN_TOOLS = new Set([
  'work', 'office', 'charger', 'electrical', 'shelving', 'racking', 'road', 'roadstop', 'cafeteria', 'garage', 'stairs'
]);

const TYPE_COLORS = {
  bin: '#111827',
  wall: '#6b7280',
  door: '#12b76a',
  work: '#f59e0b',
  office: '#c084fc',
  charger: '#22d3ee',
  electrical: '#ef4444',
  shelving: '#facc15',
  racking: '#fb923c',
  road: '#334155',
  roadstop: '#dc2626',
  cafeteria: '#f472b6',
  garage: '#14b8a6',
  stairs: '#94a3b8'
};

const FRACTION_LABELS = {
  1: 'entière',
  0.5: '1/2',
  0.3333333333: '1/3',
  0.25: '1/4'
};

function selectedFraction(){
  const value = Number.parseFloat(cellFractionEl?.value || '1');
  if([1, 0.5, 0.3333333333, 0.25].some((v) => Math.abs(v - value) < 0.0001)) return value;
  return 1;
}

function fractionLabel(value){
  const key = Object.keys(FRACTION_LABELS).find((k) => Math.abs(Number(k) - Number(value)) < 0.0001);
  return key ? FRACTION_LABELS[key] : 'entière';
}

function typeColor(type){
  return TYPE_COLORS[type] || null;
}

const MAX_BIN_CELLS = 10;


function toast(msg){
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.style.display = 'none', 2400);
}

function setDirty(v){
  dirty = v;
  dirtyBadge.textContent = dirty ? 'Non sauvegardé' : 'OK';
  dirtyBadge.className = 'badge ' + (dirty ? 'warn' : 'ok');
}

function snapshot(){
  layoutState.applyOperation({ type: 'SNAPSHOT' });
}

function restoreFromSnapshot(snap){
  layoutState.deserialize(snap, { trackHistory: false });
  gridData = layoutState.getState().gridData;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(gridData[r][c].zone === undefined) gridData[r][c].zone = '';
  }
  renderAll();
}

function hydrateCell(src){
  if(!src) return DEFAULT_CELL();
  return {
    type: src.type || 'empty',
    label: src.label || '',
    binId: src.binId ?? null,
    depth: (src.depth === 0 || src.depth) ? src.depth : null,
    isHead: !!src.isHead,
    direction: src.direction || null,
    zone: src.zone || '',
    sizeFraction: Number(src.sizeFraction) > 0 ? Number(src.sizeFraction) : 1
  };
}

function undo(){
  if(!layoutState.applyOperation({ type: 'UNDO' })) return toast('Rien à annuler');
  gridData = layoutState.getState().gridData;
  renderAll();
  setDirty(true);
}

function redo(){
  if(!layoutState.applyOperation({ type: 'REDO' })) return toast('Rien à refaire');
  gridData = layoutState.getState().gridData;
  renderAll();
  setDirty(true);
}

function setTool(tool){
  currentTool = tool;
  toolBadge.textContent = 'outil: ' + tool;
  closeMenu('menuTools');
  if(tool === 'binrange') setHint('Mode : Création de BIN – clic 1 = première extrémité.');
  else setHint('Mode : outil simple (mur, porte, poste, BIN, texte...).');
  resetBinRangeState();
  if(navModeEl && navModeEl.checked){ navModeEl.checked = false; toast('Édition ON'); }
 toast('Outil: ' + tool);
}

function setHint(text){ hintText.textContent = text; }

function resetBinRangeState(){
  binRangeState = { phase: 'idle', start: null, end: null, cells: [], head: null };
  if(currentTool === 'binrange') setHint('Mode : Création de BIN – clic 1 = première extrémité.');
}

function applyCellVisual(cell, data){
  renderCell(cell, data, { showLabels: showLabelsEl.checked });
}

function createGrid(){
  gridEl.innerHTML = '';
  for(let r=0; r<ROWS; r++){
    for(let c=0; c<COLS; c++){
      const cell = document.createElement('div');
      cell.className = 'cell type-empty';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.title = `Ligne ${r+1}, Colonne ${c+1}`;

      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        cell.setPointerCapture?.(e.pointerId);
        if(selectModeEl.checked){
          beginSelection(r,c);
        } else {
          isPainting = paintDragEl.checked;
          onCellAction(cell, true);
        }
      });

      cell.addEventListener('pointerenter', () => {
        if(selectModeEl.checked){
          if(isSelecting) updateSelection(parseInt(cell.dataset.row,10), parseInt(cell.dataset.col,10));
        } else {
          if(!isNavMode() && isPainting) onCellAction(cell, false);
        }
      });

      applyCellVisual(cell, gridData[r][c]);
      gridEl.appendChild(cell);
    }
  }

  window.addEventListener('pointerup', () => {
    isPainting = false;
    if(isSelecting) endSelection();
  });
}

function updateCoords(row, col){
  const d = gridData[row][col];
  const parts = [`L${row+1} C${col+1}`, d.type];
  if(d.binId) parts.push('binId=' + d.binId);
  if(d.sizeFraction && d.sizeFraction < 1) parts.push('surface=' + fractionLabel(d.sizeFraction));
  if(d.depth !== null && d.depth !== undefined) parts.push('depth=' + d.depth);
  if(d.isHead) parts.push('head');
  if(d.direction) parts.push('dir=' + d.direction);
  if(d.zone) parts.push('zone=' + zoneName(d.zone));
  if(d.label) parts.push('label=' + d.label);
  coordsEl.textContent = parts.join(' • ');
}

function onCellAction(cell, isPrimary){
  const row = parseInt(cell.dataset.row, 10);
  const col = parseInt(cell.dataset.col, 10);

  if(lastSelected) lastSelected.classList.remove('highlight');
  cell.classList.add('highlight');
  lastSelected = cell;

  if(currentTool === 'binrange'){
    if(isPrimary) handleBinRangeClick(row, col);
  } else {
    if(isPrimary) snapshot();
    resetBinRangeState();
    handleSimpleToolClick(row, col, currentTool);
    setDirty(true);
  }

  updateCoords(row, col);
  updateStats();
}

function handleSimpleToolClick(row, col, tool){
  const current = gridData[row][col];
  let patch = null;

  if(tool === 'label'){
    const txt = prompt('Numéro / texte pour cette case :', current.label || '');
    if(txt !== null){
      patch = {
        label: txt.trim(),
        type: (!current.type || current.type === 'empty') ? 'bin' : current.type
      };
    }
  } else if(tool === 'bin'){
    patch = { type: 'bin', binId: null, depth: null, isHead: false, direction: null, label: current.label || '', sizeFraction: 1 };
  } else if(tool === 'empty'){
    layoutState.applyOperation({ type: 'CLEAR_CELL', position: { row, col } });
  } else if(tool === 'wall' || tool === 'door' || PLAN_TOOLS.has(tool)){
    const fraction = PLAN_TOOLS.has(tool) ? selectedFraction() : 1;
    const toolLabel = tool === 'roadstop' ? '🛑' : '';
    patch = { type: tool, binId: null, depth: null, isHead: false, direction: null, label: toolLabel, sizeFraction: fraction };
  }

  if(patch){
    layoutState.applyOperation({ type: 'SET_CELL', position: { row, col }, patch });
  }

  const data = gridData[row][col];
  applyCellVisual(gridEl.children[cellKey(row,col)], data);
}

function handleBinRangeClick(row, col){
  // BIN+ guidé (max 10 cases)
  if(isNavMode && isNavMode() && navModeEl){ navModeEl.checked = false; toast('Édition ON'); }

  if(binRangeState.phase === 'idle'){
    binRangeState.start = {row, col};
    binRangeState.phase = 'awaitSecond';
    markStartCell(row,col);
    markAvailableFromStart(binRangeState.start);
    bwShow(2);
    return;
  }

  if(binRangeState.phase === 'awaitSecond'){
    const start = binRangeState.start;
    if(start.row !== row && start.col !== col){ toast('La BIN doit être en ligne droite.'); return; }

    const dist = Math.abs((start.row===row) ? (col-start.col) : (row-start.row));
    if(dist >= MAX_BIN_CELLS){ toast('Max ' + MAX_BIN_CELLS + ' cases.'); return; }

    binRangeState.end = {row, col};
    const cells = [];
    if(start.row === row){
      const c1 = Math.min(start.col, col), c2 = Math.max(start.col, col);
      for(let cc=c1; cc<=c2; cc++) cells.push({row, col: cc});
    } else {
      const r1 = Math.min(start.row, row), r2 = Math.max(start.row, row);
      for(let rr=r1; rr<=r2; rr++) cells.push({row: rr, col});
    }

    if(cells.length < 2){ toast('BIN trop courte'); resetBinRangeState(); clearBinPreview(); bwShow(1); return; }

    snapshot();
    binRangeState.cells = cells;

    // preview temporary
    for(const pos of cells){
      const d = gridData[pos.row][pos.col];
      d.type = 'bin'; d.binId=null; d.depth=null; d.isHead=false; d.direction=null; d.label=''; d.sizeFraction=1;
      applyCellVisual(gridEl.children[cellKey(pos.row,pos.col)], d);
    }

    clearBinPreview();
    markLineCells(cells);
    binRangeState.phase='awaitHead';
    bwShow(3);
    setDirty(true);
    return;
  }

  if(binRangeState.phase === 'awaitHead'){
    const start = binRangeState.start, end = binRangeState.end;
    const isStart = (row===start.row && col===start.col);
    const isEnd = (row===end.row && col===end.col);
    if(!isStart && !isEnd){ toast('Clique sur une extrémité'); return; }

    binRangeState.head={row, col};

    // default type based on length (<=7 => Pn else P7)
    const len = binRangeState.cells.length;
    if(bw.typeEl){ bw.typeEl.value = (len<=7 ? ('P'+len) : 'P7'); }

    bwShow(4);
    bwRefreshComputed();
  }
}

function openModal(){
  sectionInput.value = ''; numeroInput.value = '';
  modal.style.display = 'flex';
  setTimeout(() => sectionInput.focus(), 60);
}
function closeModal(){ modal.style.display = 'none'; }

saveBinBtn.addEventListener('click', () => {
  const section = sectionInput.value.trim();
  const numero = numeroInput.value.trim();
  if(!section || !numero){ toast('Section et numéro obligatoires (ex: L3B + 01).'); return; }

  const binId = section + numero;
  const cells = binRangeState.cells;
  if(!cells || cells.length === 0){ toast('Erreur: aucune cellule de BIN.'); closeModal(); resetBinRangeState(); return; }

  const head = binRangeState.head;
  let ordered = [...cells];
  let headIndex = ordered.findIndex(p => p.row === head.row && p.col === head.col);
  if(headIndex === -1){ toast('Erreur de tête.'); closeModal(); resetBinRangeState(); return; }

  let direction = null;
  if(ordered.length > 1){
    const next = ordered[headIndex === 0 ? 1 : headIndex - 1];
    if(next.row === head.row) direction = (next.col > head.col) ? 'right' : 'left';
    else direction = (next.row > head.row) ? 'down' : 'up';
  }

  if(headIndex !== 0){
    ordered = ordered.slice(headIndex).concat(ordered.slice(0, headIndex));
  }

  const totalDepth = ordered.length - 1;
  layoutState.applyOperation({
    type: 'ASSIGN_BIN',
    cells: ordered,
    binId,
    head,
    direction,
    label: numero + (totalDepth>0 ? ' P' + totalDepth : '')
  });
  for(const pos of ordered){
    applyCellVisual(gridEl.children[cellKey(pos.row,pos.col)], gridData[pos.row][pos.col]);
  }

  closeModal();
  toast('BIN ' + binId + ' enregistrée.');
  resetBinRangeState();
  setDirty(true);
  updateStats();
  refreshBinList();
  bgLoadFromStorage();
});

cancelBinBtn.addEventListener('click', () => {
  const cells = binRangeState.cells || [];
  for(const pos of cells){
    gridData[pos.row][pos.col] = DEFAULT_CELL();
    applyCellVisual(gridEl.children[cellKey(pos.row,pos.col)], gridData[pos.row][pos.col]);
  }
  closeModal(); resetBinRangeState(); setDirty(true); updateStats();
});

modal.addEventListener('click', (e) => { if(e.target === modal) closeModal(); });

function renderAll(){
  for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++){
    applyCellVisual(gridEl.children[cellKey(r,c)], gridData[r][c]);
  }
  if(lastSelected){
    updateCoords(parseInt(lastSelected.dataset.row,10), parseInt(lastSelected.dataset.col,10));
  }
  updateStats();
}

showLabelsEl.addEventListener('change', () => renderAll());


// iPhone: calcule la hauteur du header pour positionner menus et main
function setHeaderHeightVar(){
  const h = document.querySelector('header')?.getBoundingClientRect().height || 160;
  document.documentElement.style.setProperty('--headerH', Math.ceil(h) + 'px');
}
window.addEventListener('resize', setHeaderHeightVar);
window.addEventListener('orientationchange', setHeaderHeightVar);
setTimeout(setHeaderHeightVar, 50);
setTimeout(setHeaderHeightVar, 350);


// ===== Layout background logic =====
const BG_KEY = 'dl_layout_bg_img';
const BG_OP_KEY = 'dl_layout_bg_op';
const BG_SC_KEY = 'dl_layout_bg_sc';

function bgApply(){
  if(!bgEl) return;
  const on = !!bgToggle?.checked;
  bgEl.style.display = on ? 'block' : 'none';
  const op = (bgOpacity? parseInt(bgOpacity.value||'28',10) : 28);
  const sc = (bgScale? parseInt(bgScale.value||'100',10) : 100);
  bgEl.style.opacity = String(Math.max(0, Math.min(100, op))/100);
  bgEl.style.transform = `scale(${Math.max(50, Math.min(200, sc))/100})`;
  try{ localStorage.setItem(BG_OP_KEY, String(op)); localStorage.setItem(BG_SC_KEY, String(sc)); }catch{}
}

function bgSetDataUrl(dataUrl){
  if(!bgEl) return;
  bgEl.src = dataUrl;
  try{
    // éviter de stocker un gros fichier si c'est un chemin relatif
    if(String(dataUrl).startsWith('data:')) localStorage.setItem(BG_KEY, dataUrl);
    else localStorage.setItem(BG_KEY, String(dataUrl));
  }catch{}
  if(bgToggle) bgToggle.checked = true;
  bgApply();
  toast('Layout appliqué');
}

function bgLoadFromStorage(){
  try{
    const op = localStorage.getItem(BG_OP_KEY);
    const sc = localStorage.getItem(BG_SC_KEY);
    const img = localStorage.getItem(BG_KEY);
    if(bgOpacity && op) bgOpacity.value = op;
    if(bgScale && sc) bgScale.value = sc;
    if(img && bgEl){ bgEl.src = img; }
  }catch{}
  bgApply();
}

if(bgToggle) bgToggle.addEventListener('change', bgApply);
if(bgOpacity) bgOpacity.addEventListener('input', bgApply);
if(bgScale) bgScale.addEventListener('input', bgApply);

const bgImportBtn = document.getElementById('bgImport');
const bgDefaultBtn = document.getElementById('bgDefault');

if(bgImportBtn && bgFile){
  bgImportBtn.addEventListener('click', () => bgFile.click());
  bgFile.addEventListener('change', async () => {
    const f = bgFile.files && bgFile.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => bgSetDataUrl(String(reader.result||''));
    reader.readAsDataURL(f);
    bgFile.value = '';
  });
}

if(bgDefaultBtn){
  bgDefaultBtn.addEventListener('click', () => {
    // default image packaged alongside index.html
    bgSetDataUrl('assets/layout-langelier.jpg');
  });
}

// Menus: close others
const menus = ['menuTools','menuView','menuSearch','menuBins','menuAudit','menuActions','menuData','menuInfo']
  .map(id => document.getElementById(id));
menus.forEach(m => m.addEventListener('toggle', () => {
  if(m.open) menus.forEach(o => { if(o!==m) o.removeAttribute('open'); });
}));

document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeMenu(btn.getAttribute('data-close'))));
// UX iPhone: fermer les menus si on tape en dehors
document.addEventListener('pointerdown', (e) => {
  const openMenu = document.querySelector('details.menu[open]');
  if(!openMenu) return;
  const dd = openMenu.querySelector('.dropdown');
  const sum = openMenu.querySelector('summary');
  if(dd && !dd.contains(e.target) && sum && !sum.contains(e.target)) openMenu.removeAttribute('open');
});

function closeMenu(id){ document.getElementById(id)?.removeAttribute('open'); }

// Tool buttons
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.getAttribute('data-tool'))));

// Selection rectangle
function beginSelection(r,c){
  isSelecting = true;
  selStart = {row:r,col:c};
  selEnd = {row:r,col:c};
  drawSelection();
  selBox.style.display = 'block';
  selection.clear();
  updateSelection(r,c);
}

function updateSelection(r,c){
  selEnd = {row:r,col:c};
  selection.clear();
  const r1 = Math.min(selStart.row, selEnd.row);
  const r2 = Math.max(selStart.row, selEnd.row);
  const c1 = Math.min(selStart.col, selEnd.col);
  const c2 = Math.max(selStart.col, selEnd.col);
  for(let rr=r1; rr<=r2; rr++) for(let cc=c1; cc<=c2; cc++) selection.add(cellKey(rr,cc));
  drawSelection();
  updateStats();
}

function endSelection(){
  isSelecting = false;
  if(selection.size === 0){ selBox.style.display = 'none'; return; }
  toast('Sélection: ' + selection.size + ' cases');
}

function drawSelection(){
  if(!selStart || !selEnd) return;
  const r1 = Math.min(selStart.row, selEnd.row);
  const r2 = Math.max(selStart.row, selEnd.row);
  const c1 = Math.min(selStart.col, selEnd.col);
  const c2 = Math.max(selStart.col, selEnd.col);

  const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
  const left = c1 * cellSize;
  const top = r1 * cellSize;
  const width = (c2 - c1 + 1) * cellSize;
  const height = (r2 - r1 + 1) * cellSize;

  selBox.style.left = left + 'px';
  selBox.style.top = top + 'px';
  selBox.style.width = width + 'px';
  selBox.style.height = height + 'px';
}

selectModeEl.addEventListener('change', () => {
  if(!selectModeEl.checked){ selection.clear(); selBox.style.display = 'none'; toast('Sélection OFF'); }
  else toast('Sélection ON');
});
// Mode Navigation/Édition
function isNavMode(){ return !!navModeEl?.checked; }
if(navModeEl){
  navModeEl.addEventListener('change', () => {
    if(isNavMode()){
      // sécurité: désactive sélection si active
      if(selectModeEl.checked){ selectModeEl.checked = false; selection.clear(); selBox.style.display='none'; }
      toast('Navigation ON (tu peux bouger la grille)');
    } else {
      toast('Édition ON (tu peux modifier)');
    }
  });
}


// Zone names
let zoneNames = {A:'Zone A', B:'Zone B', C:'Zone C', D:'Zone D'};
function loadZoneNames(){
  try{
    const raw = loadZoneNamesFromStorage();
    if(raw){
      const obj = JSON.parse(raw);
      zoneNames = {...zoneNames, ...obj};
    }
  }catch{}
  zoneNameA.value = zoneNames.A;
  zoneNameB.value = zoneNames.B;
  zoneNameC.value = zoneNames.C;
  zoneNameD.value = zoneNames.D;
}
function saveZoneNames(){
  zoneNames.A = zoneNameA.value.trim() || 'Zone A';
  zoneNames.B = zoneNameB.value.trim() || 'Zone B';
  zoneNames.C = zoneNameC.value.trim() || 'Zone C';
  zoneNames.D = zoneNameD.value.trim() || 'Zone D';
  saveZoneNamesToStorage( JSON.stringify(zoneNames));
  layoutState.applyOperation({ type: 'SET_ZONES_META', zones: zoneNames });
  toast('Noms zones sauvegardés');
  updateStats();
  refreshBinList();
}
function zoneName(z){ return zoneNames[z] || ('Zone ' + z); }

document.getElementById('btnSaveZones').addEventListener('click', saveZoneNames);
loadZoneNames();

// Apply zone
document.getElementById('btnApplyZone').addEventListener('click', () => {
  if(selection.size === 0) return toast('Sélectionne un bloc (Mode sélection)');
  const z = zoneSelect.value || '';
  const cells = Array.from(selection).map((k) => ({ row: Math.floor(k / COLS), col: k % COLS }));
  layoutState.applyOperation({ type: 'SET_ZONE', cells, zone: z });
  for(const k of selection){
    const r = Math.floor(k / COLS);
    const c = k % COLS;
    applyCellVisual(gridEl.children[k], gridData[r][c]);
  }
  setDirty(true);
  toast(z ? ('Zone ' + zoneName(z) + ' appliquée') : 'Zone retirée');
  updateStats();
});

// Copy/Paste block
document.getElementById('btnCopyBlock').addEventListener('click', () => {
  if(selection.size === 0) return toast('Sélectionne un bloc à copier');
  let minR=ROWS, maxR=0, minC=COLS, maxC=0;
  for(const k of selection){
    const r = Math.floor(k / COLS);
    const c = k % COLS;
    minR = Math.min(minR,r); maxR = Math.max(maxR,r);
    minC = Math.min(minC,c); maxC = Math.max(maxC,c);
  }
  const w = maxC-minC+1;
  const h = maxR-minR+1;
  const cells = [];
  for(let rr=0; rr<h; rr++){
    const row = [];
    for(let cc=0; cc<w; cc++) row.push(JSON.parse(JSON.stringify(gridData[minR+rr][minC+cc])));
    cells.push(row);
  }
  clipboard = {w,h,cells};
  toast(`Copié: ${w}×${h}`);
});

document.getElementById('btnPasteBlock').addEventListener('click', () => {
  if(!clipboard) return toast('Rien à coller');
  if(!lastSelected) return toast('Clique une case (point de collage)');
  const baseR = parseInt(lastSelected.dataset.row,10);
  const baseC = parseInt(lastSelected.dataset.col,10);
  snapshot();
  for(let rr=0; rr<clipboard.h; rr++){
    for(let cc=0; cc<clipboard.w; cc++){
      const r = baseR + rr;
      const c = baseC + cc;
      if(r<0||c<0||r>=ROWS||c>=COLS) continue;
      gridData[r][c] = JSON.parse(JSON.stringify(clipboard.cells[rr][cc]));
      if(gridData[r][c].zone === undefined) gridData[r][c].zone = '';
      applyCellVisual(gridEl.children[cellKey(r,c)], gridData[r][c]);
    }
  }
  setDirty(true);
  toast('Bloc collé');
  updateStats();
  refreshBinList();
});

// Clear
document.getElementById('btnClear').addEventListener('click', () => {
  snapshot();
  for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++) gridData[r][c] = DEFAULT_CELL();
  renderAll();
  resetBinRangeState();
  coordsEl.textContent = 'Aucune';
  selection.clear(); selBox.style.display = 'none';
  setDirty(true);
  toast('Grille vidée');
  refreshBinList();
});

// Export
function exportObj(){ return buildExportObject({ rows: ROWS, cols: COLS, data: gridData }); }

document.getElementById('btnExport').addEventListener('click', () => {
  outputEl.value = JSON.stringify(exportObj());
  outputEl.focus(); outputEl.select();
  toast('JSON exporté');
});

document.getElementById('btnCopy').addEventListener('click', async () => {
  try{
    if(!outputEl.value) document.getElementById('btnExport').click();
    await navigator.clipboard.writeText(outputEl.value);
    toast('Copié');
  }catch{ toast('Copie impossible (iOS: sélectionne puis Copie)'); }
});

document.getElementById('btnDownload').addEventListener('click', () => {
  const json = outputEl.value || JSON.stringify(exportObj());
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'dl-layout-v9.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Téléchargement lancé');
});

// Export PNG
function exportPngBlob(){
  const size = 18;
  const w = COLS * size;
  const h = ROWS * size;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,w,h);

  // grid
  ctx.strokeStyle = 'rgba(148,163,184,0.22)';
  ctx.lineWidth = 1;
  for(let x=0; x<=w; x+=size){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for(let y=0; y<=h; y+=size){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  function fillCell(r,c,fill){
    ctx.fillStyle = fill;
    ctx.fillRect(c*size+1, r*size+1, size-1, size-1);
  }

  const zmap = {A:'rgba(26,99,255,0.18)',B:'rgba(18,183,106,0.18)',C:'rgba(245,158,11,0.22)',D:'rgba(255,77,79,0.16)'};

  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.zone) fillCell(r,c, zmap[d.zone] || 'rgba(26,99,255,0.12)');
    const color = typeColor(d.type);
    if(color) fillCell(r,c,color);

    if(d.label){
      ctx.font = 'bold 8px Arial';
      ctx.fillStyle = (d.type==='bin') ? '#ffffff' : '#0b1220';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.label.substring(0,6), c*size + size/2, r*size + size/2);
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

document.getElementById('btnExportPng').addEventListener('click', async () => {
  try{
    const blob = await exportPngBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dl-layout-v9.png';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('PNG exporté');
  }catch{ toast('Export PNG impossible'); }
});

// Import
const fileImport = document.getElementById('fileImport');
document.getElementById('btnImport').addEventListener('click', () => fileImport.click());
fileImport.addEventListener('change', async () => {
  const f = fileImport.files && fileImport.files[0];
  if(!f) return;
  try{
    const txt = await f.text();
    const obj = JSON.parse(txt);
    if(!obj || !obj.data || !Array.isArray(obj.data)) throw new Error('format');
    snapshot();
    for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++){
      const src = (obj.data[r] && obj.data[r][c]) ? obj.data[r][c] : null;
      gridData[r][c] = hydrateCell(src);
    }
    renderAll();
    setDirty(true);
    toast('Import OK');
    refreshBinList();
  }catch{ toast('Import impossible (JSON invalide)'); }
  finally{ fileImport.value = ''; }
});

// Local save/load

document.getElementById('btnSaveLocal').addEventListener('click', () => {
  try{ saveLayoutToStorage( JSON.stringify(exportObj())); setDirty(false); toast('Sauvegardé'); }
  catch{ toast('Sauvegarde impossible'); }
});

document.getElementById('btnLoadLocal').addEventListener('click', () => {
  const raw = loadLayoutFromStorage();
  if(!raw) return toast('Aucune sauvegarde');
  try{
    const obj = JSON.parse(raw);
    if(!obj || !obj.data) throw new Error('format');
    snapshot();
    for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++){
      const src = (obj.data[r] && obj.data[r][c]) ? obj.data[r][c] : null;
      gridData[r][c] = hydrateCell(src);
    }
    renderAll();
    setDirty(false);
    toast('Chargé');
    refreshBinList();
  }catch{ toast('Erreur de chargement'); }
});

// Undo/Redo

document.getElementById('btnUndo').addEventListener('click', undo);
document.getElementById('btnRedo').addEventListener('click', redo);

// Zoom & Fit
function changeZoom(delta){
  const root = document.documentElement;
  const current = getComputedStyle(root).getPropertyValue('--cell').trim().replace('px','');
  let size = parseInt(current || '22', 10) + delta;
  if(size < 10) size = 10; if(size > 60) size = 60;
  root.style.setProperty('--cell', size + 'px');
  drawSelection();
  toast('Zoom: ' + size + 'px');
}
document.getElementById('zoomIn').addEventListener('click', () => changeZoom(4));
document.getElementById('zoomOut').addEventListener('click', () => changeZoom(-4));

document.getElementById('btnFit').addEventListener('click', () => {
  const viewportW = document.getElementById('main').clientWidth - 24;
  const size = Math.max(10, Math.min(34, Math.floor(viewportW / COLS)));
  document.documentElement.style.setProperty('--cell', size + 'px');
  drawSelection();
  toast('Vue générale');
});

// View filters wiring
function updateViewClasses(){
  gridWrap.classList.toggle('hide-bins', fBins.checked);
  gridWrap.classList.toggle('hide-walls', fWalls.checked);
  gridWrap.classList.toggle('hide-doors', fDoors.checked);
  gridWrap.classList.toggle('hide-works', fWorks.checked);
  gridWrap.classList.toggle('hide-zones', fZones.checked);
  gridWrap.classList.toggle('xray', xray.checked);
}
[fBins,fWalls,fDoors,fWorks,fZones,xray].forEach(el => el.addEventListener('change', updateViewClasses));
updateViewClasses();

// Online status
function updateOnline(){
  const online = navigator.onLine;
  onlineBadge.textContent = online ? '✅ En ligne' : '📴 Hors ligne';
  onlineBadge.className = 'badge ' + (online ? 'ok' : 'warn');
}
window.addEventListener('online', updateOnline);
window.addEventListener('offline', updateOnline);
updateOnline();

// Search
let searchMatches = [];
let searchIndex = 0;

function normalize(s){
  return (s||'').toString().toLowerCase().replace(/\s+/g,'').trim();
}

function computeMatches(query){
  const q = normalize(query);
  const matches = [];
  if(!q) return matches;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    const hay = normalize((d.binId||'') + ' ' + (d.label||''));
    if(hay.includes(q)) matches.push({r,c});
  }
  return matches;
}

function focusCell(r,c){
  const idx = cellKey(r,c);
  const cell = gridEl.children[idx];
  if(lastSelected) lastSelected.classList.remove('highlight');
  cell.classList.add('highlight');
  lastSelected = cell;
  updateCoords(r,c);

  const main = document.getElementById('main');
  const cellSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell'));
  const targetX = c*cellSize + cellSize/2;
  const targetY = r*cellSize + cellSize/2;
  const toLeft = Math.max(0, targetX - main.clientWidth/2);
  const toTop = Math.max(0, targetY - main.clientHeight/2);
  main.scrollTo({left: toLeft, top: toTop, behavior: 'smooth'});
}

function runSearch(next=false){
  const q = searchInput.value;
  if(!next){ searchMatches = computeMatches(q); searchIndex = 0; }
  else if(searchMatches.length) searchIndex = (searchIndex + 1) % searchMatches.length;

  if(searchMatches.length === 0){ searchStatus.textContent = 'Aucun résultat'; return toast('Aucun résultat'); }

  const m = searchMatches[searchIndex];
  searchStatus.textContent = `Résultat ${searchIndex+1}/${searchMatches.length} → L${m.r+1} C${m.c+1}`;
  focusCell(m.r,m.c);
  toast('Trouvé');
}

document.getElementById('btnFind').addEventListener('click', () => runSearch(false));
document.getElementById('btnNext').addEventListener('click', () => runSearch(true));
searchInput.addEventListener('keydown', (e) => { if(e.key==='Enter') runSearch(false); });

// BIN LIST
function computeBins(){
  const map = new Map();
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.type === 'bin'){
      const id = d.binId || '(sans binId)';
      if(!map.has(id)) map.set(id, {binId:id, head:null, len:0, zone:'', labels:0});
      const b = map.get(id);
      b.len += 1;
      if(d.isHead) b.head = {r,c,label:d.label||'', direction:d.direction||null};
      if(d.zone) b.zone = d.zone;
      if(d.label) b.labels += 1;
    }
  }

  // sort
  const arr = [...map.values()];
  arr.sort((a,b) => a.binId.localeCompare(b.binId));
  return arr;
}

function refreshBinList(){
  const filter = normalize(binListFilter.value);
  const bins = computeBins().filter(b => {
    if(!filter) return true;
    return normalize(b.binId).includes(filter) || normalize(b.head?.label||'').includes(filter);
  });

  binList.innerHTML = '';
  if(bins.length === 0){
    const div = document.createElement('div');
    div.className = 'listItem';
    div.innerHTML = '<small>Aucune BIN</small>';
    binList.appendChild(div);
    return;
  }

  for(const b of bins){
    const div = document.createElement('div');
    div.className = 'listItem';
    const z = b.zone ? zoneName(b.zone) : '—';
    const headTxt = b.head ? `L${b.head.r+1} C${b.head.c+1}` : 'Head: —';
    div.innerHTML = `<div><strong>${b.binId}</strong><br><small>${headTxt} • len:${b.len} • zone:${z}</small></div><div>➡️</div>`;
    div.addEventListener('click', () => {
      closeMenu('menuBins');
      if(b.head) focusCell(b.head.r, b.head.c);
      else toast('Aucune tête détectée');
    });
    binList.appendChild(div);
  }
}

document.getElementById('btnRefreshBins').addEventListener('click', refreshBinList);
binListFilter.addEventListener('input', refreshBinList);

// CSV export
function exportCsv(){
  const bins = computeBins();
  const rows = [['binId','headRow','headCol','label','direction','length','zone']];
  for(const b of bins){
    rows.push([
      b.binId,
      b.head? (b.head.r+1) : '',
      b.head? (b.head.c+1) : '',
      b.head? b.head.label : '',
      b.head? (b.head.direction||'') : '',
      b.len,
      b.zone? zoneName(b.zone):''
    ]);
  }
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dl-bins-v9.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('CSV exporté');
}

document.getElementById('btnExportCsv').addEventListener('click', exportCsv);

// AUDIT
function runAuditReport(){
  const issues = [];
  const metrics = runAuditMetrics(gridData);

  // 1) bins without binId
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.type==='bin' && !d.binId){
      issues.push({sev:'warn', msg:`BIN sans binId à L${r+1} C${c+1}` , pos:{r,c}});
    }
  }

  // 2) per binId head checks
  const bins = new Map();
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.type==='bin' && d.binId){
      if(!bins.has(d.binId)) bins.set(d.binId, {heads:[], cells:[]});
      const b = bins.get(d.binId);
      b.cells.push({r,c,d});
      if(d.isHead) b.heads.push({r,c,d});
    }
  }

  for(const [id,b] of bins.entries()){
    if(b.heads.length === 0){
      issues.push({sev:'danger', msg:`BIN ${id} : aucune tête détectée`, pos:b.cells[0]});
    } else if(b.heads.length > 1){
      issues.push({sev:'warn', msg:`BIN ${id} : plusieurs têtes (${b.heads.length})`, pos:b.heads[0]});
    }

    const head = b.heads[0];
    if(head){
      if(!head.d.label){
        issues.push({sev:'warn', msg:`BIN ${id} : label manquant sur la tête`, pos:head});
      }

      // direction check (if wall immediately in direction)
      const dir = head.d.direction;
      if(dir){
        const delta = {right:[0,1], left:[0,-1], up:[-1,0], down:[1,0]}[dir];
        if(delta){
          const rr = head.r + delta[0];
          const cc = head.c + delta[1];
          if(rr>=0&&cc>=0&&rr<ROWS&&cc<COLS){
            const next = gridData[rr][cc];
            if(next.type === 'wall'){
              issues.push({sev:'warn', msg:`BIN ${id} : direction '${dir}' vers un mur`, pos:head});
            }
          }
        }
      }
    }
  }

  // 3) doors blocked by wall around? (simple heuristic)
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.type==='door'){
      let walls=0;
      const neigh = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(p => p[0]>=0&&p[1]>=0&&p[0]<ROWS&&p[1]<COLS);
      for(const [rr,cc] of neigh) if(gridData[rr][cc].type==='wall') walls++;
      if(walls>=3) issues.push({sev:'warn', msg:`Porte L${r+1} C${c+1} semble bloquée (3 murs)`, pos:{r,c}});
    }
  }

  // 4) zones missing (optional): cells of type bin without zone
  let binNoZone=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.type==='bin' && !d.zone) binNoZone++;
  }
  if(binNoZone>0) issues.push({sev:'warn', msg:`${binNoZone} cellules BIN sans zone`, pos:null});

  // render
  auditList.innerHTML = '';
  if(issues.length===0){
    auditSummary.textContent = '✅ Aucun problème détecté';
    auditSummary.className = 'badge ok';
    const div = document.createElement('div');
    div.className = 'listItem';
    div.innerHTML = '<small>Tout est OK</small>';
    auditList.appendChild(div);
    return {issues};
  }

  const dangerCount = issues.filter(i => i.sev==='danger').length;
  const warnCount = issues.filter(i => i.sev==='warn').length;
  auditSummary.textContent = `⚠️ Problèmes: ${dangerCount} critiques, ${warnCount} warnings • bins:${metrics.bins} • zones:${metrics.zoneCells}`;
  auditSummary.className = 'badge ' + (dangerCount? 'danger' : 'warn');

  for(const it of issues){
    const div = document.createElement('div');
    div.className = 'listItem';
    const icon = it.sev==='danger' ? '⛔' : '⚠️';
    div.innerHTML = `<div><strong>${icon} ${it.msg}</strong></div><div>➡️</div>`;
    div.addEventListener('click', () => {
      closeMenu('menuAudit');
      if(it.pos && it.pos.r!==undefined) focusCell(it.pos.r, it.pos.c);
    });
    auditList.appendChild(div);
  }

  toast('Audit terminé');
  return {issues};
}

document.getElementById('btnRunAudit').addEventListener('click', runAuditReport);

// STATS
function updateStats(){
  let bins=0, walls=0, doors=0, works=0, labeled=0;
  let zA=0,zB=0,zC=0,zD=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const d = gridData[r][c];
    if(d.type==='bin') bins++;
    if(d.type==='wall') walls++;
    if(d.type==='door') doors++;
    if(PLAN_TOOLS.has(d.type)) works++;
    if(d.label) labeled++;
    if(d.zone==='A') zA++; if(d.zone==='B') zB++; if(d.zone==='C') zC++; if(d.zone==='D') zD++;
  }
  const sel = selection.size ? ` • sel:${selection.size}` : '';
  statsEl.textContent = `BIN:${bins} Mur:${walls} Porte:${doors} Aménagements:${works} Labels:${labeled} | ${zoneName('A')}:${zA} ${zoneName('B')}:${zB} ${zoneName('C')}:${zC} ${zoneName('D')}:${zD}${sel}`;
}

// PDF Export (canvas pages -> embedded JPEG PDF)
function base64ToBytes(b64){
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  return arr;
}


function bytesToLatin1(bytes){
  // Convert Uint8Array to latin1 string in safe chunks
  let s = '';
  const CHUNK = 0x8000;
  for(let i=0;i<bytes.length;i+=CHUNK){
    const sub = bytes.subarray(i, i+CHUNK);
    s += String.fromCharCode.apply(null, sub);
  }
  return s;
}

function makePdfFromJpegs(jpegs, pageW=595.28, pageH=841.89){
  // Minimal PDF where each page is a full-page JPEG image.
  // This keeps it offline, with no external libraries.
  const parts = [];
  const offsets = {};
  let pos = 0;

  const addStr = (str) => { parts.push(str); pos += str.length; };
  const addBin = (bytes) => { parts.push(bytesToLatin1(bytes)); pos += bytes.length; };

  // Header
  addStr('%PDF-1.3\n%\xE2\xE3\xCF\xD3\n');

  const pageKids = [];
  let nextObj = 3;

  // We'll store page/content/image objects in sequential numbers
  const objType = {};   // 'text' | 'image'
  const objText = {};   // for text objects OR image header text
  const objStream = {}; // Uint8Array for image

  for(let i=0;i<jpegs.length;i++){
    const pageNum = nextObj;
    const contentNum = nextObj + 1;
    const imgNum = nextObj + 2;
    nextObj += 3;

    const img = jpegs[i];

    // Image XObject
    objType[imgNum] = 'image';
    objText[imgNum] = `${imgNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`;
    objStream[imgNum] = img.bytes;

    // Content stream draws image to full page
    const cs = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    objType[contentNum] = 'text';
    objText[contentNum] = `${contentNum} 0 obj\n<< /Length ${cs.length} >>\nstream\n${cs}endstream\nendobj\n`;

    // Page object
    objType[pageNum] = 'text';
    objText[pageNum] = `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 ${imgNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`;

    pageKids.push(`${pageNum} 0 R`);
  }

  const maxObj = nextObj - 1;

  // Catalog and Pages
  objType[1] = 'text';
  objText[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;

  objType[2] = 'text';
  objText[2] = `2 0 obj\n<< /Type /Pages /Count ${jpegs.length} /Kids [ ${pageKids.join(' ')} ] >>\nendobj\n`;

  // Write objects 1..maxObj
  for(let n=1;n<=maxObj;n++){
    if(!objType[n]){
      // Shouldn't happen, but keep numbering safe
      objType[n] = 'text';
      objText[n] = `${n} 0 obj\n<<>>\nendobj\n`;
    }

    offsets[n] = pos;

    if(objType[n] === 'image'){
      addStr(objText[n]);
      addBin(objStream[n]);
      addStr('\nendstream\nendobj\n');
    } else {
      addStr(objText[n]);
    }
  }

  // Xref
  const xrefStart = pos;
  addStr(`xref\n0 ${maxObj+1}\n`);
  addStr('0000000000 65535 f \n');
  for(let n=1;n<=maxObj;n++){
    const off = offsets[n] || 0;
    addStr(String(off).padStart(10,'0') + ' 00000 n \n');
  }

  // Trailer
  addStr(`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const pdfStr = parts.join('');
  const out = new Uint8Array(pdfStr.length);
  for(let i=0;i<pdfStr.length;i++) out[i] = pdfStr.charCodeAt(i) & 0xFF;
  return out;
}
async function canvasToJpegBytes(canvas, quality=0.92){
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const b64 = dataUrl.split(',')[1];
  const bytes = base64ToBytes(b64);
  return {bytes, w: canvas.width, h: canvas.height};
}

function drawCoverPage(){
  const c = document.createElement('canvas');
  c.width = 1240; c.height = 1754; // A4-ish
  const ctx = c.getContext('2d');

  // background
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,c.width,c.height);

  // glow
  const grad = ctx.createRadialGradient(280,220,10, 280,220,820);
  grad.addColorStop(0,'rgba(26,99,255,0.55)');
  grad.addColorStop(1,'rgba(11,18,32,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,c.width,c.height);

  // Title
  ctx.fillStyle = 'rgba(245,248,255,0.95)';
  ctx.font = '900 64px Arial';
  ctx.textBaseline = 'top';

  // Small cube left
  // We'll draw after image load.
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cubeSize = 150;
      ctx.drawImage(img, 120, 150, cubeSize, cubeSize);

      ctx.fillText('RAPPORT DE PLAN PLANCHER', 290, 162);

      ctx.font = '700 40px Arial';
      ctx.fillStyle = 'rgba(191,219,254,0.92)';
      ctx.fillText('Damour Logistique', 290, 250);

      ctx.font = '700 28px Arial';
      ctx.fillStyle = 'rgba(200,210,230,0.85)';
      ctx.fillText('SHOP Layout PRO — V9 Enterprise', 290, 310);

      const now = new Date();
      const dateStr = now.toLocaleString('fr-CA');
      ctx.font = '600 24px Arial';
      ctx.fillStyle = 'rgba(183,196,216,0.90)';
      ctx.fillText('Date : ' + dateStr, 290, 360);
      ctx.fillText('Auteur : Alexandre D\'amour', 290, 395);

      // Footer
      ctx.font = '600 18px Arial';
      ctx.fillStyle = 'rgba(183,196,216,0.70)';
      ctx.fillText('Généré par Damour Logistique — SHOP Layout PRO', 120, c.height-120);

      resolve(c);
    };
    img.src = 'branding/dl-cube-512.png';
  });
}

async function drawPlanPage(){
  const c = document.createElement('canvas');
  c.width = 1240; c.height = 1754;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0,0,c.width,c.height);

  // Title bar
  ctx.fillStyle = 'rgba(17,24,39,0.95)';
  ctx.fillRect(80,80, c.width-160, 90);
  ctx.strokeStyle = 'rgba(0,180,255,0.25)';
  ctx.strokeRect(80,80,c.width-160,90);
  ctx.fillStyle = 'rgba(245,248,255,0.95)';
  ctx.font = '900 34px Arial';
  ctx.fillText('Plan — Damour Logistique', 110, 110);

  // Render plan into a smaller canvas then scale
  const cell = 20;
  const planW = COLS*cell;
  const planH = ROWS*cell;
  const p = document.createElement('canvas');
  p.width = planW; p.height = planH;
  const pctx = p.getContext('2d');
  pctx.fillStyle = '#0b1220';
  pctx.fillRect(0,0,planW,planH);

  // grid lines
  pctx.strokeStyle = 'rgba(148,163,184,0.22)';
  pctx.lineWidth = 1;
  for(let x=0; x<=planW; x+=cell){ pctx.beginPath(); pctx.moveTo(x,0); pctx.lineTo(x,planH); pctx.stroke(); }
  for(let y=0; y<=planH; y+=cell){ pctx.beginPath(); pctx.moveTo(0,y); pctx.lineTo(planW,y); pctx.stroke(); }

  const zmap = {A:'rgba(26,99,255,0.18)',B:'rgba(18,183,106,0.18)',C:'rgba(245,158,11,0.22)',D:'rgba(255,77,79,0.16)'};
  function fillCell(r,c,fill){ pctx.fillStyle = fill; pctx.fillRect(c*cell+1, r*cell+1, cell-1, cell-1); }

  for(let r=0;r<ROWS;r++) for(let c0=0;c0<COLS;c0++){
    const d = gridData[r][c0];
    if(d.zone) fillCell(r,c0, zmap[d.zone] || 'rgba(26,99,255,0.12)');
    const color = typeColor(d.type);
    if(color) fillCell(r,c0,color);

    if(d.isHead && d.label){
      pctx.font = 'bold 10px Arial';
      pctx.fillStyle = '#ffffff';
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText(d.label.substring(0,8), c0*cell + cell/2, r*cell + cell/2);
    }
  }

  // Scale to fit page
  const maxW = c.width - 160;
  const maxH = c.height - 320;
  const scale = Math.min(maxW/planW, maxH/planH);
  const drawW = planW*scale;
  const drawH = planH*scale;
  const x = (c.width - drawW)/2;
  const y = 210;

  ctx.drawImage(p, x, y, drawW, drawH);

  // Footer
  ctx.fillStyle = 'rgba(183,196,216,0.75)';
  ctx.font = '600 18px Arial';
  ctx.fillText('Légende et audit sur les pages suivantes', 110, c.height-110);

  return c;
}

function drawLegendPage(){
  const c = document.createElement('canvas');
  c.width = 1240; c.height = 1754;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,c.width,c.height);

  ctx.fillStyle = 'rgba(245,248,255,0.95)';
  ctx.font = '900 46px Arial';
  ctx.fillText('Légende', 110, 110);

  const items = [
    {name:'BIN', color:'#111827'},
    {name:'Mur', color:'#6b7280'},
    {name:'Porte', color:'#12b76a'},
    {name:'Poste', color:'#f59e0b'},
    {name:zoneName('A'), color:'rgba(26,99,255,0.45)'},
    {name:zoneName('B'), color:'rgba(18,183,106,0.45)'},
    {name:zoneName('C'), color:'rgba(245,158,11,0.55)'},
    {name:zoneName('D'), color:'rgba(255,77,79,0.45)'}
  ];

  let y = 200;
  ctx.font = '700 28px Arial';
  for(const it of items){
    ctx.fillStyle = it.color;
    ctx.fillRect(110, y, 42, 42);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(110, y, 42, 42);
    ctx.fillStyle = 'rgba(245,248,255,0.90)';
    ctx.fillText(it.name, 170, y+6);
    y += 70;
  }

  ctx.fillStyle = 'rgba(183,196,216,0.85)';
  ctx.font = '600 22px Arial';
  ctx.fillText('Note: les labels affichés sur le plan PDF sont ceux des têtes de BIN.', 110, y+50);
  ctx.fillText('Astuce: utilise “BIN+” pour créer des rangées avec direction + profondeur.', 110, y+90);

  return c;
}

function drawBinListPage(auditIssues){
  const c = document.createElement('canvas');
  c.width = 1240; c.height = 1754;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,c.width,c.height);

  ctx.fillStyle = 'rgba(245,248,255,0.95)';
  ctx.font = '900 46px Arial';
  ctx.fillText('Liste des BIN', 110, 110);

  const bins = computeBins();
  ctx.font = '700 20px Arial';
  ctx.fillStyle = 'rgba(183,196,216,0.92)';
  ctx.fillText(`Total BIN (groupées): ${bins.length}`, 110, 170);

  // table header
  let y = 220;
  ctx.fillStyle = 'rgba(17,24,39,0.95)';
  ctx.fillRect(110, y, 1020, 40);
  ctx.strokeStyle = 'rgba(0,180,255,0.20)';
  ctx.strokeRect(110, y, 1020, 40);
  ctx.fillStyle = 'rgba(245,248,255,0.95)';
  ctx.font = '800 18px Arial';
  ctx.fillText('binId', 130, y+12);
  ctx.fillText('Head (L,C)', 420, y+12);
  ctx.fillText('Len', 620, y+12);
  ctx.fillText('Zone', 720, y+12);
  ctx.fillText('Label', 930, y+12);
  y += 50;

  ctx.font = '700 16px Arial';
  for(let i=0;i<bins.length;i++){
    if(y > c.height - 160) break; // keep 1 page
    const b = bins[i];
    const head = b.head ? `L${b.head.r+1},C${b.head.c+1}` : '—';
    const zone = b.zone ? zoneName(b.zone) : '—';
    ctx.fillStyle = (i%2===0) ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(110, y-6, 1020, 30);
    ctx.fillStyle = 'rgba(245,248,255,0.88)';
    ctx.fillText(b.binId, 130, y+12);
    ctx.fillStyle = 'rgba(183,196,216,0.92)';
    ctx.fillText(head, 420, y+12);
    ctx.fillText(String(b.len), 620, y+12);
    ctx.fillText(zone, 720, y+12);
    ctx.fillText(b.head?.label||'', 930, y+12);
    y += 30;
  }

  // footer note
  ctx.fillStyle = 'rgba(183,196,216,0.75)';
  ctx.font = '600 18px Arial';
  ctx.fillText('Note: si la liste est longue, utilise l’export CSV dans l’application.', 110, c.height-110);

  return c;
}

function drawAuditPage(issues){
  const c = document.createElement('canvas');
  c.width = 1240; c.height = 1754;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,c.width,c.height);

  ctx.fillStyle = 'rgba(245,248,255,0.95)';
  ctx.font = '900 46px Arial';
  ctx.fillText('Audit', 110, 110);

  const danger = issues.filter(i => i.sev==='danger').length;
  const warn = issues.filter(i => i.sev==='warn').length;
  ctx.font = '700 22px Arial';
  ctx.fillStyle = 'rgba(183,196,216,0.92)';
  ctx.fillText(`Résumé: ${danger} critiques, ${warn} warnings`, 110, 170);

  let y = 230;
  ctx.font = '700 18px Arial';
  for(let i=0;i<issues.length;i++){
    if(y > c.height - 160) break;
    const it = issues[i];
    const icon = it.sev==='danger' ? '⛔' : '⚠️';
    ctx.fillStyle = it.sev==='danger' ? 'rgba(255,77,79,0.18)' : 'rgba(245,158,11,0.14)';
    ctx.fillRect(110, y-18, 1020, 34);
    ctx.fillStyle = 'rgba(245,248,255,0.90)';
    ctx.fillText(`${icon} ${it.msg}`, 130, y);
    y += 40;
  }

  ctx.fillStyle = 'rgba(183,196,216,0.75)';
  ctx.font = '600 18px Arial';
  ctx.fillText('Astuce: corrige les erreurs critiques avant diffusion du plan.', 110, c.height-110);

  return c;
}

async function exportPdfPro(){
  toast('Préparation du PDF…');

  // ensure audit up to date
  const audit = runAuditReport();
  const cover = await drawCoverPage();
  const plan = await drawPlanPage();
  const legend = drawLegendPage();
  const bins = drawBinListPage(audit.issues);
  const auditPage = drawAuditPage(audit.issues);

  const pages = [cover, plan, legend, bins, auditPage];
  const jpegs = [];
  for(const p of pages){
    jpegs.push(await canvasToJpegBytes(p, 0.92));
  }

  // Build PDF bytes
  const pdfBytes = makePdfFromJpegs(jpegs);
  const blob = new Blob([pdfBytes], {type:'application/pdf'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Rapport-de-plan-plancher-Damour-Logistique.pdf';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('PDF exporté');
}

document.getElementById('btnExportPdf').addEventListener('click', exportPdfPro);

// Install prompt
let deferredPrompt = null;
const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  toast('Installation dispo: clique "Installer"');
});
btnInstall.addEventListener('click', async () => {
  if(!deferredPrompt){ toast('iPhone: Safari → Partager → Sur l\'écran d\'accueil'); return; }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
});

// Service Worker
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('SW OK'))
      .catch(err => console.warn('SW fail', err));
  });
}

// Help

document.getElementById('btnHelp').addEventListener('click', () => {
  alert(
    'Damour Logistique — SHOP Layout PRO V9\n\n' +
    '• Outils: BIN+, BIN, Texte, Mur, Porte, Poste, Vide\n' +
    '• Sélection rectangle: active puis glisse\n' +
    '• Copier/Coller: copier un bloc, cliquer une case, coller\n' +
    '• Zones: applique A/B/C/D + noms personnalisés\n' +
    '• BIN: liste + export CSV\n' +
    '• Audit: détecte problèmes et centre la vue\n' +
    '• Export PDF Pro: 5 pages (couverture/plan/légende/BIN/audit)\n\n' +
    'Important PWA iPhone: il faut une URL HTTPS (pas file://)\n'
  );
});

// Stats init
function updateStatsInit(){ updateStats(); }

// Actions bindings

document.getElementById('btnFit').click;


// ===== BIN Wizard logic =====
const bw = {};

function populateBinModelSelect(){
  const typeEl = document.getElementById('bwType');
  if(!typeEl) return;
  const selected = normalizeType(typeEl.value || 'P7');
  typeEl.innerHTML = '';

  const byCategory = new Map();
  for(const model of listBinModels()){
    const key = model.category || 'Autres';
    if(!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(model);
  }

  for(const [category, models] of byCategory.entries()){
    const group = document.createElement('optgroup');
    group.label = category;
    for(const model of models){
      const option = document.createElement('option');
      option.value = model.code;
      option.textContent = `${model.code} — ${model.label}`;
      group.appendChild(option);
    }
    typeEl.appendChild(group);
  }

  typeEl.value = selected;
}

function filterBinModelSelect(term){
  const typeEl = document.getElementById('bwType');
  if(!typeEl) return;
  const q = String(term || '').trim().toUpperCase();
  for(const option of typeEl.querySelectorAll('option')){
    const hay = `${option.value} ${option.textContent}`.toUpperCase();
    option.hidden = !!q && !hay.includes(q);
  }
}
function bwInit(){
  bw.el = document.getElementById('binWizard');
  bw.stepEl = document.getElementById('bwStep');
  bw.msgEl = document.getElementById('bwMsg');
  bw.subEl = document.getElementById('bwSub');
  bw.barEl = document.getElementById('bwBar');
  bw.formEl = document.getElementById('bwForm');
  bw.computedEl = document.getElementById('bwComputed');
  bw.zoneAbsEl = document.getElementById('bwZoneAbs');
  bw.aisleEl = document.getElementById('bwAisle');
  bw.slotEl = document.getElementById('bwSlot');
  bw.suffixEl = document.getElementById('bwSuffix');
  bw.typeEl = document.getElementById('bwType');
  bw.modelInfoEl = document.getElementById('bwModelInfo');
  bw.typeSearchEl = document.getElementById('bwTypeSearch');
  bw.validateBtn = document.getElementById('bwValidate');
  bw.resetBtn = document.getElementById('bwReset');
  bw.hideBtn = document.getElementById('bwHide');

  bw.resetBtn?.addEventListener('click', () => { resetBinRangeState(); clearBinPreview(); bwShow(1); });
  bw.hideBtn?.addEventListener('click', () => { bw.el.style.display = 'none'; });
  ;[bw.zoneAbsEl,bw.aisleEl,bw.slotEl,bw.suffixEl,bw.typeEl].forEach(el=>{ el?.addEventListener('input', bwRefreshComputed); el?.addEventListener('change', bwRefreshComputed); });
  bw.typeSearchEl?.addEventListener('input', () => { filterBinModelSelect(bw.typeSearchEl.value); });
  bw.validateBtn?.addEventListener('click', bwValidateAndCreate);
}

function bwShow(step){
  if(!bw.el) return;
  bw.el.style.display='block';
  const pct = {1:25,2:50,3:75,4:100}[step]||25;
  bw.barEl.style.width = pct + '%';
  if(step===1){ bw.stepEl.textContent='Étape 1/4'; bw.msgEl.textContent='Choisis la 1ère case (départ).'; bw.formEl.style.display='none'; bw.validateBtn.disabled=true; }
  if(step===2){ bw.stepEl.textContent='Étape 2/4'; bw.msgEl.textContent='Choisis la 2e case (même ligne/colonne).'; bw.formEl.style.display='none'; bw.validateBtn.disabled=true; }
  if(step===3){ bw.stepEl.textContent='Étape 3/4'; bw.msgEl.textContent='Clique une extrémité pour définir la TÊTE.'; bw.formEl.style.display='none'; bw.validateBtn.disabled=true; }
  if(step===4){ bw.stepEl.textContent='Étape 4/4'; bw.msgEl.textContent='Entre Zone + Allée + Emplacement (et suffixe).'; bw.formEl.style.display='block'; if(bw.typeSearchEl) bw.typeSearchEl.value=''; filterBinModelSelect(''); bwRefreshComputed(); }
}

function formatSlot2(v){
  const n = String(v||'').replace(/\D+/g,'');
  return n ? n.padStart(2,'0').slice(0,2) : '';
}

function bwFullCode(){
  const zoneAbs=(bw.zoneAbsEl.value||'').trim().toUpperCase();
  const aisle=(bw.aisleEl.value||'').trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,1);
  const slot=formatSlot2(bw.slotEl.value);
  const suffix=(bw.suffixEl.value||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,2);
  if(!zoneAbs||!aisle||!slot) return {ok:false, code:'', zoneAbs, aisle, slot, suffix};
  return {ok:true, code: zoneAbs+aisle+slot+suffix, zoneAbs, aisle, slot, suffix};
}

function normalizeType(t){
  return normalizeBinModel(t);
}

function pRangeText(p){
  return getCapacityLabel(p);
}

function bwRefreshComputed(){
  if(bw.slotEl) bw.slotEl.value = formatSlot2(bw.slotEl.value);
  if(bw.aisleEl) bw.aisleEl.value = (bw.aisleEl.value||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,1);

  const info=bwFullCode();
  const count=(binRangeState.cells && binRangeState.cells.length) ? binRangeState.cells.length : 0;
  const ft=(count*CELL_FEET).toFixed(2);

  if(info.ok){
    const base = info.zoneAbs + info.aisle + info.slot;
    const sug = normalizeType(LOCATION_TYPE_MAP[base]);
    if(sug) bw.typeEl.value = sug;
  }

  const t=normalizeType(bw.typeEl.value);
  const pr = pRangeText(t);
  const modelMeta = getBinModelMeta(t);

  bw.computedEl.textContent = `Code: ${info.ok?info.code:'(incomplet)'} • Cases: ${count} (50" x 50", ≈ ${ft} pieds) • Type: ${t} ${pr?('('+pr+')'):''}`;
  if(bw.modelInfoEl){
    bw.modelInfoEl.textContent = modelMeta
      ? `Modèle ${modelMeta.code} · ${modelMeta.label}${modelMeta.category ? ` · ${modelMeta.category}` : ''}`
      : `Modèle personnalisé · ${t}`;
  }
  bw.validateBtn.disabled = !(info.ok && binRangeState.head && count>=2);
}

function clearBinPreview(){
  for(const el of gridEl.children){ el.classList.remove('bin-start','bin-available','bin-end'); }
}
function markStartCell(r,c){ clearBinPreview(); gridEl.children[cellKey(r,c)]?.classList.add('bin-start'); }
function markAvailableFromStart(start){
  clearBinPreview();
  gridEl.children[cellKey(start.row,start.col)]?.classList.add('bin-start');
  const r=start.row, c=start.col;
  for(let d=1; d<MAX_BIN_CELLS; d++){
    if(c+d<COLS) gridEl.children[cellKey(r,c+d)]?.classList.add('bin-available');
    if(c-d>=0)  gridEl.children[cellKey(r,c-d)]?.classList.add('bin-available');
    if(r+d<ROWS) gridEl.children[cellKey(r+d,c)]?.classList.add('bin-available');
    if(r-d>=0)  gridEl.children[cellKey(r-d,c)]?.classList.add('bin-available');
  }
}
function markLineCells(cells){
  for(const p of cells){ gridEl.children[cellKey(p.row,p.col)]?.classList.add('bin-available'); }
  if(cells.length){
    const a=cells[0], b=cells[cells.length-1];
    gridEl.children[cellKey(a.row,a.col)]?.classList.add('bin-end');
    gridEl.children[cellKey(b.row,b.col)]?.classList.add('bin-end');
  }
}

function bwValidateAndCreate(){
  const info=bwFullCode();
  if(!info.ok) return toast('Zone/Allée/Emplacement incomplet');
  if(!binRangeState.cells || !binRangeState.head) return toast('BIN incomplète');
  const type = normalizeType(bw.typeEl.value);

  let ordered=[...binRangeState.cells];
  const head=binRangeState.head;
  const hi=ordered.findIndex(p=>p.row===head.row && p.col===head.col);
  if(hi<0) return toast('Erreur tête');
  if(hi!==0) ordered = ordered.slice(hi).concat(ordered.slice(0,hi));

  let direction=null;
  if(ordered.length>1){
    const next=ordered[1];
    if(next.row===head.row) direction = (next.col>head.col)?'right':'left';
    else direction = (next.row>head.row)?'down':'up';
  }

  for(let i=0;i<ordered.length;i++){
    const pos=ordered[i];
    const d=gridData[pos.row][pos.col];
    d.type='bin';
    d.binId=info.code;
    d.depth=i;
    d.isHead=(i===0);
    d.direction=direction;
    d.label=(i===0) ? (info.slot + (info.suffix||'')) : '';
    d.pIndex=i+1;
    d.pCount=ordered.length;
    d.pType=type;
    d.sizeFraction=1;
    applyCellVisual(gridEl.children[cellKey(pos.row,pos.col)], d);
  }

  toast('BIN créée: ' + info.code + ' • ' + type + ' • cases:' + ordered.length);
  clearBinPreview();
  resetBinRangeState();
  bwShow(1);
  setDirty(true);
  refreshBinList();
}


// Init
createGrid();
populateBinModelSelect();
  bwInit();
  bwShow(1);
setDirty(true);
setTool('binrange');
if(navModeEl){ toast('Mode visuel ON'); }
updateStats();
refreshBinList();

// Auto load
try{
  const raw = loadLayoutFromStorage();
  if(raw){
    const obj = JSON.parse(raw);
    if(obj && obj.data){
      for(let r=0; r<ROWS; r++) for(let c=0; c<COLS; c++){
        const src = (obj.data[r] && obj.data[r][c]) ? obj.data[r][c] : null;
        gridData[r][c] = hydrateCell(src);
      }
      renderAll();
      setDirty(false);
      toast('Sauvegarde auto chargée');
    }
  }
}catch{}

