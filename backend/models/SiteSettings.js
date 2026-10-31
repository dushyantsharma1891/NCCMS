const mongoose = require('mongoose');

const leaderSchema = new mongoose.Schema(
  {
    name: String,
    photo: String,
    designation: String,
    since: Date, // "in office since" — the "post time" shown in the About page
    // Civil-service details (shown as an "IAS" badge on the About page)
    service: String, // e.g. 'IAS'
    batch: String, // e.g. '1987 batch'
    cadre: String, // e.g. 'Tamil Nadu'
    about: String, // one-line description of the role
    rank: Number, // position in the ranking order (lower = higher rank)
  },
  { _id: false }
);

// A single document (there is only ever one) holding platform-wide, non
// department-specific configuration: the national leadership shown on the
// About page, and the emblem/logo used to auto-brand departments (Ashoka
// Emblem for Central Government departments, each state's own emblem for
// State Government departments) unless a department has its own custom logo.
const siteSettingsSchema = new mongoose.Schema(
  {
    president: { type: leaderSchema, default: () => ({}) },
    primeMinister: { type: leaderSchema, default: () => ({}) },
    // Head of the civil services — an IAS officer, like in the real system.
    cabinetSecretary: { type: leaderSchema, default: () => ({}) },
    // Further senior officials (e.g. Home Secretary), shown in rank order.
    officials: { type: [leaderSchema], default: () => [] },
    centralEmblem: { type: String, default: '' },
    stateEmblems: { type: Map, of: String, default: () => ({}) },
  },
  { timestamps: true }
);

// Real office-holders, used when nothing has been configured yet. The Super
// Admin can change every one of them in Settings; anything typed in by an
// admin is never overwritten (only blanks and old "(Demo)" placeholders are).
const isPlaceholder = (l) => !l || !l.name || /\(Demo\)/i.test(l.name);
siteSettingsSchema.statics.applyLeadershipDefaults = function (doc) {
  let changed = false;
  if (isPlaceholder(doc.president)) {
    doc.president = { name: 'Droupadi Murmu', designation: 'President of India', since: new Date('2022-07-25'), about: 'Head of State and Supreme Commander of the Armed Forces' };
    changed = true;
  }
  if (isPlaceholder(doc.primeMinister)) {
    doc.primeMinister = { name: 'Narendra Modi', designation: 'Prime Minister of India', since: new Date('2014-05-26'), about: 'Head of Government, chairs the Union Cabinet' };
    changed = true;
  }
  if (isPlaceholder(doc.cabinetSecretary)) {
    doc.cabinetSecretary = {
      name: 'T. V. Somanathan', designation: 'Cabinet Secretary', service: 'IAS', batch: '1987 batch', cadre: 'Tamil Nadu',
      since: new Date('2024-08-30'),
      about: 'Head of the Civil Services and of the Cabinet Secretariat — the senior-most civil servant of the Government of India',
    };
    changed = true;
  }
  if (!doc.officials || doc.officials.length === 0) {
    doc.officials = [{ name: 'Govind Mohan', designation: 'Union Home Secretary', service: 'IAS', since: new Date('2024-08-22'), rank: 4, about: 'Administrative head of the Ministry of Home Affairs — internal security and Centre-State relations' }];
    changed = true;
  }
  return changed;
};

siteSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = new this({});
  if (this.applyLeadershipDefaults(doc) || doc.isNew) await doc.save();
  return doc;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
