require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const SiteSettings = require('./models/SiteSettings');
const Department = require('./models/Department');
const Category = require('./models/Category');
const User = require('./models/User');

const departments = [
  // Central Government
  { name: 'Railways', type: 'Central Government' },
  { name: 'Income Tax', type: 'Central Government' },
  { name: 'Passport', type: 'Central Government' },
  { name: 'National Highway', type: 'Central Government' },
  { name: 'Defence Civil', type: 'Central Government' },
  { name: 'EPFO', type: 'Central Government' },
  { name: 'UIDAI', type: 'Central Government' },
  { name: 'GST', type: 'Central Government' },
  { name: 'Cyber Crime', type: 'Central Government' },
  { name: 'Consumer Affairs', type: 'Central Government' },
  // State Government
  {
    name: 'Police', type: 'State Government', state: 'Uttar Pradesh',
    description: 'Law and order, crime reporting and public safety for the district.',
    mission: 'To protect citizens, prevent crime, and maintain public order with integrity.',
    vision: 'A safe and secure society where every citizen feels protected.',
    keywords: ['theft', 'robbery', 'assault', 'harassment', 'crime', 'fir', 'missing person', 'accident', 'law and order', 'threat'],
    services: ['FIR registration', 'Missing person reports', 'Traffic incident support', 'Community policing'],
    complaintCategories: ['Crime', 'Traffic', 'Harassment', 'Missing Person', 'Other'],
    helpline: '100',
    email: 'police@nccms.gov.in',
    website: 'https://police.gov.in',
    officialAddress: 'District Police Headquarters, Mathura, Uttar Pradesh',
    workingHours: '24x7',
    emergencyContact: '112',
    chief: {
      name: 'Hon. Home Minister',
      designation: 'Minister of Home Affairs',
      biography: 'Oversees internal security and policing across the state.',
      message: 'Your safety is our foremost responsibility. We are committed to a responsive and accountable police force.',
    },
    departmentHead: {
      name: 'Director General of Police (Demo)',
      designation: 'DGP',
      responsibilities: 'Overall command of the state police force.',
    },
    complaintOfficerHead: {
      name: 'Inspector In-Charge (Demo)',
      designation: 'Station House Officer',
      helpline: '100',
      workingHours: '24x7',
      responsibilities: 'Handles citizen complaints registered at the local station.',
    },
  },
  { name: 'Traffic Police', type: 'State Government' },
  {
    name: 'Municipal Corporation', type: 'State Government', state: 'Uttar Pradesh',
    description: 'Civic infrastructure: roads, drainage, sanitation and waste management.',
    mission: 'To provide clean, safe and well-maintained civic infrastructure for every ward.',
    vision: 'A well-planned, clean and citizen-friendly city.',
    keywords: ['road', 'pothole', 'damaged road', 'drainage', 'waterlogging', 'garbage', 'sanitation', 'streetlight', 'encroachment', 'sewage'],
    services: ['Road repair', 'Drainage maintenance', 'Waste collection', 'Streetlight repair'],
    complaintCategories: ['Road', 'Drainage', 'Garbage', 'Streetlight', 'Encroachment', 'Other'],
    helpline: '1533',
    email: 'municipal@nccms.gov.in',
    officialAddress: 'Municipal Corporation Office, Mathura, Uttar Pradesh',
    workingHours: '9:00 AM - 5:00 PM (Mon-Sat)',
    chief: {
      name: 'Hon. Urban Development Minister',
      designation: 'Minister of Urban Development',
      message: 'We are committed to building cleaner, better-connected cities for every citizen.',
    },
    departmentHead: { name: 'Municipal Commissioner (Demo)', designation: 'Commissioner' },
    complaintOfficerHead: { name: 'Ward Complaint Officer (Demo)', designation: 'Junior Engineer', workingHours: '9 AM - 5 PM' },
  },
  {
    name: 'Electricity Board', type: 'State Government',
    description: 'Power supply, billing and electrical infrastructure maintenance.',
    keywords: ['power cut', 'no electricity', 'electricity bill', 'transformer', 'wire', 'voltage', 'meter', 'electrocut', 'streetlight'],
    services: ['New connections', 'Billing support', 'Fault repair'],
    complaintCategories: ['Electricity', 'Billing', 'Streetlight', 'Other'],
    helpline: '1912',
    email: 'electricity@nccms.gov.in',
    workingHours: '24x7 for faults, 9 AM - 5 PM for billing',
  },
  {
    name: 'Water Department', type: 'State Government',
    description: 'Drinking water supply and quality.',
    keywords: ['no water', 'water supply', 'contaminated water', 'pipeline leak', 'water quality', 'tanker'],
    services: ['Water supply', 'Pipeline repair', 'Water quality testing'],
    complaintCategories: ['Water', 'Other'],
    helpline: '1916',
  },
  {
    name: 'Public Works Department', type: 'State Government',
    description: 'Roads, bridges and government building maintenance.',
    keywords: ['road', 'bridge', 'highway', 'construction', 'building maintenance', 'pwd'],
    services: ['Road construction', 'Bridge maintenance'],
    complaintCategories: ['Road', 'Transport', 'Other'],
  },
  { name: 'Health Department', type: 'State Government', keywords: ['hospital', 'doctor', 'medicine', 'ambulance', 'health'], complaintCategories: ['Health', 'Other'] },
  { name: 'Education Department', type: 'State Government', keywords: ['school', 'college', 'teacher', 'education', 'admission'], complaintCategories: ['Education', 'Other'] },
  { name: 'Transport Department', type: 'State Government', keywords: ['bus', 'auto', 'license', 'rto', 'vehicle registration'], complaintCategories: ['Transport', 'Other'] },
  { name: 'Fire Department', type: 'State Government', keywords: ['fire', 'emergency', 'rescue'], complaintCategories: ['Emergency', 'Other'] },
  { name: 'Food Department', type: 'State Government', keywords: ['ration', 'food quality', 'adulteration'], complaintCategories: ['Consumer', 'Other'] },
  { name: 'Revenue Department', type: 'State Government', keywords: ['land record', 'property tax', 'revenue'], complaintCategories: ['Tax', 'Other'] },
  { name: 'Panchayat', type: 'State Government' },
  // Public Sector
  {
    name: 'SBI', type: 'Public Sector', sector: 'Banks',
    keywords: ['bank', 'account', 'atm', 'loan', 'sbi', 'bribe', 'manager asking for money', 'corruption'],
    complaintCategories: ['Banking', 'Corruption', 'Other'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/SBI-logo.svg',
    website: 'https://sbi.co.in',
    chief: { name: 'Chairman (Demo)', designation: 'Chairman, SBI' },
    hasMultipleOffices: true,
  },
  { name: 'PNB', type: 'Public Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'Canara Bank', type: 'Public Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'Union Bank', type: 'Public Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'Bank of Baroda', type: 'Public Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'LIC', type: 'Public Sector', sector: 'Insurance' },
  { name: 'BSNL', type: 'Public Sector', sector: 'Telecom', keywords: ['sim', 'network', 'telecom', 'mobile', 'bsnl'], complaintCategories: ['Telecom', 'Other'], hasMultipleOffices: true },
  { name: 'Indian Oil', type: 'Public Sector' },
  { name: 'HPCL', type: 'Public Sector' },
  { name: 'ONGC', type: 'Public Sector' },
  // Private Sector
  { name: 'HDFC', type: 'Private Sector', sector: 'Banks', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/HDFC_Bank_Logo.svg', website: 'https://hdfcbank.com', chief: { name: 'MD & CEO (Demo)', designation: 'Managing Director & CEO' }, hasMultipleOffices: true },
  { name: 'ICICI', type: 'Private Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'Axis', type: 'Private Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'Kotak', type: 'Private Sector', sector: 'Banks', hasMultipleOffices: true },
  { name: 'Airtel', type: 'Private Sector', sector: 'Telecom', hasMultipleOffices: true },
  { name: 'Jio', type: 'Private Sector', sector: 'Telecom', hasMultipleOffices: true },
  { name: 'Vi', type: 'Private Sector', sector: 'Telecom', hasMultipleOffices: true },
  { name: 'Amazon', type: 'Private Sector', sector: 'E-commerce' },
  { name: 'Flipkart', type: 'Private Sector', sector: 'E-commerce' },
  { name: 'PhonePe', type: 'Private Sector', sector: 'Payment' },
  { name: 'Paytm', type: 'Private Sector', sector: 'Payment' },
  { name: 'Google Pay', type: 'Private Sector', sector: 'Payment' },
  { name: 'ICICI Lombard', type: 'Private Sector', sector: 'Insurance' },
  { name: 'HDFC ERGO', type: 'Private Sector', sector: 'Insurance' },
  { name: 'Hospital', type: 'Private Sector', sector: 'Business' },
  { name: 'School', type: 'Private Sector', sector: 'Business' },
  { name: 'College', type: 'Private Sector', sector: 'Business' },
  { name: 'Hotel', type: 'Private Sector', sector: 'Business' },
  { name: 'Mall', type: 'Private Sector', sector: 'Business' },
  { name: 'Company', type: 'Private Sector', sector: 'Business' },
  { name: 'Factory', type: 'Private Sector', sector: 'Business' },
];

const categories = [
  'Road', 'Water', 'Electricity', 'Drainage', 'Crime', 'Cyber Crime', 'Fraud',
  'Corruption', 'Passport', 'Income Tax', 'Bank', 'Banking', 'Insurance', 'Hospital', 'Health',
  'Education', 'Pollution', 'Environment', 'Garbage', 'Traffic', 'Noise', 'Consumer', 'Gas',
  'Railway', 'Metro', 'Airport', 'Telecom', 'Sanitation', 'Transport', 'Streetlight',
  'Encroachment', 'Emergency', 'Missing Person', 'Harassment', 'Tax', 'Billing', 'Other',
];

// Seeds reference data (departments, categories, leadership) and the Super
// Admin. Safe to run repeatedly. Used by `npm run seed` AND by the server on
// first start when AUTO_SEED=true (so a fresh Render + Atlas deployment gets
// its Super Admin without needing a shell).
//   demo: also create the demo Admin / Officers / Citizen. These have KNOWN
//         passwords, so they are for local development only — never on a
//         public deployment.
const seedDatabase = async ({ demo = true, superAdminEmail = 'superadmin@nccms.gov.in', superAdminPassword = 'SuperAdmin@123' } = {}) => {
  const result = { createdSuperAdmin: false };
  console.log('Seeding departments...');
  for (const d of departments) {
    await Department.findOneAndUpdate({ name: d.name }, d, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  console.log('Seeding categories...');
  for (const c of categories) {
    await Category.findOneAndUpdate({ name: c }, { name: c }, { upsert: true, new: true });
  }

  console.log('Checking for legacy role values...');
  // Bug fix: an account can end up with a role value that doesn't match the
  // current enum (e.g. 'superadmin' instead of 'super_admin') if it was
  // created by an older version of this app, or edited by hand. Mongoose
  // only validates on write, so a stale value like this reads back fine but
  // then fails every role check in the app (including login). Normalize it
  // here rather than leaving it to silently break things later, and rather
  // than crashing this script with a duplicate-email error when we then try
  // to create a "new" Super Admin at the same address.
  const legacyRoleFix = await User.collection.updateMany(
    { role: { $in: ['superadmin', 'super-admin', 'SuperAdmin', 'Super Admin'] } },
    { $set: { role: 'super_admin' } }
  );
  if (legacyRoleFix.modifiedCount) {
    console.log(`Fixed ${legacyRoleFix.modifiedCount} account(s) with a legacy Super Admin role value -> 'super_admin'.`);
  }

  console.log('Seeding Super Admin...');
  const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
  if (!existingSuperAdmin) {
    await User.create({
      name: 'National System Super Admin',
      email: String(superAdminEmail).trim().toLowerCase(),
      password: superAdminPassword,
      role: 'super_admin',
    });
    result.createdSuperAdmin = true;
    console.log(demo
      ? `Created Super Admin -> email: ${superAdminEmail} / password: ${superAdminPassword}`
      : `Created Super Admin -> email: ${superAdminEmail} (password taken from SUPER_ADMIN_PASSWORD)`);
  } else {
    console.log('A Super Admin already exists (only one allowed), skipping.');
  }
  const superAdmin = existingSuperAdmin || (await User.findOne({ role: 'super_admin' }));

  if (demo) {
    console.log('Seeding a demo Admin (ADM-0001)...');
    const adminEmail = 'admin@nccms.gov.in';
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await User.create({
        name: 'Demo Admin',
        email: adminEmail,
        password: 'Admin@123',
        role: 'admin',
        adminId: 'ADM-0001',
        createdBy: superAdmin?._id,
      });
      console.log(`Created demo admin -> email: ${adminEmail} / password: Admin@123`);
    } else {
      console.log('Demo admin already exists, skipping.');
    }

    console.log('Seeding a sample officer (Police department)...');
    const policeDept = await Department.findOne({ name: 'Police' });
    const officerEmail = 'officer.police@nccms.gov.in';
    const existingOfficer = await User.findOne({ email: officerEmail });
    if (!existingOfficer && policeDept) {
      await User.create({
        name: 'Police Officer Demo',
        email: officerEmail,
        password: 'Officer@123',
        role: 'officer',
        department: policeDept._id,
        employeeId: 'POL-0001',
        approvalStatus: 'approved',
        isActive: true,
        state: 'Uttar Pradesh',
        district: 'Mathura',
        createdBy: existingAdmin?._id,
      });
      console.log(`Created demo officer -> email: ${officerEmail} / password: Officer@123`);
    } else {
      console.log('Demo officer already exists or Police dept missing, skipping.');
    }

    console.log('Seeding a second demo officer (Municipal Corporation)...');
    const municipalDept = await Department.findOne({ name: 'Municipal Corporation' });
    const officer2Email = 'officer.municipal@nccms.gov.in';
    const existingOfficer2 = await User.findOne({ email: officer2Email });
    if (!existingOfficer2 && municipalDept) {
      await User.create({
        name: 'Municipal Officer Demo',
        email: officer2Email,
        password: 'Officer@123',
        role: 'officer',
        department: municipalDept._id,
        employeeId: 'MUN-0001',
        approvalStatus: 'approved',
        isActive: true,
        state: 'Uttar Pradesh',
        district: 'Mathura',
        scopeState: 'Uttar Pradesh',
        scopeDistrict: 'Mathura', // demonstrates a district-scoped officer — only sees Mathura complaints
        createdBy: existingAdmin?._id,
      });
      console.log(`Created demo officer -> email: ${officer2Email} / password: Officer@123`);
    } else {
      console.log('Second demo officer already exists or Municipal dept missing, skipping.');
    }

    console.log('Seeding a demo citizen...');
    const citizenEmail = 'citizen.demo@nccms.gov.in';
    const existingCitizen = await User.findOne({ email: citizenEmail });
    if (!existingCitizen) {
      await User.create({
        name: 'Demo Citizen',
        email: citizenEmail,
        password: 'Citizen@123',
        role: 'citizen',
        citizenId: 'CIT-000001',
        state: 'Uttar Pradesh',
        district: 'Mathura',
        address: 'Sample Address, Mathura',
        pincode: '281001',
      });
      console.log(`Created demo citizen -> email: ${citizenEmail} / password: Citizen@123`);
    } else {
      console.log('Demo citizen already exists, skipping.');
    }
  } else {
    console.log('Skipping demo accounts (production mode).');
  }

  console.log('Seeding site settings (national leadership + emblems)...');
  const settings = await SiteSettings.getSingleton();
  // President, Prime Minister, Cabinet Secretary (IAS) and other senior officials.
  SiteSettings.applyLeadershipDefaults(settings);
  if (!settings.centralEmblem) {
    settings.centralEmblem = 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Emblem_of_India.svg';
  }
  await settings.save();
  console.log('Site settings ready. Super Admin can edit leadership photos/dates and per-state emblems from Settings.');

  console.log('Seed complete.');
  return result;
};

module.exports = { seedDatabase };

// `npm run seed` — local / one-off use.
if (require.main === module) {
  (async () => {
    await connectDB();
    const production = process.env.NODE_ENV === 'production';
    const demo = production ? process.env.SEED_DEMO_DATA === 'true' : process.env.SEED_DEMO_DATA !== 'false';
    const opts = { demo };
    if (!demo) {
      if (!process.env.SUPER_ADMIN_PASSWORD) throw new Error('Set SUPER_ADMIN_PASSWORD (and optionally SUPER_ADMIN_EMAIL) before seeding a production database.');
      opts.superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@nccms.gov.in';
      opts.superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    }
    await seedDatabase(opts);
    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
