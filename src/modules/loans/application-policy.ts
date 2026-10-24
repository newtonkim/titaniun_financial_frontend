export const applicationSteps = ['Applicant', 'Loan & costs', 'Security', 'Declaration', 'Review'] as const
export const documentCategories = [
  { value: 'national_id', label: 'National identity document' },
  { value: 'business_registration', label: 'Business registration certificate' },
  { value: 'trading_licence', label: 'Trading licence' },
  { value: 'tax_clearance', label: 'Tax clearance certificate' },
  { value: 'collateral_evidence', label: 'Collateral evidence' },
  { value: 'signed_application', label: 'Signed application & declaration' },
  { value: 'signed_guarantee', label: 'Signed guarantee agreement' },
  { value: 'signed_agreement', label: 'Signed facility agreement' },
  { value: 'other', label: 'Other supporting document' },
] as const
export const loanRoles = ['administrator', 'loan_officer', 'credit_manager', 'committee_member', 'finance_officer'] as const
