import { Page, Locator } from '@playwright/test';
import { AccountNav } from './account-nav.component';
import { AddAddressModal } from './add-address-modal.component';
import { AddressCard } from './address-card.component';

export class AddressesPage {
  readonly page: Page;
  readonly nav: AccountNav;
  readonly wrapper: Locator;
  readonly addAddressButton: Locator;
  readonly addAddressModal: AddAddressModal;
  readonly addressCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = new AccountNav(page);
    this.wrapper = page.getByTestId('addresses-page-wrapper');
    this.addAddressButton = this.wrapper.getByTestId('add-address-button');
    this.addAddressModal = new AddAddressModal(page);
    this.addressCards = this.wrapper.getByTestId('address-container');
  }

  async goto() {
    await this.page.goto('/dk/account/addresses');
  }

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async openAddAddressModal(): Promise<AddAddressModal> {
    await this.addAddressButton.click();
    await this.addAddressModal.root.waitFor();
    return this.addAddressModal;
  }

  /** Card whose street line contains the unique address1 from test data (no indexes). */
  addressCard(address1: string): AddressCard {
    return new AddressCard(
      this.addressCards.filter({
        has: this.page.getByTestId('address-address').filter({ hasText: address1 }),
      }),
    );
  }
}
