// src/__tests__/AppLayout.test.tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppLayout } from '@/AppLayout';

describe('AppLayout', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<AppLayout />);
    expect(getByText('Reflectibot')).toBeDefined();
  });
});
