const SiteSettings = require('../models/SiteSettings');
const logActivity = require('../utils/auditLog');

// @desc  Public — get national leadership (President/PM) and emblem config.
//        (plus the Cabinet Secretary and other senior IAS officials)
//        Used by the About page and by department auto-branding.
// @route GET /api/settings
const getSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSingleton();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Super Admin updates President/PM profiles and/or the Central and
//        per-state emblem URLs used to auto-brand departments.
// @route PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSingleton();
    const { president, primeMinister, cabinetSecretary, officials, centralEmblem, stateEmblems } = req.body;
    if (president) settings.president = { ...settings.president?.toObject?.(), ...president };
    if (primeMinister) settings.primeMinister = { ...settings.primeMinister?.toObject?.(), ...primeMinister };
    if (cabinetSecretary) settings.cabinetSecretary = { ...settings.cabinetSecretary?.toObject?.(), ...cabinetSecretary };
    if (Array.isArray(officials)) {
      const clean = (v) => (typeof v === 'string' ? v.trim() : v);
      settings.officials = officials
        .filter((o) => o && clean(o.name))
        .slice(0, 20)
        .map((o, i) => ({
          name: clean(o.name), designation: clean(o.designation), photo: clean(o.photo), service: clean(o.service),
          batch: clean(o.batch), cadre: clean(o.cadre), about: clean(o.about),
          since: o.since ? new Date(o.since) : undefined, rank: Number(o.rank) || i + 4,
        }));
    }
    if (centralEmblem !== undefined) settings.centralEmblem = centralEmblem;
    if (stateEmblems) {
      Object.entries(stateEmblems).forEach(([state, url]) => settings.stateEmblems.set(state, url));
    }
    await settings.save();
    await logActivity({ actor: req.user, action: 'Updated site settings', targetType: 'Other', req });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSettings, updateSettings };
