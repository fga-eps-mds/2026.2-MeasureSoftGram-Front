import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { balanceMatrixService } from '@services/balanceMatrix';
import { useTranslation } from 'react-i18next';
import { productQuery } from '@services/product';
import { useRouter } from '@hooks/useRouter';
import ReleaseCreation from '../ReleaseCreation';

jest.mock('@hooks/useRouter', () => ({
  useRouter: jest.fn(),
}));

jest.setTimeout(30000);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@services/api');
jest.mock('@services/product');
jest.mock('@services/balanceMatrix');

const dateErrorMsg = "Já existe uma release neste período"
const mockPush = jest.fn();

describe('ReleaseInfo Component', () => {
  beforeAll(() => {
    (useRouter as jest.Mock).mockReturnValue({
      isReady: true,
      query: { product: 'org-123-prod-456' },
      push: mockPush,
    });

    (productQuery.getPreConfigEntitiesRelationship as jest.Mock).mockResolvedValue({
      data: [
        {
          "id": 1,
          "key": "reliability",
          "name": "Reliability",
          "description": null,
          "subcharacteristics": [
            {
              "id": 4,
              "key": "maturity",
              "name": "Maturity",
              "description": null,
              "measures": [
                {
                  "id": 8,
                  "key": "ci_feedback_time",
                  "name": "Ci Feedback Time",
                  "description": null
                }
              ]
            }
          ]
        },
        {
          "id": 2,
          "key": "maintainability",
          "name": "Maintainability",
          "description": null,
          "subcharacteristics": [
            {
              "id": 1,
              "key": "modifiability",
              "name": "Modifiability",
              "description": null,
              "measures": [
                {
                  "id": 4,
                  "key": "non_complex_file_density",
                  "name": "Non Complex File Density",
                  "description": null
                },
                {
                  "id": 5,
                  "key": "commented_file_density",
                  "name": "Commented File Density",
                  "description": null
                }
              ]
            }
          ]
        },
        {
          "id": 3,
          "key": "functional_suitability",
          "name": "Functional Suitability",
          "description": null,
          "subcharacteristics": [
            {
              "id": 3,
              "key": "functional_completeness",
              "name": "Functional Completeness",
              "description": null,
              "measures": [
                {
                  "id": 7,
                  "key": "team_throughput",
                  "name": "Team Throughput",
                  "description": null
                }
              ]
            }
          ]
        }
      ],
    });

    (productQuery.getCurrentReleaseGoal as jest.Mock).mockResolvedValue({
      data: {
        "id": 11,
        "data": {
          "reliability": 100,
          "maintainability": 100,
          "functional_suitability": 100
        },
        "allow_dynamic": false
      },
    });

    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 34,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    (productQuery.getProductCurrentPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "id": 14,
        "name": "Acacia",
        "data": {
          "characteristics": [
            {
              "key": "reliability",
              "weight": 46,
              "subcharacteristics": [
                {
                  "key": "maturity",
                  "weight": 100,
                  "measures": [
                    {
                      "key": "ci_feedback_time",
                      "weight": 100,
                      "metrics": [
                        {
                          "key": "sum_ci_feedback_times"
                        },
                        {
                          "key": "total_builds"
                        }
                      ],
                      "max_threshold": 900,
                      "min_threshold": 1
                    }
                  ]
                }
              ]
            },
            {
              "key": "maintainability",
              "weight": 33,
              "subcharacteristics": [
                {
                  "key": "modifiability",
                  "weight": 100,
                  "measures": [
                    {
                      "key": "non_complex_file_density",
                      "weight": 33,
                      "metrics": [
                        {
                          "key": "functions"
                        },
                        {
                          "key": "complexity"
                        }
                      ],
                      "max_threshold": 10,
                      "min_threshold": 0
                    },
                    {
                      "key": "commented_file_density",
                      "weight": 67,
                      "metrics": [
                        {
                          "key": "comment_lines_density"
                        }
                      ],
                      "max_threshold": 30,
                      "min_threshold": 10
                    }
                  ]
                }
              ]
            },
            {
              "key": "functional_suitability",
              "weight": 21,
              "subcharacteristics": [
                {
                  "key": "functional_completeness",
                  "weight": 100,
                  "measures": [
                    {
                      "key": "team_throughput",
                      "weight": 100,
                      "metrics": [
                        {
                          "key": "total_issues"
                        },
                        {
                          "key": "resolved_issues"
                        }
                      ],
                      "max_threshold": 100,
                      "min_threshold": 45
                    }
                  ]
                }
              ]
            }
          ]
        },
        "created_at": "2024-09-01T00:08:41.371226-03:00",
        "created_config": true
      },
    });

    (balanceMatrixService.getBalanceMatrix as jest.Mock).mockResolvedValue({
      data: {
        "count": 3,
        "next": null,
        "previous": null,
        "result": {
          "functional_suitability": {
            "+": [
              "reliability",
              "maintainability"
            ],
            "-": []
          },
          "reliability": {
            "+": [
              "functional_suitability",
              "maintainability"
            ],
            "-": []
          },
          "maintainability": {
            "+": [
              "functional_suitability",
              "reliability"
            ],
            "-": []
          }
        }
      },
    });

    (productQuery.createProductRelease as jest.Mock).mockResolvedValue({
      data: {},
    });

    (productQuery.getIsReleaseValid as jest.Mock).mockResolvedValue({
      data: { "message": "Parametros válidos para criação de Release" },
    });

    (productQuery.postPreConfig as jest.Mock).mockResolvedValue({
      data: {},
    });

    (productQuery.createProductGoal as jest.Mock).mockResolvedValue({
      data: { id: 1 },
    });

    (productQuery.updateReleaseEndDate as jest.Mock).mockResolvedValue({
      data: {
        "end_at": "2024-02-05T23:59:59Z"
      },
    });
  });

  it('should render the component correctly', async () => {
    await act(async () => {
      render(<ReleaseCreation />);
    });
    const { t } = useTranslation('plan_release');
    expect(screen.getByText(t('planRelease'))).toBeInTheDocument();
  });

  it('should navigate through steps', async () => {
    await act(async () => {
      render(<ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseIntput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseIntput, { target: { value: 'release 1' } });

    const nextButton = await screen.findByRole("button", { name: t('next') });
    fireEvent.click(nextButton);

    expect(screen.getByText(t('basicConfig'))).toBeInTheDocument();
  });

  it('should test the useEffect error path', async () => {
    (productQuery.getCurrentReleaseGoal as jest.Mock).mockRejectedValue(new Error('Erro ao buscar a configuração atual do produto'));

    await act(async () => {
      render(<ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');
    expect(screen.getByText(t('planRelease'))).toBeInTheDocument();
  });

  it('should navigate through steps correctly', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 34,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(<ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;
    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    fireEvent.click(screen.getByLabelText(t('startingPointNew')));

    let nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(await screen.findByText(t('defineCharacteristics'))).toBeInTheDocument();

    nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(await screen.findByText(t('balanceGoal'))).toBeInTheDocument();
  });

  it('should create release', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 34,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    fireEvent.click(screen.getByLabelText(t('startingPointNew')));

    await clickButtonAndWaitFor(t('next'), t('defineCharacteristics'));
    await clickButtonAndWaitFor(t('next'), t('balanceGoal'));

    fireEvent.click(await screen.findByText(t('end'), { selector: 'button' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/products/org-123-prod-456/releases/'));
    expect(productQuery.createProductRelease).toHaveBeenCalled();
  });

  it('should test error characteristic weight', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 2,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(<ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(await screen.findByText(t('defineCharacteristics'))).toBeInTheDocument();
  });

  const clickButtonAndWaitFor = async (buttonName: string, expectedText: string) => {
    const Btn = await screen.findByText(buttonName, { selector: 'button' });
    fireEvent.click(Btn);
    expect(await screen.findByText(expectedText)).toBeInTheDocument();
  };

  it('should test back button', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 34,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    fireEvent.click(screen.getByLabelText(t('startingPointNew')));

    await clickButtonAndWaitFor(t('next'), t('defineCharacteristics'));
    await clickButtonAndWaitFor(t('next'), t('balanceGoal'));
    await clickButtonAndWaitFor(t('back'), t('defineCharacteristics'));
    await clickButtonAndWaitFor(t('back'), t('basicConfig'));
  });

  it('should test checks values', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 34,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    fireEvent.click(screen.getByLabelText(t('startingPointNew')));

    await clickButtonAndWaitFor(t('next'), t('defineCharacteristics'));
    await clickButtonAndWaitFor(t('next'), t('balanceGoal'));

    fireEvent.click(await screen.findByText(t('allowBalanceGoal')));
    expect(await screen.findByText(t("balanceGoal"))).toBeInTheDocument();
  });

  it('should test modal back', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        characteristics: [
          {
            key: 'reliability',
            weight: 34,
            subcharacteristics: [
              {
                key: 'testing_status',
                weight: 50,
                measures: [
                  {
                    key: 'passed_tests',
                    weight: 33,
                    min_threshold: 0,
                    max_threshold: 1
                  },
                  {
                    key: 'test_builds',
                    weight: 33,
                    min_threshold: 0,
                    max_threshold: 300000
                  },
                  {
                    key: 'test_coverage',
                    weight: 34,
                    min_threshold: 60,
                    max_threshold: 100
                  }
                ]
              },
              {
                key: 'maturity',
                weight: 50,
                measures: [
                  {
                    key: 'ci_feedback_time',
                    weight: 100,
                    min_threshold: 1,
                    max_threshold: 900
                  }
                ]
              }
            ]
          },
          {
            key: 'maintainability',
            weight: 33,
            subcharacteristics: [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            key: 'functional_suitability',
            weight: 33,
            subcharacteristics: [
              {
                key: 'functional_completeness',
                weight: 100,
                measures: [
                  {
                    key: 'team_throughput',
                    weight: 100,
                    min_threshold: 45,
                    max_threshold: 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(<ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;
    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    fireEvent.click(screen.getByLabelText(t('startingPointNew')));

    // Avança passo a passo de forma estável
    await clickButtonAndWaitFor(t('next'), t('defineCharacteristics'));
    await clickButtonAndWaitFor(t('next'), t('balanceGoal'));

    // Clica no switch de permitir balanço dinâmico (abre o modal de confirmação)
    const switchBtn = await screen.findByText(t('allowBalanceGoal'));
    fireEvent.click(switchBtn);

    // No modal, clica em dispensar/voltar
    const dismissBtn = await screen.findByTestId('dismissBtnClick');
    fireEvent.click(dismissBtn);

    expect(screen.getByText(t("balanceGoal"))).toBeInTheDocument();
  });

  it('should test checks values_2', async () => {
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockResolvedValue({
      data: {
        "characteristics": [
          {
            "key": "reliability",
            "weight": 34,
            "subcharacteristics": [
              {
                "key": "testing_status",
                "weight": 50,
                "measures": [
                  {
                    "key": "passed_tests",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 1
                  },
                  {
                    "key": "test_builds",
                    "weight": 33,
                    "min_threshold": 0,
                    "max_threshold": 300000
                  },
                  {
                    "key": "test_coverage",
                    "weight": 34,
                    "min_threshold": 60,
                    "max_threshold": 100
                  }
                ]
              },
              {
                "key": "maturity",
                "weight": 50,
                "measures": [
                  {
                    "key": "ci_feedback_time",
                    "weight": 100,
                    "min_threshold": 1,
                    "max_threshold": 900
                  }
                ]
              }
            ]
          },
          {
            "key": "maintainability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "modifiability",
                "weight": 100,
                "measures": [
                  {
                    "key": "non_complex_file_density",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 10
                  },
                  {
                    "key": "commented_file_density",
                    "weight": 25,
                    "min_threshold": 10,
                    "max_threshold": 30
                  },
                  {
                    "key": "duplication_absense",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 5
                  },
                  {
                    "key": "technical_debt_ratio",
                    "weight": 25,
                    "min_threshold": 0,
                    "max_threshold": 20
                  }
                ]
              }
            ]
          },
          {
            "key": "functional_suitability",
            "weight": 33,
            "subcharacteristics": [
              {
                "key": "functional_completeness",
                "weight": 100,
                "measures": [
                  {
                    "key": "team_throughput",
                    "weight": 100,
                    "min_threshold": 45,
                    "max_threshold": 100
                  }
                ]
              }
            ]
          }
        ]
      },
    });

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    fireEvent.click(screen.getByLabelText(t('startingPointNew')));

    const nextButton = screen.getByText(/Next/i);

    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    const changeRefValuesSwitch = await screen.findByLabelText(t('changeRefValues'));
    fireEvent.click(changeRefValuesSwitch);
    expect(changeRefValuesSwitch).toBeChecked();
  });

  it('should test release date change', async () => {
    const mockError = new Error('Erro ao verificar release') as any;
    mockError.response = {
      data: {
        detail: dateErrorMsg,
        release: {
          id: 123,
        },
      },
    };

    // Mock the API call to return a rejected promise with the custom error
    (productQuery.getIsReleaseValid as jest.Mock).mockRejectedValue(mockError);

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    fireEvent.click(await screen.findByTestId("confirmBtnClick"));

    await waitFor(() => expect(screen.queryByTestId("confirmBtnClick")).not.toBeInTheDocument());
    expect(screen.getByText(t("defineConfiguration"))).toBeInTheDocument();
  });

  it('should test return release date modal', async () => {
    const mockError = new Error('Erro ao verificar release') as any;
    mockError.response = {
      data: {
        detail: dateErrorMsg,
        release: {
          id: 123,
        },
      },
    };

    // Mock the API call to return a rejected promise with the custom error
    (productQuery.getIsReleaseValid as jest.Mock).mockRejectedValue(mockError);

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    fireEvent.click(await screen.findByTestId("dismissBtnClick"));

    await waitFor(() => expect(screen.queryByTestId("dismissBtnClick")).not.toBeInTheDocument());
    expect(screen.getByText(t("defineConfiguration"))).toBeInTheDocument();
  });

  it('should test close release date modal', async () => {
    const mockError = new Error('Erro ao verificar release') as any;
    mockError.response = {
      data: {
        detail: dateErrorMsg,
        release: {
          id: 123,
        },
      },
    };

    // Mock the API call to return a rejected promise with the custom error
    (productQuery.getIsReleaseValid as jest.Mock).mockRejectedValue(mockError);

    await act(async () => {
      render(
        <ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');

    const releaseNameInput = screen.getByTestId('apelido-release') as HTMLInputElement;

    fireEvent.change(releaseNameInput, { target: { value: "Nome Teste" } });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    fireEvent.click(await screen.findByTestId("iconCloseDateModal"));

    await waitFor(() => expect(screen.queryByTestId("iconCloseDateModal")).not.toBeInTheDocument());
    expect(screen.getByText(t("defineConfiguration"))).toBeInTheDocument();
  });

  it('dispara as 5 buscas iniciais em paralelo', async () => {
    const pending = () => new Promise(() => {});
    const calls = [
      productQuery.getPreConfigEntitiesRelationship,
      productQuery.getCurrentReleaseGoal,
      productQuery.getProductDefaultPreConfig,
      productQuery.getProductCurrentPreConfig,
      balanceMatrixService.getBalanceMatrix
    ] as jest.Mock[];
    calls.forEach((fn) => {
      fn.mockClear();
      fn.mockImplementationOnce(pending);
    });

    await act(async () => {
      render(<ReleaseCreation />);
    });

    calls.forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));
  });

  it('usa o fallback do goal e segue carregando as configurações quando o goal falha', async () => {
    (productQuery.getCurrentReleaseGoal as jest.Mock).mockRejectedValueOnce(new Error('sem goal'));
    (productQuery.getProductDefaultPreConfig as jest.Mock).mockClear();
    (balanceMatrixService.getBalanceMatrix as jest.Mock).mockClear();

    await act(async () => {
      render(<ReleaseCreation />);
    });

    const { t } = useTranslation('plan_release');
    expect(screen.getByText(t('planRelease'))).toBeInTheDocument();
    expect(productQuery.getProductDefaultPreConfig).toHaveBeenCalledTimes(1);
    expect(balanceMatrixService.getBalanceMatrix).toHaveBeenCalledTimes(1);
  });

  describe('ponto de partida da configuração (US13.01)', () => {
    beforeEach(() => {
      (productQuery.postPreConfig as jest.Mock).mockClear();
      (productQuery.createProductRelease as jest.Mock).mockClear();
      // Testes anteriores deixam getIsReleaseValid rejeitando (conflito de datas).
      (productQuery.getIsReleaseValid as jest.Mock).mockResolvedValue({
        data: { "message": "Parametros válidos para criação de Release" },
      });
    });

    async function preencherReleaseEEscolher(opcao: string) {
      await act(async () => {
        render(<ReleaseCreation />);
      });
      fireEvent.change(screen.getByTestId('apelido-release'), { target: { value: 'Nome Teste' } });
      fireEvent.click(screen.getByLabelText(opcao));
    }

    it('com a última configuração vai direto ao balanceamento e não regrava a configuração', async () => {
      const { t } = useTranslation('plan_release');
      await preencherReleaseEEscolher(t('startingPointLast'));

      expect(screen.queryByText(t('defineConfiguration'))).not.toBeInTheDocument();

      fireEvent.click(await screen.findByText(t('next'), { selector: 'button' }));
      expect(await screen.findByText(t('balanceGoal'))).toBeInTheDocument();

      fireEvent.click(await screen.findByText(t('end'), { selector: 'button' }));
      await waitFor(() => expect(productQuery.createProductRelease).toHaveBeenCalled());
      expect(productQuery.postPreConfig).not.toHaveBeenCalled();
    });

    it('com o padrão vai direto ao balanceamento e grava a configuração padrão', async () => {
      const { t } = useTranslation('plan_release');
      await preencherReleaseEEscolher(t('startingPointDefault'));

      fireEvent.click(await screen.findByText(t('next'), { selector: 'button' }));
      expect(await screen.findByText(t('balanceGoal'))).toBeInTheDocument();

      fireEvent.click(await screen.findByText(t('end'), { selector: 'button' }));
      await waitFor(() => expect(productQuery.createProductRelease).toHaveBeenCalled());
      expect(productQuery.postPreConfig).toHaveBeenCalledWith('org', '123', expect.objectContaining({
        name: 'prod',
        data: expect.objectContaining({ characteristics: expect.any(Array) }),
      }));
    });

    it('volta a mostrar a etapa de pesos ao trocar para definir novos pesos', async () => {
      const { t } = useTranslation('plan_release');
      await preencherReleaseEEscolher(t('startingPointLast'));
      expect(screen.queryByText(t('defineConfiguration'))).not.toBeInTheDocument();

      fireEvent.click(screen.getByLabelText(t('startingPointNew')));
      expect(screen.getByText(t('defineConfiguration'))).toBeInTheDocument();
    });
  });
});
