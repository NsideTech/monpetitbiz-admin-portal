'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMonPetitBizDatabase, type BusinessDetails, type Product, type CreateProductInput, type UpdateProductInput } from '@/lib/monpetitbiz-db';

export default function BusinessDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;
  
  const [details, setDetails] = useState<BusinessDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<CreateProductInput>({
    name: '',
    quantity: 0,
    unitPrice: undefined,
  });

  useEffect(() => {
    loadDetails();
    loadProducts();
  }, [businessId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getMonPetitBizDatabase();
      const result = await db.getBusinessDetails(businessId);
      setDetails(result);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des détails');
      console.error('Load business details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      setError(null);
      const db = getMonPetitBizDatabase();
      const productsList = await db.getBusinessProducts(businessId);
      setProducts(productsList);
      console.log('Products loaded:', productsList);
    } catch (err: any) {
      console.error('Load products error:', err);
      setError(`Erreur lors du chargement des produits: ${err.message}`);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleBlockBusiness = async () => {
    if (!details) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir ${details.business.isActive ? 'bloquer' : 'débloquer'} cette entreprise ?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      const db = getMonPetitBizDatabase();
      await db.blockBusiness(businessId, !details.business.isActive);
      setSuccessMessage(`Entreprise ${!details.business.isActive ? 'débloquée' : 'bloquée'} avec succès`);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'opération');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUsers = async () => {
    if (!details) return;
    
    const action = details.business.isActive ? 'bloquer' : 'débloquer';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} tous les utilisateurs de cette entreprise ?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      const db = getMonPetitBizDatabase();
      await db.blockBusinessUsers(businessId, !details.business.isActive);
      setSuccessMessage(`Utilisateurs ${!details.business.isActive ? 'débloqués' : 'bloqués'} avec succès`);
      await loadDetails();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'opération');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible.')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      const db = getMonPetitBizDatabase();
      await db.deleteBusiness(businessId);
      setSuccessMessage('Entreprise supprimée avec succès');
      setTimeout(() => {
        router.push('/admin/businesses');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Le fichier doit être un CSV (.csv)');
      return;
    }

    try {
      setUploadLoading(true);
      setError(null);
      setSuccessMessage(null);
      setUploadResult(null);

      const db = getMonPetitBizDatabase();
      const result = await db.uploadProductsFromCSV(businessId, file);

      if (result.success) {
        setUploadResult({
          created: result.created,
          skipped: result.skipped,
          errors: result.errors || [],
        });
        setSuccessMessage(
          `${result.created} produit(s) créé(s)${result.skipped > 0 ? `, ${result.skipped} ignoré(s)` : ''}`
        );
        // Clear selected file after successful upload
        setSelectedFile(null);
        const fileInput = document.getElementById('csv-upload-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        // Reload products list
        await loadProducts();
      } else {
        setError(result.message || 'Erreur lors de l\'upload');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'upload du fichier');
      console.error('Upload CSV error:', err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (!file.name.endsWith('.csv')) {
        setError('Le fichier doit être un CSV (.csv)');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        setError('Le fichier doit être un CSV (.csv)');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    await handleFileUpload(selectedFile);
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setError(null);
    setUploadResult(null);
    // Reset file input
    const fileInput = document.getElementById('csv-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', quantity: 0, unitPrice: undefined });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.product,
      quantity: product.quantity,
      unitPrice: product.unitPrice || undefined,
    });
    setShowProductModal(true);
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({ name: '', quantity: 0, unitPrice: undefined });
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || productForm.name.trim().length === 0) {
      setError('Le nom du produit est requis');
      return;
    }

    if (productForm.quantity < 0 || isNaN(productForm.quantity)) {
      setError('La quantité doit être un nombre >= 0');
      return;
    }

    if (productForm.unitPrice !== undefined && (productForm.unitPrice < 0 || isNaN(productForm.unitPrice))) {
      setError('Le prix unitaire doit être un nombre >= 0');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);

      const db = getMonPetitBizDatabase();
      if (editingProduct) {
        await db.updateProduct(businessId, editingProduct.id, {
          name: productForm.name,
          quantity: productForm.quantity,
          unitPrice: productForm.unitPrice,
        });
        setSuccessMessage('Produit modifié avec succès');
      } else {
        await db.createProduct(businessId, productForm);
        setSuccessMessage('Produit créé avec succès');
      }

      handleCloseProductModal();
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'opération');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.product}" ?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);

      const db = getMonPetitBizDatabase();
      await db.deleteProduct(businessId, product.id);
      setSuccessMessage('Produit supprimé avec succès');
      await loadProducts();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!details) return null;
    
    if (details.business.deletedAt) {
      return (
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            background: '#6c757d',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Supprimée
        </span>
      );
    }
    if (!details.business.isActive) {
      return (
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            background: '#dc3545',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Bloquée
        </span>
      );
    }
    return (
      <span
        style={{
          padding: '6px 12px',
          borderRadius: '4px',
          background: '#28a745',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Active
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <button
              onClick={() => router.push('/admin/businesses')}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            >
              ← Retour à la liste
            </button>
            <h1 style={{ margin: 0 }}>Détails de l&apos;entreprise</h1>
          </div>

          {error && (
            <div style={{
              background: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
            }}>
              {successMessage}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Chargement...</p>
            </div>
          ) : details ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Informations de l'entreprise */}
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Informations de l&apos;entreprise</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Nom
                    </label>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{details.business.name}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Code
                    </label>
                    <code style={{
                      background: '#f0f0f0',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}>
                      {details.business.businessCode}
                    </code>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Devise
                    </label>
                    <p style={{ margin: 0, fontSize: '16px' }}>{details.business.currency}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Timezone
                    </label>
                    <p style={{ margin: 0, fontSize: '16px' }}>{details.business.timezone}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Pays
                    </label>
                    <p style={{ margin: 0, fontSize: '16px' }}>{details.business.country || '-'}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Date de création
                    </label>
                    <p style={{ margin: 0, fontSize: '16px' }}>
                      {new Date(details.business.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Statut
                    </label>
                    {getStatusBadge()}
                  </div>
                </div>
              </div>

              {/* Administrateur */}
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Administrateur</h2>
                {details.owner ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                        Nom
                      </label>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {details.owner.employeeName || '-'}
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                        Contact
                      </label>
                      <p style={{ margin: 0, fontSize: '16px' }}>{details.owner.phoneNumber}</p>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#666' }}>Aucun administrateur trouvé</p>
                )}
              </div>

              {/* Statistiques */}
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Statistiques</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Transactions
                    </label>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                      {details.statistics.transactionCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Utilisateurs
                    </label>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                      {details.statistics.userCount}
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Ventes totales
                    </label>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      {details.statistics.totalSales.toLocaleString()} {details.business.currency}
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Dépenses totales
                    </label>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      {details.statistics.totalExpenses.toLocaleString()} {details.business.currency}
                    </p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '4px', color: '#666', fontSize: '14px' }}>
                      Profit
                    </label>
                    <p style={{
                      margin: 0,
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: details.statistics.profit >= 0 ? '#28a745' : '#dc3545',
                    }}>
                      {details.statistics.profit.toLocaleString()} {details.business.currency}
                    </p>
                  </div>
                </div>
              </div>

              {/* Import de produits */}
              {!details.business.deletedAt && (
                <div style={{
                  background: 'white',
                  padding: '30px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Import de produits</h2>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    Téléchargez un fichier CSV contenant les produits à créer. Format attendu: <code>nom,quantité,prix</code> (séparateur virgule, UTF-8)
                  </p>
                  
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${dragActive ? '#007bff' : '#ccc'}`,
                      borderRadius: '8px',
                      padding: '40px',
                      textAlign: 'center',
                      background: dragActive ? '#f0f8ff' : '#fafafa',
                      cursor: uploadLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      marginBottom: '20px',
                      opacity: uploadLoading ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInput}
                      disabled={uploadLoading || !!selectedFile}
                      style={{ display: 'none' }}
                      id="csv-upload-input"
                    />
                    <label
                      htmlFor="csv-upload-input"
                      style={{
                        cursor: (uploadLoading || selectedFile) ? 'not-allowed' : 'pointer',
                        display: 'block',
                      }}
                    >
                      {uploadLoading ? (
                        <div>
                          <p style={{ margin: 0, color: '#666' }}>Traitement en cours...</p>
                        </div>
                      ) : selectedFile ? (
                        <div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#28a745' }}>
                            ✓ Fichier sélectionné: {selectedFile.name}
                          </p>
                          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                            Glissez-déposez votre fichier CSV ici
                          </p>
                          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                            ou cliquez pour sélectionner un fichier
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {selectedFile && !uploadLoading && (
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                      <button
                        onClick={handleUploadClick}
                        style={{
                          padding: '12px 24px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          flex: 1,
                        }}
                      >
                        📤 Uploader le fichier
                      </button>
                      <button
                        onClick={handleClearSelection}
                        style={{
                          padding: '12px 24px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          fontWeight: 'bold',
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {uploadResult && (
                    <div style={{
                      background: uploadResult.created > 0 ? '#e7f3ff' : '#fff3cd',
                      border: `1px solid ${uploadResult.created > 0 ? '#b3d9ff' : '#ffc107'}`,
                      borderRadius: '4px',
                      padding: '16px',
                      marginBottom: '20px',
                    }}>
                      <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>Résultat de l&apos;import</h3>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ color: '#666', fontSize: '14px' }}>Créés: </span>
                          <span style={{ fontWeight: 'bold', color: '#28a745' }}>{uploadResult.created}</span>
                        </div>
                        {uploadResult.skipped > 0 && (
                          <div>
                            <span style={{ color: '#666', fontSize: '14px' }}>Ignorés: </span>
                            <span style={{ fontWeight: 'bold', color: '#ffc107' }}>{uploadResult.skipped}</span>
                          </div>
                        )}
                      </div>
                      {uploadResult.skipped > 0 && uploadResult.created === 0 && (
                        <div style={{ 
                          background: '#fff3cd', 
                          border: '1px solid #ffc107', 
                          borderRadius: '4px', 
                          padding: '12px', 
                          marginTop: '12px' 
                        }}>
                          <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                            <strong>Information:</strong>{' '}
                            {`Tous les produits du fichier existent déjà dans la base de données. Les produits existants ne sont pas modifiés lors de l'import CSV. Pour mettre à jour des produits existants, utilisez la fonction "Modifier" dans la liste des produits.`}
                          </p>
                        </div>
                      )}
                      {uploadResult.errors.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#dc3545' }}>
                            Erreurs:
                          </p>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#dc3545', fontSize: '14px' }}>
                            {uploadResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Liste des produits */}
              {details && !details.business.deletedAt && (
                <div style={{
                  background: 'white',
                  padding: '30px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>Produits</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        onClick={loadProducts}
                        disabled={productsLoading}
                        style={{
                          padding: '8px 16px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: productsLoading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: productsLoading ? 0.6 : 1,
                        }}
                      >
                        🔄 Actualiser
                      </button>
                      <button
                        onClick={handleOpenAddProduct}
                        disabled={actionLoading}
                        style={{
                          padding: '10px 20px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                      >
                        + Ajouter un produit
                      </button>
                    </div>
                  </div>

                  {productsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <p>Chargement des produits...</p>
                    </div>
                  ) : products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      <p style={{ marginBottom: '12px' }}>Aucun produit trouvé</p>
                      <p style={{ fontSize: '14px', color: '#999' }}>
                        {`Utilisez le bouton "Ajouter un produit" ou importez un fichier CSV pour créer des produits.`}
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Nom</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Code</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Quantité</th>
                            <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>Prix unitaire</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((product) => (
                            <tr key={product.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                              <td style={{ padding: '12px', fontSize: '14px' }}>{product.product}</td>
                              <td style={{ padding: '12px', fontSize: '14px' }}>
                                {product.productCode ? (
                                  <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>
                                    {product.productCode}
                                  </code>
                                ) : (
                                  <span style={{ color: '#999' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>{product.quantity}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px' }}>
                                {product.unitPrice !== null ? (
                                  `${product.unitPrice.toLocaleString()} ${details.business.currency}`
                                ) : (
                                  <span style={{ color: '#999' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                  <button
                                    onClick={() => handleOpenEditProduct(product)}
                                    disabled={actionLoading}
                                    style={{
                                      padding: '6px 12px',
                                      background: '#ffc107',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                      opacity: actionLoading ? 0.6 : 1,
                                    }}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product)}
                                    disabled={actionLoading}
                                    style={{
                                      padding: '6px 12px',
                                      background: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                                      fontSize: '12px',
                                      opacity: actionLoading ? 0.6 : 1,
                                    }}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Modal pour ajouter/modifier un produit */}
              {showProductModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }} onClick={handleCloseProductModal}>
                  <div style={{
                    background: 'white',
                    padding: '30px',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                  }} onClick={(e) => e.stopPropagation()}>
                    <h2 style={{ marginTop: 0, marginBottom: '20px' }}>
                      {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
                    </h2>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                        Nom du produit *
                      </label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        disabled={actionLoading}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                        placeholder="Nom du produit"
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                        Quantité *
                      </label>
                      <input
                        type="number"
                        value={productForm.quantity}
                        onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value) || 0 })}
                        disabled={actionLoading}
                        min="0"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                        placeholder="0"
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '600' }}>
                        Prix unitaire ({details.business.currency})
                      </label>
                      <input
                        type="number"
                        value={productForm.unitPrice || ''}
                        onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                        disabled={actionLoading}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                        placeholder="Optionnel"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleCloseProductModal}
                        disabled={actionLoading}
                        style={{
                          padding: '10px 20px',
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveProduct}
                        disabled={actionLoading}
                        style={{
                          padding: '10px 20px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          opacity: actionLoading ? 0.6 : 1,
                        }}
                      >
                        {actionLoading ? 'Enregistrement...' : (editingProduct ? 'Modifier' : 'Créer')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!details.business.deletedAt && (
                <div style={{
                  background: 'white',
                  padding: '30px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                  <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Actions</h2>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                      onClick={handleBlockBusiness}
                      disabled={actionLoading}
                      style={{
                        padding: '12px 24px',
                        background: details.business.isActive ? '#dc3545' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        opacity: actionLoading ? 0.6 : 1,
                      }}
                    >
                      {details.business.isActive ? 'Bloquer l\'entreprise' : 'Débloquer l\'entreprise'}
                    </button>
                    <button
                      onClick={handleBlockUsers}
                      disabled={actionLoading}
                      style={{
                        padding: '12px 24px',
                        background: details.business.isActive ? '#ffc107' : '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        opacity: actionLoading ? 0.6 : 1,
                      }}
                    >
                      {details.business.isActive ? 'Bloquer les utilisateurs' : 'Débloquer les utilisateurs'}
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={actionLoading}
                      style={{
                        padding: '12px 24px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        opacity: actionLoading ? 0.6 : 1,
                      }}
                    >
                      Supprimer l&apos;entreprise
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Entreprise non trouvée</p>
            </div>
          )}
    </div>
  );
}

