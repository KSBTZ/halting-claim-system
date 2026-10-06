// Sample list for the sign-up dropdown: replace with SIC Life's real departments.
// Values are stored in capitals to match the departments already saved on profiles.
const NAMES = [
  'Actuarial',
  'Administration',
  'Agency & Sales',
  'Audit',
  'Claims',
  'Corporate Affairs',
  'Customer Service',
  'Finance',
  'Human Resources',
  'IT',
  'Legal',
  'Marketing',
  'Operations',
  'Procurement',
  'Risk & Compliance',
  'Underwriting',
];

export const DEPARTMENT_OPTIONS = NAMES.map((name) => ({ value: name.toUpperCase(), label: name }));
