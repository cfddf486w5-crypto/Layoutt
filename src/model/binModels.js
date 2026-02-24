const BASE_MODELS = [
  { code: 'P1', label: 'Palette compacte', min: 1, max: 3, category: 'Palette standard' },
  { code: 'P2', label: 'Palette petite', min: 4, max: 6, category: 'Palette standard' },
  { code: 'P3', label: 'Palette moyenne', min: 7, max: 9, category: 'Palette standard' },
  { code: 'P4', label: 'Palette grande', min: 10, max: 12, category: 'Palette standard' },
  { code: 'P5', label: 'Palette XL', min: 13, max: 15, category: 'Palette standard' },
  { code: 'P6', label: 'Palette XXL', min: 16, max: 18, category: 'Palette standard' },
  { code: 'P7', label: 'Palette très grande', min: 19, max: 21, category: 'Palette standard' },
  { code: 'MAGASIN', label: 'Zone magasin', category: 'Spécial' },
  { code: 'RACKING', label: 'Zone racking', category: 'Spécial' },
  { code: 'TEMP-01', label: 'Temporaire 01', category: 'Temporaire' },
  { code: 'TEMP-02', label: 'Temporaire 02', category: 'Temporaire' },
  { code: 'TEMP-03', label: 'Temporaire 03', category: 'Temporaire' },
  { code: 'TEMP-04', label: 'Temporaire 04', category: 'Temporaire' },
  { code: 'TEMP-05', label: 'Temporaire 05', category: 'Temporaire' },
  { code: 'BULK-01', label: 'Bulk léger', category: 'Bulk' },
  { code: 'BULK-02', label: 'Bulk mixte', category: 'Bulk' },
  { code: 'BULK-03', label: 'Bulk lourd', category: 'Bulk' },
  { code: 'BULK-04', label: 'Bulk surdimensionné', category: 'Bulk' },
  { code: 'BULK-05', label: 'Bulk palettes hautes', category: 'Bulk' },
  { code: 'COLD-01', label: 'Froid positif', category: 'Température' },
  { code: 'COLD-02', label: 'Froid négatif', category: 'Température' },
  { code: 'COLD-03', label: 'Surgelé', category: 'Température' },
  { code: 'COLD-04', label: 'Réfrigéré', category: 'Température' },
  { code: 'COLD-05', label: 'Température contrôlée', category: 'Température' },
  { code: 'HAZ-01', label: 'Matière dangereuse A', category: 'Conformité' },
  { code: 'HAZ-02', label: 'Matière dangereuse B', category: 'Conformité' },
  { code: 'HAZ-03', label: 'Aérosol', category: 'Conformité' },
  { code: 'HAZ-04', label: 'Corrosif', category: 'Conformité' },
  { code: 'HAZ-05', label: 'Inflammable', category: 'Conformité' },
  { code: 'ECO-01', label: 'E-commerce petit', category: 'E-commerce' },
  { code: 'ECO-02', label: 'E-commerce moyen', category: 'E-commerce' },
  { code: 'ECO-03', label: 'E-commerce grand', category: 'E-commerce' },
  { code: 'ECO-04', label: 'Retour client', category: 'E-commerce' },
  { code: 'ECO-05', label: 'Prêt expédition', category: 'E-commerce' },
  { code: 'RET-01', label: 'Quarantaine', category: 'Retours' },
  { code: 'RET-02', label: 'Inspection', category: 'Retours' },
  { code: 'RET-03', label: 'Remise en stock', category: 'Retours' },
  { code: 'RET-04', label: 'Reconditionnement', category: 'Retours' },
  { code: 'RET-05', label: 'Rebut', category: 'Retours' },
  { code: 'LNG-01', label: 'Longueur 2m', category: 'Long' },
  { code: 'LNG-02', label: 'Longueur 3m', category: 'Long' },
  { code: 'LNG-03', label: 'Longueur 4m', category: 'Long' },
  { code: 'LNG-04', label: 'Tube / profilé', category: 'Long' },
  { code: 'LNG-05', label: 'Rouleaux', category: 'Long' },
  { code: 'IND-01', label: 'Atelier pièces', category: 'Industriel' },
  { code: 'IND-02', label: 'Maintenance', category: 'Industriel' },
  { code: 'IND-03', label: 'Outillage', category: 'Industriel' },
  { code: 'IND-04', label: 'Équipement', category: 'Industriel' },
  { code: 'IND-05', label: 'Production', category: 'Industriel' },
  { code: 'VIP-01', label: 'Priorité client', category: 'Service' },
  { code: 'MUR', label: 'Mur plein', category: 'Structure' },
  { code: 'DEMI-MUR', label: 'Demi-mur', category: 'Structure' },
  { code: 'MUR-ANGLE', label: 'Mur en angle', category: 'Structure' }
];

const modelMap = new Map(BASE_MODELS.map((model) => [model.code, model]));

const aliasMap = new Map([
  ['6 X P1', 'P1'],
  ['TEMPORAIRE 1', 'TEMP-01'],
  ['TEMPORAIRE 2', 'TEMP-02'],
  ['TEMPORAIRE 3', 'TEMP-03'],
  ['RACK', 'RACKING'],
  ['MUR PLEIN', 'MUR'],
  ['DEMI MUR', 'DEMI-MUR'],
  ['MUR EN ANGLE', 'MUR-ANGLE']
]);

export function listBinModels() {
  return BASE_MODELS;
}

export function normalizeBinModel(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return 'P7';
  if (modelMap.has(raw)) return raw;
  if (/^P[1-7]$/.test(raw)) return raw;
  if (raw.includes('RACK')) return 'RACKING';
  if (raw.includes('MAG')) return 'MAGASIN';
  if (raw.includes('ANGLE')) return 'MUR-ANGLE';
  if (raw.includes('DEMI') && raw.includes('MUR')) return 'DEMI-MUR';
  if (raw.includes('MUR')) return 'MUR';
  if (aliasMap.has(raw)) return aliasMap.get(raw);
  return raw;
}

export function getBinModelMeta(code) {
  return modelMap.get(normalizeBinModel(code)) || null;
}

export function getCapacityLabel(code) {
  const model = getBinModelMeta(code);
  if (!model || model.min === undefined || model.max === undefined) return '';
  return `${model.min}–${model.max} palettes`;
}
