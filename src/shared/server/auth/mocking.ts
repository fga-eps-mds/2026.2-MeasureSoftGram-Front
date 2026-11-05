/** Modo mock (MSW): sem login nem Service, o servidor não valida sessão. */
export const isMockingEnabled = () => process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';
