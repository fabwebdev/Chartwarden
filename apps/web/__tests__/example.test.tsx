/**
 * Example Jest Test
 * This file demonstrates the Jest testing setup for the frontend
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';

// Simple component for testing
function Greeting({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>;
}

describe('Jest Configuration', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render a React component', () => {
    render(<Greeting name="Chartwarden" />);
    expect(screen.getByText('Hello, Chartwarden!')).toBeInTheDocument();
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve('test');
    await expect(promise).resolves.toBe('test');
  });
});
