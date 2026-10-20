import React, { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Container, Paper, Typography } from '@mui/material';

import { NextPageWithLayout } from '@pages/_app.next';
import getLayout from '@components/Layout';
import useRequireAuth from '@hooks/useRequireAuth';
import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import { getPathId } from '@utils/pathDestructer';
import { QualityModelNode } from '@customTypes/metamodel';
import { ReleaseSelect, resolveCurrentRelease, ReleaseItem } from '@components/ReleaseSelect';
import { MetamodelTreeChart } from '@components/MetamodelTreeChart';
import { MetamodeloEmptyState } from './components/MetamodeloEmptyState';
import { MetamodeloErrorState } from './components/MetamodeloErrorState';

const MetamodeloDashboard: NextPageWithLayout = () => {
  useRequireAuth();
  const router = useRouter();

  const [organizationId, productId] = getPathId(router.query?.product as string);

  // Busca lista de releases do produto
  const { data: releaseData, isLoading: isReleasesLoading } = useRequest<any>(
    organizationId && productId ? productQuery.getReleaseList(organizationId, productId) : null
  );

  const releases: ReleaseItem[] = React.useMemo(() => {
    if (Array.isArray(releaseData)) return releaseData;
    if (Array.isArray(releaseData?.results)) return releaseData.results;
    return [];
  }, [releaseData]);

  const [selectedReleaseId, setSelectedReleaseId] = useState<number | null>(null);
  const [treeData, setTreeData] = useState<QualityModelNode | null>(null);
  const [isTreeLoading, setIsTreeLoading] = useState<boolean>(false);
  const [treeError, setTreeError] = useState<boolean>(false);

  // Seleciona por padrão a release atual quando a lista de releases carregar
  useEffect(() => {
    if (releases.length > 0 && selectedReleaseId === null) {
      const current = resolveCurrentRelease(releases);
      setSelectedReleaseId(current ? current.id : releases[0].id);
    }
  }, [releases, selectedReleaseId]);

  // Função para buscar a árvore da release selecionada
  const fetchTree = useCallback(async () => {
    if (!organizationId || !productId) return;

    setIsTreeLoading(true);
    setTreeError(false);

    try {
      const response = await productQuery.getQualityModelTree(
        organizationId,
        productId,
        selectedReleaseId || undefined
      );

      const data = response?.data;
      if (Array.isArray(data) && data.length > 0) {
        setTreeData(data[0]);
      } else {
        setTreeData(null);
      }
    } catch (err) {
      setTreeError(true);
      setTreeData(null);
    } finally {
      setIsTreeLoading(false);
    }
  }, [organizationId, productId, selectedReleaseId]);

  useEffect(() => {
    // Se a lista de releases já terminou de carregar
    if (!isReleasesLoading) {
      if (releases.length > 0 && selectedReleaseId !== null) {
        void fetchTree();
      } else if (releases.length === 0) {
        // Produto sem release
        setTreeData(null);
      }
    }
  }, [fetchTree, isReleasesLoading, releases.length, selectedReleaseId]);

  const handleReleaseChange = (newReleaseId: number) => {
    setSelectedReleaseId(newReleaseId);
  };

  const productPath = router.query?.product as string;

  return (
    <>
      <Head>
        <title>3. Metamodelo</title>
      </Head>

      <Container maxWidth="xl">
        <Box display="flex" flexDirection="column" gap={3} marginTop="40px" marginBottom="40px">
          <Typography variant="h4" color="#33568E" fontWeight="500">
            3. Metamodelo
          </Typography>

          {/* Estado de Carregamento inicial das releases */}
          {isReleasesLoading && (
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                padding: '48px',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '350px',
              }}
            >
              <CircularProgress />
            </Paper>
          )}

          {/* Estado de Erro da API (CA7) */}
          {!isReleasesLoading && treeError && (
            <MetamodeloErrorState onRetry={() => void fetchTree()} />
          )}

          {/* Estado Vazio: Produto sem releases ou sem configuração (CA7) */}
          {!isReleasesLoading &&
            !treeError &&
            (releases.length === 0 || (!isTreeLoading && !treeData)) && (
              <MetamodeloEmptyState productPath={productPath} />
            )}

          {/* Árvore do modelo carregada com sucesso */}
          {!isReleasesLoading && !treeError && (treeData || isTreeLoading) && (
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '24px',
                backgroundColor: '#FFFFFF',
              }}
            >
              {/* Header do Card com seletor de release */}
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={2}
                marginBottom="24px"
              >
                <Typography variant="h6" fontWeight="bold" color="#1E293B">
                  Modelo de qualidade da release
                </Typography>

                <ReleaseSelect
                  releases={releases}
                  selectedReleaseId={selectedReleaseId}
                  onReleaseChange={handleReleaseChange}
                  disabled={isTreeLoading}
                />
              </Box>

              {/* Loader interno durante troca de release */}
              {isTreeLoading ? (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  minHeight="500px"
                  sx={{ width: '100%' }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <MetamodelTreeChart treeData={treeData} />
              )}
            </Paper>
          )}
        </Box>
      </Container>
    </>
  );
};

MetamodeloDashboard.getLayout = getLayout;

export default MetamodeloDashboard;
