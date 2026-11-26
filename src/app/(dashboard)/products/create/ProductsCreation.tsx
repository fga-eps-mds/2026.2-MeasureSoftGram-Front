'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from '@hooks/useRouter';
import { toast } from 'react-toastify';
import { TextField, MenuItem } from '@mui/material';
import { useOrganizationContext } from '@contexts/OrganizationProvider';
import { useProductContext } from '@contexts/ProductProvider';
import { Botoes, Container, Description, Form, Header, Wrapper } from '@app/(dashboard)/organizations/styles';
import { useProviderTranslation as useTranslation } from '@hooks/useProviderTranslation';
import MSGButton from '../../../../components/idv/buttons/MSGButton';
import { useProductQuery } from '../hooks/useProductQuery';
import { ProductFormData } from '@services/product';
import { isDuplicateField } from '@services/saveError';
import { Product } from '@customTypes/product';

const ProductsCreation: React.FC = () => {
  const router = useRouter();
  const [nome, setName] = useState('');
  const [descricao, setDescription] = useState('');
  const [organizationId, setOrganizationId] = useState<number>();
  const { organizationList, setCurrentOrganizations } = useOrganizationContext();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const { createProduct, getProductById, updateProduct } = useProductQuery();
  const currentOrganizationId = router.query.id_organization;
  const currentProductId = router.query.id_product;
  const { setCurrentProduct, loadAllProducts } = useProductContext();
  const { t } = useTranslation('product');

  useEffect(() => {
    const editMode = router.query.id_product;
    if (editMode) {
      setIsEditMode(true);
      const fetchProductData = async () => {
        try {
          const result = await getProductById(currentOrganizationId as string, currentProductId as string);

          if (result.type === 'success') {
            setName(result.value.name);
            setDescription(result.value.description || '');
            // o detalhe traz a organização como URL, não o id: o formulário usa a organização da rota (id_organization)
          }
        }
        catch (e) {
          console.error(e)
        }
      };
      void fetchProductData();
    }
  }, [router.query.id_product]);

  const syncCreatedSelection = (createdProduct: Product, finalOrgId: number | undefined) => {
    if (createdProduct && createdProduct.id) {
      localStorage.setItem('selectedProductId', JSON.stringify(createdProduct.id.toString()));
      setCurrentProduct(createdProduct);
    }
    if (finalOrgId) {
      localStorage.setItem('selectedOrgId', JSON.stringify(finalOrgId.toString()));
      const selectedOrg = organizationList?.find((org) => String(org.id) === String(finalOrgId));
      if (selectedOrg) {
        setCurrentOrganizations([selectedOrg]);
      }
    }
  };

  const handleEditProduct = async (novoProduto: ProductFormData) => {
    const result = await updateProduct(currentProductId as string, novoProduto);
    if (result.type === 'success') {
      toast.success(t('toast.success-edit'));
      router.push('/products');
      return;
    }
    if (isDuplicateField(result.error, 'name')) {
      toast.error(t('toast.name-exists'));
      return;
    }
    toast.error(t('toast.error-edit'));
  };

  const handleCreateProduct = async (novoProduto: ProductFormData, finalOrgId: number | undefined) => {
    try {
      const result = await createProduct(novoProduto);
      if (result.type === 'success') {
        toast.success(t('toast.success'));
        syncCreatedSelection(result.value, finalOrgId);
        await loadAllProducts();
        router.push('/products');
        return;
      }
      if (isDuplicateField(result.error, 'name')) {
        toast.error(t('toast.name-exists'));
        return;
      }
      toast.error(t('toast.error-create'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    let resolvedOrgId = organizationId;
    if (!resolvedOrgId && currentOrganizationId) {
      const orgIdStr = Array.isArray(currentOrganizationId) ? currentOrganizationId[0] : currentOrganizationId;
      resolvedOrgId = parseInt(orgIdStr, 10);
    }

    const novoProduto: ProductFormData = {
      name: nome,
      description: descricao,
      organizationId: resolvedOrgId,
    };

    if (isEditMode) {
      await handleEditProduct(novoProduto);
    } else {
      await handleCreateProduct(novoProduto, resolvedOrgId);
    }
  };

  return (
    <Container>
      <Header>{isEditMode ? t('title-edit') : t('title-create')}</Header>
      <Wrapper>
        <Description>
          {t('description')}
        </Description>

        <form onSubmit={handleSubmit}>
          <Form>
            <TextField
              select
              required
              fullWidth
              label={t('label-input')}
              variant="outlined"
              value={organizationId || currentOrganizationId}
              onChange={(e) => setOrganizationId(+e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              data-testid="org-input"
            >
              {
                organizationList?.map((organization) => (
                  <MenuItem key={organization.id} value={organization.id}>{organization.name}</MenuItem>
                ))
              }
            </TextField>

            <TextField
              fullWidth
              label={t('name-input')}
              variant="outlined"
              value={nome}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{ mb: 2 }}
              data-testid="name-input"
            />

            <TextField
              fullWidth
              label={t('description-input')}
              variant="outlined"
              value={descricao}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              sx={{ mb: 2 }}
              data-testid="description-input"
            />
            <Botoes>
              <MSGButton width="200px" variant='secondary' onClick={() => router.push('/products')}  >{t('back')}</MSGButton>

              <MSGButton width="200px" type='submit' >{isEditMode ? t('save') : t('create')}</MSGButton>
            </Botoes>
          </Form>
        </form>
      </Wrapper>
    </Container >
  );
};


export default ProductsCreation;
