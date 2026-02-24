const DEFAULT_CASE_TYPE = {
  icon: 'ic_default',
  colorTag: 'neutral',
  layer: 'base',
  zIndex: 50,
  walkable: true,
  blocksMovement: false,
  selectable: true,
  draggable: true,
  snapToGrid: true
};

const CATEGORY_RULES = [
  { matcher: (id) => id.startsWith('wall_') || id === 'pillar_column' || id === 'guard_rail' || id === 'curb_barrier' || id === 'window_opening' || id === 'floor_hole', category: 'structure', layer: 'base', zIndex: 90, walkable: false, blocksMovement: true, colorTag: 'neutral' },
  { matcher: (id) => id.startsWith('door_') || id === 'gate_cage' || id === 'curtain_strip' || id === 'dock_door' || id === 'turnstile', category: 'access', layer: 'base', zIndex: 88, walkable: true, blocksMovement: false, colorTag: 'info' },
  { matcher: (id) => id === 'aisle_walkway' || id === 'aisle_forklift' || id.startsWith('oneway_') || id === 'crosswalk' || id === 'stop_sign' || id === 'no_entry' || id === 'hazard_zone', category: 'safety', layer: 'overlay', zIndex: 45, walkable: true, blocksMovement: false, colorTag: 'danger' },
  { matcher: (id) => id.startsWith('rack_') || id === 'shelving' || id === 'mezzanine' || id === 'floor_stack' || id === 'empty_pallet_area' || id === 'tote_area' || id === 'cage_storage', category: 'storage', layer: 'base', zIndex: 82, walkable: false, blocksMovement: true, colorTag: 'neutral' },
  { matcher: (id) => id.startsWith('bin_') || id === 'reception_staging', category: 'wms', layer: 'base', zIndex: 82, walkable: false, blocksMovement: true, colorTag: 'info' },
  { matcher: (id) => id.startsWith('zone_'), category: 'zone', layer: 'base', zIndex: 25, walkable: true, blocksMovement: false, colorTag: 'zone' },
  { matcher: (id) => id === 'dock_platform' || id === 'dock_leveler' || id === 'ramp' || id.startsWith('conveyor_') || id === 'lift_table' || id === 'wrap_station' || id === 'scale_station' || id === 'printer_station' || id === 'battery_charging', category: 'equipment', layer: 'base', zIndex: 55, walkable: true, blocksMovement: false, colorTag: 'info' },
  { matcher: (id) => id === 'office' || id === 'customer_counter' || id === 'toilet' || id === 'cafeteria' || id === 'locker_room' || id === 'electrical_room' || id === 'it_closet', category: 'service', layer: 'base', zIndex: 40, walkable: true, blocksMovement: false, colorTag: 'info' },
  { matcher: (id) => id === 'label_text' || id === 'marker_entry' || id === 'marker_exit' || id === 'marker_measure', category: 'annotation', layer: 'annotation', zIndex: 95, walkable: true, blocksMovement: false, colorTag: 'info' }
];

function normalizeExportCode(id) {
  return String(id || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase() || 'UNKNOWN';
}

function pickRule(id) {
  return CATEGORY_RULES.find((rule) => rule.matcher(id));
}

export function createCaseTypeDefinition(id, label, overrides = {}) {
  const rule = pickRule(id) || {};
  return {
    id,
    label,
    category: rule.category || 'annotation',
    icon: overrides.icon || `ic_${id.replace(/[^a-z0-9]+/gi, '_')}`,
    colorTag: overrides.colorTag || rule.colorTag || DEFAULT_CASE_TYPE.colorTag,
    layer: overrides.layer || rule.layer || DEFAULT_CASE_TYPE.layer,
    zIndex: overrides.zIndex ?? rule.zIndex ?? DEFAULT_CASE_TYPE.zIndex,
    walkable: overrides.walkable ?? rule.walkable ?? DEFAULT_CASE_TYPE.walkable,
    blocksMovement: overrides.blocksMovement ?? rule.blocksMovement ?? DEFAULT_CASE_TYPE.blocksMovement,
    selectable: overrides.selectable ?? DEFAULT_CASE_TYPE.selectable,
    draggable: overrides.draggable ?? DEFAULT_CASE_TYPE.draggable,
    snapToGrid: overrides.snapToGrid ?? DEFAULT_CASE_TYPE.snapToGrid,
    exportCode: overrides.exportCode || normalizeExportCode(id)
  };
}

export function buildCaseTypeCatalog(customToolButtons = []) {
  const catalog = new Map();
  const base = [
    createCaseTypeDefinition('empty', 'Case vide', { category: 'annotation', layer: 'base', zIndex: 0, walkable: true, blocksMovement: false, icon: 'ic_empty', exportCode: 'EMPTY' }),
    createCaseTypeDefinition('bin', 'BIN', { category: 'storage', layer: 'base', zIndex: 70, walkable: false, blocksMovement: true, icon: 'ic_bin', exportCode: 'BIN' }),
    createCaseTypeDefinition('label', 'Texte', { category: 'annotation', layer: 'annotation', zIndex: 42, walkable: true, blocksMovement: false, icon: 'ic_label', exportCode: 'LABEL' })
  ];

  base.forEach((entry) => catalog.set(entry.id, entry));
  customToolButtons.forEach(([id, label]) => {
    if (!catalog.has(id)) catalog.set(id, createCaseTypeDefinition(id, label));
  });

  return catalog;
}

export function getCaseType(catalog, id) {
  return catalog.get(id) || catalog.get('empty');
}
