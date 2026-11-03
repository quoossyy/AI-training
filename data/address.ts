export interface AddressData {
  firstName: string;
  lastName: string;
  address1: string;
  postalCode: string;
  city: string;
  countryCode: string;
}

/** Stand data persists between runs, so every address gets a unique street line. */
export function createAddress(): AddressData {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    firstName: 'Address',
    lastName: `Owner ${id}`,
    address1: `QA Street ${id}`,
    postalCode: '2100',
    city: 'Copenhagen',
    countryCode: 'dk',
  };
}
