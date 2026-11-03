import { Page, Locator } from '@playwright/test';
import { AccountNav } from './account-nav.component';
import { ProfilePage } from './profile.page';
import { AddressesPage } from './addresses.page';

export class AccountOverviewPage {
  readonly page: Page;
  readonly nav: AccountNav;
  readonly wrapper: Locator;
  readonly welcomeMessage: Locator;
  readonly customerEmail: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = new AccountNav(page);
    this.wrapper = page.getByTestId('overview-page-wrapper');
    this.welcomeMessage = page.getByTestId('welcome-message');
    this.customerEmail = page.getByTestId('customer-email');
  }

  async goto() {
    await this.page.goto('/dk/account');
  }

  async waitForLoaded() {
    await this.wrapper.waitFor();
  }

  async openProfile(): Promise<ProfilePage> {
    await this.nav.profileLink.click();
    return new ProfilePage(this.page);
  }

  async openAddresses(): Promise<AddressesPage> {
    await this.nav.addressesLink.click();
    const addressesPage = new AddressesPage(this.page);
    await addressesPage.waitForLoaded();
    return addressesPage;
  }
}
