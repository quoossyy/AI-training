import { test, expect } from '../../fixtures';
import { createAddress } from '../../data/address';

test.describe('Addresses', () => {
  test('ACC-02: new address is added to the address book', async ({ accountPage }) => {
    const address = createAddress();

    await accountPage.goto();
    const addressesPage = await accountPage.openAddresses();
    const modal = await addressesPage.openAddAddressModal();
    await modal.submit(address);

    const card = addressesPage.addressCard(address.address1);
    await expect(card.root).toBeVisible();
    await expect(card.name).toHaveText(`${address.firstName} ${address.lastName}`);
    await expect(card.address).toHaveText(address.address1);
    await expect(card.postalCity).toHaveText(`${address.postalCode}, ${address.city}`);
    await expect(card.provinceCountry).toHaveText(address.countryCode.toUpperCase());
  });

  test('ACC-03: address with empty required fields is not saved', async ({ accountPage }) => {
    await accountPage.goto();
    const addressesPage = await accountPage.openAddresses();
    const modal = await addressesPage.openAddAddressModal();
    await modal.save();

    await expect(modal.root).toBeVisible();
    await expect
      .poll(() => modal.invalidFields())
      .toEqual(['first-name-input', 'last-name-input', 'address-1-input', 'postal-code-input', 'city-input']);
  });
});
