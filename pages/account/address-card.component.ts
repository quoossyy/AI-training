import { Locator } from '@playwright/test';

/** One saved address in the address book on /dk/account/addresses. */
export class AddressCard {
  readonly root: Locator;
  readonly name: Locator;
  readonly address: Locator;
  readonly postalCity: Locator;
  readonly provinceCountry: Locator;

  constructor(root: Locator) {
    this.root = root;
    this.name = this.root.getByTestId('address-name');
    this.address = this.root.getByTestId('address-address');
    this.postalCity = this.root.getByTestId('address-postal-city');
    this.provinceCountry = this.root.getByTestId('address-province-country');
  }
}
