import React from 'react';
import { Box, Card, CardContent, Divider, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { EnrichedQualityModelNode, METAMODEL_COLORS } from './formatMetamodelTree';

interface Props {
  node: EnrichedQualityModelNode | null;
  onClose: () => void;
  position?: { x: number; y: number } | null;
}

export const MetamodelNodeModal: React.FC<Props> = ({ node, onClose, position }) => {
  const { t } = useTranslation('dashboards');
  if (!node) return null;

  const typeLabels: Record<string, string> = {
    tsqmi: t('metamodel.tree.type.tsqmi'),
    characteristic: t('metamodel.tree.type.characteristic'),
    subcharacteristic: t('metamodel.tree.type.subcharacteristic'),
    measure: t('metamodel.tree.type.measure'),
    metric: t('metamodel.tree.type.metric')
  };

  const typeColors: Record<string, string> = {
    tsqmi: METAMODEL_COLORS.tsqmi,
    characteristic: METAMODEL_COLORS.characteristic,
    subcharacteristic: METAMODEL_COLORS.subcharacteristic,
    measure: METAMODEL_COLORS.measure,
    metric: METAMODEL_COLORS.metric,
  };

  const typeLabel = typeLabels[node.type] || node.type;
  const typeColor = typeColors[node.type] || '#1E293B';
  const subtitle = node.parentPath ? `${typeLabel} · ${node.parentPath}` : typeLabel;

  return (
    <Card
      elevation={4}
      onClick={onClose}
      sx={{
        position: 'absolute',
        top: position ? position.y : '20%',
        left: position ? position.x : '40%',
        maxWidth: 360,
        width: '100%',
        zIndex: 1300,
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="#0F172A" lineHeight={1.2}>
              {node.name}
            </Typography>
            <Typography variant="caption" fontWeight={600} color={typeColor} display="block" mt={0.5}>
              {subtitle}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {node.description && (
          <Typography
            variant="body2"
            color="#475569"
            sx={{ mt: 1.5, mb: 1.5, fontSize: '12px', lineHeight: 1.45 }}
          >
            {node.description}
          </Typography>
        )}

        <Divider sx={{ my: 1 }} />

        <Box display="flex" flexDirection="column" gap={0.75}>
          {/* o TSQMI é a raiz e não tem peso (CA3) */}
          {node.type !== 'tsqmi' && node.weight !== null && node.weight !== undefined && (
            <Box display="flex" justifyContent="space-between" fontSize="12px">
              <Typography variant="caption" color="#64748B">
                {node.parentWeightLabel || t('metamodel.tree.weight')}:
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#1E293B">
                {node.weight}%
              </Typography>
            </Box>
          )}

          {node.type === 'measure' && node.min_threshold !== null && node.min_threshold !== undefined && (
            <Box display="flex" justifyContent="space-between" fontSize="12px">
              <Typography variant="caption" color="#64748B">
                {t('metamodel.tree.min-reference')}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#1E293B">
                {node.min_threshold}
              </Typography>
            </Box>
          )}

          {node.type === 'measure' && node.max_threshold !== null && node.max_threshold !== undefined && (
            <Box display="flex" justifyContent="space-between" fontSize="12px">
              <Typography variant="caption" color="#64748B">
                {t('metamodel.tree.max-reference')}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#1E293B">
                {node.max_threshold}
              </Typography>
            </Box>
          )}

          {node.type === 'measure' && node.children && node.children.length > 0 && (
            <Box display="flex" flexDirection="column" fontSize="12px" mt={0.5}>
              <Typography variant="caption" color="#64748B">
                {t('metamodel.tree.metrics-used')}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#1E293B" mt={0.25}>
                {node.children.map((c) => c.name || c.key).join(', ')}
              </Typography>
            </Box>
          )}

          {node.isSharedMetric && (
            <Typography variant="caption" color={METAMODEL_COLORS.metric} fontWeight={600} mt={0.5}>
              {t('metamodel.tree.shared-metric')}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
