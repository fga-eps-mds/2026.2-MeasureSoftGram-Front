import * as AuthModule from '../index';

describe('contexts/Auth index', () => {
  it('reexporta o provider e o hook', () => {
    expect(AuthModule.AuthProvider).toBeInstanceOf(Function);
    expect(AuthModule.useAuth).toBeInstanceOf(Function);
    expect(AuthModule.AuthContext).toBeDefined();
  });
});
