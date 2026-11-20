import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntegrationsSection } from '../components/IntegrationsSection';
import i18n from '../../../../shared/i18n/i18n';

const t = i18n.getFixedT('pt', 'landing');

// A secao de integracoes lista as ferramentas que o MeasureSoftGram conecta:
// SonarQube, GitHub, assistentes de IA via MCP e VS Code. O texto vem
// do namespace `landing` (mockado globalmente, devolve a propria chave) e cada
// integracao exibe um icone de marca acessivel (role="img" + aria-label).

const ITEM_KEYS = ['sonar', 'github', 'ai', 'vscode'] as const;

const BRAND_LABELS = ['SonarQube', 'GitHub', 'Claude', 'Visual Studio Code'];

describe('IntegrationsSection', () => {
  it('renderiza o cabecalho da secao', () => {
    render(<IntegrationsSection />);

    expect(screen.getByText('Integra com o seu fluxo de trabalho')).toBeInTheDocument();
    expect(screen.getByText('O MeasureSoftGram se conecta às ferramentas que o seu time já usa para coletar métricas, visualizar resultados e agir sobre eles.')).toBeInTheDocument();
  });

  it('renderiza um cartao para cada integracao suportada', () => {
    render(<IntegrationsSection />);

    ITEM_KEYS.forEach((key) => {
      expect(
        screen.getAllByText(t(`integrations.items.${key}.title`)).length
      ).toBeGreaterThan(0);
      expect(
        screen.getByText(t(`integrations.items.${key}.description`))
      ).toBeInTheDocument();
    });
  });

  it('expoe cada icone de marca com rotulo acessivel', () => {
    render(<IntegrationsSection />);

    BRAND_LABELS.forEach((label) => {
      expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
    });
  });
});
