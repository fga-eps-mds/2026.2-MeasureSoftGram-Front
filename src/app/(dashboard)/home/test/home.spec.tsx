import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from '@contexts/Auth';
import Home from '../page';


describe('Home', () => {
  describe('Snapshot', () => {
    it('Deve corresponder ao Snapshot', () => {
      // Mock the react-i18next module
      jest.mock('react-i18next', () => ({
        useTranslation: () => ({
          t: (key: string) => key, // Simply return the key instead of translating
          i18n: {
            changeLanguage: jest.fn(), // Mock the changeLanguage function
          },
        }),
      }));

      const tree = render(<AuthProvider>
        <Home />
      </AuthProvider>);

      expect(tree).toMatchSnapshot();
    });
  });
});
