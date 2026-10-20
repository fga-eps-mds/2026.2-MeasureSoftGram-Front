import { useEffect, useMemo, useState } from 'react';
import { useRequest } from '@hooks/useRequest';
import { productQuery } from '@services/product';
import { EntityAnalysis, EntityAnalysisCatalog, EntityLevel, IReleases, ReleasesPaginated } from '@customTypes/product';

function toReleaseArray(data?: IReleases[] | ReleasesPaginated): IReleases[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data!.results!;
  return [];
}

export function useEntityAnalysis(organizationId: string, productId: string) {
  const [releaseId, setReleaseId] = useState<number | undefined>();
  const [level, setLevel] = useState<EntityLevel>('characteristic');
  const [entityKey, setEntityKey] = useState<string | undefined>();

  const releasesRequest = useRequest<IReleases[] | ReleasesPaginated>(
    productQuery.getReleaseList(organizationId, productId)
  );
  const releases = useMemo(() => toReleaseArray(releasesRequest.data), [releasesRequest.data]);

  // as releases chegam da mais recente para a mais antiga: começa pela mais recente
  useEffect(() => {
    if (releases.length && !releases.some((release) => release.id === releaseId)) {
      setReleaseId(releases[0].id);
    }
  }, [releases, releaseId]);

  const entitiesRequest = useRequest<EntityAnalysisCatalog>(
    productQuery.getEntityAnalysisEntities(organizationId, productId, releaseId)
  );
  const entities = useMemo(() => entitiesRequest.data?.[level] ?? [], [entitiesRequest.data, level]);

  // a entidade escolhida precisa existir na configuração da release e no nível atual
  useEffect(() => {
    if (!entities.some((entity) => entity.key === entityKey)) {
      setEntityKey(entities[0]?.key);
    }
  }, [entities, entityKey]);

  const analysisRequest = useRequest<EntityAnalysis>(
    productQuery.getEntityAnalysis(organizationId, productId, { releaseId, level, key: entityKey })
  );

  const error = releasesRequest.error || entitiesRequest.error || analysisRequest.error;

  const retry = () => {
    void releasesRequest.mutate();
    void entitiesRequest.mutate();
    void analysisRequest.mutate();
  };

  return {
    releases,
    releaseId,
    setReleaseId,
    level,
    setLevel,
    entities,
    entityKey,
    setEntityKey,
    analysis: analysisRequest.data,
    isLoadingReleases: releasesRequest.isLoading,
    isLoading: releasesRequest.isLoading || entitiesRequest.isLoading || analysisRequest.isLoading,
    error,
    retry,
  };
}
