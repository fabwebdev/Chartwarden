# Page Object Models

This directory contains Page Object Models (POM) for the Chartwarden application.

## Purpose

Page Objects encapsulate page-specific selectors and actions to:
- Reduce code duplication across tests
- Improve test maintainability when UI changes
- Provide a clear API for interacting with pages

## Page Objects to be Created

- `auth.page.ts` - Login, registration, logout pages
- `patient.page.ts` - Patient list, creation, editing pages
- `user.page.ts` - User management pages
- `dashboard.page.ts` - Main dashboard page
- `nursing-note.page.ts` - Clinical note documentation pages
- `idg-meeting.page.ts` - IDG meeting documentation pages

## Example Structure

```typescript
import { Page, Locator } from '@playwright/test';

export class ExamplePage {
  readonly page: Page;
  readonly someElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someElement = page.getByRole('button', { name: 'Submit' });
  }

  async navigate() {
    await this.page.goto('/path');
  }

  async performAction() {
    await this.someElement.click();
  }
}
```
