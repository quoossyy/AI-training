import { Page, Locator } from '@playwright/test';
import { AddressData } from '../../data/address';

/** "Add address" dialog. Rendered in a portal, so it is scoped from the page, not from the addresses wrapper. */
export class AddAddressModal {
  readonly root: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly address1Input: Locator;
  readonly postalCodeInput: Locator;
  readonly cityInput: Locator;
  readonly countrySelect: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('add-address-modal');
    this.firstNameInput = this.root.getByTestId('first-name-input');
    this.lastNameInput = this.root.getByTestId('last-name-input');
    this.address1Input = this.root.getByTestId('address-1-input');
    this.postalCodeInput = this.root.getByTestId('postal-code-input');
    this.cityInput = this.root.getByTestId('city-input');
    this.countrySelect = this.root.getByTestId('country-select');
    this.saveButton = this.root.getByTestId('save-button');
  }

  async fill(data: AddressData) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.address1Input.fill(data.address1);
    await this.postalCodeInput.fill(data.postalCode);
    await this.cityInput.fill(data.city);
    await this.countrySelect.selectOption(data.countryCode);
  }

  async save() {
    await this.saveButton.click();
  }

  async submit(data: AddressData) {
    await this.fill(data);
    await this.save();
    await this.root.waitFor({ state: 'hidden' });
  }

  /**
   * data-testid of the fields that fail native HTML5 validation (`required`).
   * The form shows no error elements of its own, so the state is read from the inputs.
   */
  async invalidFields(): Promise<string[]> {
    return this.root.evaluate((form) =>
      Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-testid]'))
        .filter((field) => field.willValidate && !field.validity.valid)
        .map((field) => field.dataset.testid ?? ''),
    );
  }
}
