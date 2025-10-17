/**
 * Nigerian Commercial Banks licensed by CBN (Central Bank of Nigeria)
 * Source: CBN official list of licensed banks
 * Last updated: 2025
 */

export const NIGERIAN_BANKS = [
  // Tier 1 Banks
  { bankName: 'Access Bank Plc', shortCode: 'ACCESS', sortCode: '044' },
  { bankName: 'Zenith Bank Plc', shortCode: 'ZENITH', sortCode: '057' },
  { bankName: 'First Bank of Nigeria Limited', shortCode: 'FIRSTBANK', sortCode: '011' },
  { bankName: 'Guaranty Trust Bank Plc', shortCode: 'GTB', sortCode: '058' },
  { bankName: 'United Bank for Africa Plc', shortCode: 'UBA', sortCode: '033' },
  
  // Tier 2 Banks
  { bankName: 'Fidelity Bank Plc', shortCode: 'FIDELITY', sortCode: '070' },
  { bankName: 'Union Bank of Nigeria Plc', shortCode: 'UNION', sortCode: '032' },
  { bankName: 'Stanbic IBTC Bank Plc', shortCode: 'STANBIC', sortCode: '221' },
  { bankName: 'Sterling Bank Plc', shortCode: 'STERLING', sortCode: '232' },
  { bankName: 'Polaris Bank Limited', shortCode: 'POLARIS', sortCode: '076' },
  { bankName: 'Wema Bank Plc', shortCode: 'WEMA', sortCode: '035' },
  { bankName: 'Ecobank Nigeria Limited', shortCode: 'ECOBANK', sortCode: '050' },
  { bankName: 'Citibank Nigeria Limited', shortCode: 'CITIBANK', sortCode: '023' },
  { bankName: 'Standard Chartered Bank Nigeria Limited', shortCode: 'STANDARD', sortCode: '068' },
  { bankName: 'Keystone Bank Limited', shortCode: 'KEYSTONE', sortCode: '082' },
  { bankName: 'Unity Bank Plc', shortCode: 'UNITY', sortCode: '215' },
  { bankName: 'Heritage Bank Plc', shortCode: 'HERITAGE', sortCode: '030' },
  { bankName: 'Providus Bank Limited', shortCode: 'PROVIDUS', sortCode: '101' },
  { bankName: 'SunTrust Bank Nigeria Limited', shortCode: 'SUNTRUST', sortCode: '100' },
  { bankName: 'Titan Trust Bank Limited', shortCode: 'TITAN', sortCode: '102' },
  
  // Digital/Non-Interest Banks
  { bankName: 'Jaiz Bank Plc', shortCode: 'JAIZ', sortCode: '301' },
  { bankName: 'TAJBank Limited', shortCode: 'TAJBANK', sortCode: '302' },
  { bankName: 'Lotus Bank', shortCode: 'LOTUS', sortCode: '303' },
  
  // Microfinance & Others
  { bankName: 'Globus Bank Limited', shortCode: 'GLOBUS', sortCode: '103' },
  { bankName: 'Parallex Bank Limited', shortCode: 'PARALLEX', sortCode: '104' },
  { bankName: 'Premium Trust Bank', shortCode: 'PREMIUM', sortCode: '105' },
  
  // International Banks Operating in Nigeria
  { bankName: 'FCMB Group Plc', shortCode: 'FCMB', sortCode: '214' },
];

export const getBankByCode = (shortCode: string) => {
  return NIGERIAN_BANKS.find(bank => bank.shortCode === shortCode);
};

export const getBankBySortCode = (sortCode: string) => {
  return NIGERIAN_BANKS.find(bank => bank.sortCode === sortCode);
};

export const getAllBankNames = () => {
  return NIGERIAN_BANKS.map(bank => bank.bankName).sort();
};