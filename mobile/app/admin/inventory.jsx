import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, Image, ScrollView, Alert, StatusBar, ActivityIndicator,
  PanResponder, TouchableWithoutFeedback, Dimensions, KeyboardAvoidingView, Platform,
  Vibration
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useApp } from '../../context/AppContext';

export default function AdminInventoryScreen() {
  const { apiBaseUrl, socket } = useApp();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // [{ id, uri, error }]
  const [categories, setCategories] = useState([]);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleAdjustStock = async (item, delta) => {
    const newQty = Math.max(0, (item.stockQty || 0) + delta);
    setProducts(prev => prev.map(p => p._id === item._id ? { ...p, stockQty: newQty } : p));
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await fetch(`${apiBaseUrl}/products/${item._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
    } catch (e) {
      fetchProducts();
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
        return;
      }
    }
    setScannerVisible(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(80);
    } catch (e) { }
    setScannerVisible(false);
    setSearchTerm(String(data).trim());
  };

  const panResponder = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          setShowAddModal(false);
        }
      }
    }),
    []);

  const [formData, setFormData] = useState(() => ({
    barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
    name: '',
    category: 'Grocery',
    unit: 'pcs',
    purchasePrice: '',
    mrp: '',
    sellingPrice: '',
    stockQty: '',
    imageUrl: '',
    images: [],
    variants: [],
    description: ''
  }));

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/products`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
      }
    } catch (_e) { }
  }, [apiBaseUrl]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/categories`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const catList = data.data.filter(c => c.isActive !== false).map(c => c.name);
        setCategories(catList);
        return catList;
      }
    } catch (_e) { }
    return [];
  }, [apiBaseUrl]);

  // Automatically refresh categories and products when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchCategories();
    }, [fetchProducts, fetchCategories])
  );

  // Listen for real-time category and stock updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleCategoryUpdate = () => {
      fetchCategories();
    };
    socket.on('categories:updated', handleCategoryUpdate);
    socket.on('categoryCreated', handleCategoryUpdate);

    return () => {
      socket.off('categories:updated', handleCategoryUpdate);
      socket.off('categoryCreated', handleCategoryUpdate);
    };
  }, [socket, fetchCategories]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  // Quick inline category creation directly inside Add Product modal
  const handleCreateQuickCategory = async () => {
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      Alert.alert('Required', 'Please enter a category name.');
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await fetch(`${apiBaseUrl}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, isActive: true, sortOrder: categories.length + 1 })
      });
      const data = await res.json();
      if (data.success) {
        setCategories(prev => prev.includes(cleanName) ? prev : [...prev, cleanName]);
        setFormData(prev => ({ ...prev, category: cleanName }));
        setNewCategoryName('');
        setShowQuickCategoryModal(false);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_e) { }
      } else {
        Alert.alert('Category Error', data.message || 'Could not create category');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not create category: ' + e.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesLow = !filterLowStockOnly || (p.stockQty <= (p.reorderLevel || 5));
    return matchesSearch && matchesLow;
  });

  const handleOpenAdd = async () => {
    fetchCategories(); // Ensure fresh categories immediately upon opening Add Product modal
    setEditingId(null);
    setFormData({
      barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
      name: '',
      category: categories[0] || 'Grocery',
      unit: 'pcs',
      purchasePrice: '',
      mrp: '',
      sellingPrice: '',
      stockQty: '',
      imageUrl: '',
      images: [],
      variants: [],
      description: ''
    });
    setPendingImages([]);
    setShowAddModal(true);
  };

  const handleEdit = (item) => {
    fetchCategories(); // Ensure fresh categories immediately upon opening Edit modal
    setEditingId(item._id);
    setPendingImages([]);

    // Collect all existing images deduplicated, starting with main image
    const initialImages = [];
    if (item.imageUrl) initialImages.push(item.imageUrl);
    if (Array.isArray(item.images)) {
      item.images.forEach(img => {
        if (img && !initialImages.includes(img)) initialImages.push(img);
      });
    }

    setFormData({
      barcode: item.barcode || '',
      name: item.name || '',
      category: item.category || 'Grocery',
      unit: item.unit || 'pcs',
      purchasePrice: item.purchasePrice ? item.purchasePrice.toString() : '0',
      mrp: item.mrp ? item.mrp.toString() : '0',
      sellingPrice: item.sellingPrice ? item.sellingPrice.toString() : '0',
      stockQty: item.stockQty ? item.stockQty.toString() : '0',
      imageUrl: initialImages[0] || '',
      images: initialImages,
      variants: Array.isArray(item.variants) ? item.variants.map(v => ({
        _id: v._id,
        label: v.label || '',
        mrp: String(v.mrp ?? ''),
        sellingPrice: String(v.sellingPrice ?? ''),
        stockQty: String(v.stockQty ?? ''),
        unitPrice: v.unitPrice || ''
      })) : [],
      description: item.description || ''
    });
    setShowAddModal(true);
  };

  const uploadSingleImageBase64 = async (base64, localUri) => {
    const tempId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Add to pendingImages right away so user sees instant feedback
    setPendingImages(prev => [...prev, { id: tempId, uri: localUri || `data:image/jpeg;base64,${base64}` }]);

    try {
      const response = await fetch(`${apiBaseUrl}/upload/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
      });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        setFormData(prev => {
          const currentList = Array.isArray(prev.images) ? [...prev.images] : [];
          const updated = [...currentList, data.imageUrl];
          return {
            ...prev,
            images: updated,
            imageUrl: updated[0] || data.imageUrl
          };
        });
      } else {
        Alert.alert('Upload Failed', data.message || 'Could not upload image');
      }
    } catch (err) {
      Alert.alert('Upload Error', 'Failed to upload image to server');
    } finally {
      setPendingImages(prev => prev.filter(item => item.id !== tempId));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
        return;
      }
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          uploadSingleImageBase64(asset.base64, asset.uri);
        }
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickGalleryImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission required to upload photos.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 8,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        result.assets.forEach(asset => {
          if (asset.base64) {
            uploadSingleImageBase64(asset.base64, asset.uri);
          }
        });
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to pick photos from gallery');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => {
      const updated = (prev.images || []).filter((_, i) => i !== indexToRemove);
      return {
        ...prev,
        images: updated,
        imageUrl: updated[0] || ''
      };
    });
  };

  const handleSetMainImage = (index) => {
    if (index === 0) return;
    setFormData(prev => {
      const target = prev.images[index];
      const rest = prev.images.filter((_, i) => i !== index);
      const reordered = [target, ...rest];
      return {
        ...prev,
        images: reordered,
        imageUrl: target
      };
    });
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_e) { }
  };

  const handleSave = async () => {
    if (pendingImages.length > 0) {
      Alert.alert('Uploading In Progress', 'Please wait for all images to finish uploading.');
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter product name');
      return;
    }
    const mainImg = (formData.images && formData.images.length > 0)
      ? formData.images[0]
      : (formData.imageUrl ? formData.imageUrl.trim() : '');

    if (!mainImg) {
      Alert.alert('Required Image', 'Please upload at least one image for the product.');
      return;
    }
    try {
      const url = editingId ? `${apiBaseUrl}/products/${editingId}` : `${apiBaseUrl}/products`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imageUrl: mainImg,
          purchasePrice: Number(formData.purchasePrice) || 0,
          mrp: Number(formData.mrp) || Number(formData.sellingPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          stockQty: Number(formData.stockQty) || 0,
          images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : (mainImg ? [mainImg] : []),
          variants: (formData.variants || [])
            .filter(v => v.label && v.label.trim())
            .map(v => ({
              ...(v._id ? { _id: v._id } : {}),
              label: v.label.trim(),
              mrp: Number(v.mrp) || Number(v.sellingPrice) || 0,
              sellingPrice: Number(v.sellingPrice) || 0,
              stockQty: Number(v.stockQty) || 0,
              unitPrice: v.unitPrice || ''
            })),
          description: formData.description || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchProducts();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save product: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to remove this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${apiBaseUrl}/products/${id}`, { method: 'DELETE' });
            fetchProducts();
          } catch (e) { }
        }
      }
    ]);
  };

  const renderProductItemContent = (item, isLow) => (
    <>
      <Image
        source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }}
        className="w-[72px] h-[72px] rounded-lg bg-slate-50 mr-2"
      />
      <View className="flex-1">
        <Text className="text-[15px] leading-tight font-semibold text-[#1E3A8A] mb-1" numberOfLines={2}>{item.name}</Text>
        <View className="flex-row items-center mb-1.5">
          <View className="bg-slate-100 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-semibold tracking-wide text-slate-700">{item.category}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-base font-bold text-[#1E3A8A] mr-2">₹{item.sellingPrice}</Text>
          <Text className="text-xs text-slate-400 line-through mr-3">₹{item.mrp}</Text>
          <View className={`px-2 py-0.5 rounded-md flex-row items-center ${isLow ? 'bg-red-50' : 'bg-emerald-50'}`}>
            {isLow && <Ionicons name="alert-circle" size={10} color="#EF4444" style={{ marginRight: 2 }} />}
            <Text className={`text-[10px] font-bold ${isLow ? 'text-red-600' : 'text-emerald-700'}`}>
              {item.stockQty} {item.unit}
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-100">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View className="px-5 pb-3 flex-row justify-between items-center">
        <View>
          <Text className="text-4xl tracking-tight font-semibold text-[#1E3A8A]">Catalog</Text>
          <Text className="text-xs text-slate-500 font-semibold mt-1">
            {products.length} products · {products.filter(p => p.stockQty <= (p.reorderLevel || 5)).length} low stock
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={handleOpenAdd}
            className="bg-[#1E3A8A] rounded-full px-4 py-3 shadow-sm shadow-[#1E3A8A]/30"
          >
            <Text className="text-white text-sm font-bold tracking-wide">+ Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="mx-5 mb-2 flex-row items-center">
        <View className="flex-1 bg-white rounded-full px-4 py-3 flex-row items-center border border-slate-300">
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-md font-semibold text-[#1E3A8A]"
            placeholder="Search products..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Low Stock Quick Filter Pill */}
      <View className="mx-5 mb-3 flex-row items-center">
        <TouchableOpacity
          onPress={() => setFilterLowStockOnly(false)}
          className={`px-3 py-1.5 rounded-xl mr-2 border ${!filterLowStockOnly ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'
            }`}
        >
          <Text className={`text-xs font-bold ${!filterLowStockOnly ? 'text-white' : 'text-slate-600'}`}>
            All ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterLowStockOnly(true)}
          className={`px-3 py-1.5 rounded-xl border flex-row items-center ${filterLowStockOnly ? 'bg-red-500 border-red-500' : 'bg-white border-slate-200'
            }`}
        >
          <Ionicons name="alert-circle" size={13} color={filterLowStockOnly ? '#FFFFFF' : '#EF4444'} style={{ marginRight: 4 }} />
          <Text className={`text-xs font-bold ${filterLowStockOnly ? 'text-white' : 'text-red-600'}`}>
            Low Stock ({products.filter(p => p.stockQty <= (p.reorderLevel || 5)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="items-center pt-16">
            <Ionicons name="cube-outline" size={64} color="#CBD5E1" className="mb-3" />
            <Text className="text-base font-black text-[#1E3A8A]">No Products Found</Text>
            <Text className="text-xs text-slate-400 mt-1">Tap &quot;+ Add Item&quot; to get started</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isLow = item.stockQty <= (item.reorderLevel || 5);
          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleEdit(item)}
              className={`bg-white rounded-xl p-2.5 mb-2 flex-row items-center ${isLow ? 'border border-red-200' : 'border border-slate-300'}`}
            >
              {renderProductItemContent(item, isLow)}
            </TouchableOpacity>
          );
        }}
      />

      {/* Add / Edit Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <BlurView intensity={40} tint="dark" style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
            <View className="bg-white rounded-t-[32px] max-h-[90%] shadow-2xl overflow-hidden">
              {/* Handle */}
              <View {...panResponder.panHandlers} className="w-full pt-4 pb-2 items-center bg-white z-10">
                <View className="w-12 h-1.5 bg-slate-200 rounded-full" />
              </View>
              <ScrollView
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
              >
                <Text className="text-2xl font-bold text-[#1E3A8A] tracking-tight mb-4 mt-2 flex-row items-center">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </Text>

                {/* Product Images (All at the top) */}
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-2">
                    <View>
                      <View className="flex-row items-center">
                        <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                          Product Images ({(formData.images?.length || 0) + (pendingImages.length || 0)})
                        </Text>

                      </View>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <TouchableOpacity
                        onPress={takePhoto}
                        className="flex-row items-center bg-[#1E3A8A] px-3 py-1.5 rounded-xl shadow-xs active:bg-[#1E3A8A]/90"
                      >
                        <Ionicons name="camera" size={13} color="#FFFFFF" />
                        <Text className="text-[11px] font-bold text-white ml-1">Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={pickGalleryImages}
                        className="flex-row items-center bg-slate-800 px-3 py-1.5 rounded-xl shadow-xs active:bg-slate-700"
                      >
                        <Ionicons name="images" size={13} color="#FFFFFF" />
                        <Text className="text-[11px] font-bold text-white ml-1">Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* If no images and no pending uploads, show empty state prompt */}
                  {(!formData.images || formData.images.length === 0) && pendingImages.length === 0 ? (
                    <View className="border-2 border-dashed border-slate-300 bg-slate-50/80 rounded-2xl p-5 items-center justify-center">
                      <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2 border border-blue-100">
                        <Ionicons name="cloud-upload-outline" size={24} color="#1E3A8A" />
                      </View>
                      <Text className="text-sm font-bold text-slate-700 mb-0.5">No images uploaded</Text>
                      <Text className="text-xs text-slate-400 text-center mb-3">
                        Upload product images. The first image will be your main display photo.
                      </Text>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={takePhoto}
                          className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl flex-row items-center shadow-xs"
                        >
                          <Ionicons name="camera-outline" size={15} color="#1E3A8A" style={{ marginRight: 5 }} />
                          <Text className="text-xs font-bold text-slate-700">Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={pickGalleryImages}
                          className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl flex-row items-center shadow-xs"
                        >
                          <Ionicons name="images-outline" size={15} color="#1E3A8A" style={{ marginRight: 5 }} />
                          <Text className="text-xs font-bold text-slate-700">Browse Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
                      {/* Uploaded images */}
                      {formData.images?.map((imgUri, idx) => {
                        const isMain = idx === 0;
                        return (
                          <View
                            key={`img_${idx}`}
                            className={`relative mr-3 rounded-2xl overflow-hidden bg-slate-100 ${isMain ? 'border-2 border-[#1E3A8A] shadow-sm' : 'border border-slate-200'
                              }`}
                            style={{ width: 104, height: 114 }}
                          >
                            <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="cover" />

                            {/* Main Image Badge */}
                            {isMain ? (
                              <View className="absolute top-1.5 left-1.5 bg-[#1E3A8A] px-2 py-0.5 rounded-md flex-row items-center shadow-xs">
                                <Ionicons name="star" size={10} color="#FBBF24" style={{ marginRight: 3 }} />
                                <Text className="text-[9px] font-black text-white">MAIN</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                onPress={() => handleSetMainImage(idx)}
                                className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/70 py-1 rounded-md items-center justify-center flex-row"
                              >
                                <Ionicons name="star-outline" size={10} color="#FFFFFF" style={{ marginRight: 2 }} />
                                <Text className="text-[9px] font-bold text-white">Set Main</Text>
                              </TouchableOpacity>
                            )}

                            {/* Delete Button */}
                            <TouchableOpacity
                              onPress={() => handleRemoveImage(idx)}
                              className="absolute top-1.5 right-1.5 bg-black/60 w-5 h-5 rounded-full items-center justify-center"
                            >
                              <Ionicons name="close" size={13} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}

                      {/* Pending Uploads */}
                      {pendingImages.map((pending) => (
                        <View
                          key={pending.id}
                          className="relative mr-3 rounded-2xl overflow-hidden border border-blue-300 bg-slate-100 items-center justify-center"
                          style={{ width: 104, height: 114 }}
                        >
                          <Image source={{ uri: pending.uri }} className="w-full h-full opacity-50" resizeMode="cover" />
                          <View className="absolute inset-0 bg-black/30 items-center justify-center">
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text className="text-[9px] font-bold text-white mt-1">Uploading...</Text>
                          </View>
                        </View>
                      ))}

                      {/* Quick Add More Button */}
                      <TouchableOpacity
                        onPress={pickGalleryImages}
                        className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 items-center justify-center mr-2"
                        style={{ width: 90, height: 114 }}
                      >
                        <Ionicons name="add-circle-outline" size={26} color="#1E3A8A" />
                        <Text className="text-[10px] font-bold text-[#1E3A8A] mt-1">+ Add More</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  )}
                </View>

                {/* Product Name */}
                <View className="relative bg-slate-50 border border-slate-200 rounded-2xl mb-6">
                  <View pointerEvents="none" className="absolute top-2 left-4 z-10">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Name</Text>
                  </View>
                  <TextInput
                    className="px-4 pt-6 pb-2 text-md font-semibold text-[#1E3A8A]"
                    value={formData.name}
                    onChangeText={(val) => setFormData({ ...formData, name: val })}
                    placeholder="e.g. Fortune Sunflower Oil 1L"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Category Selector */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">Category</Text>
                  <View className="flex-row items-center gap-1.5">
                    <TouchableOpacity
                      onPress={() => {
                        setShowAddModal(false);
                        router.push('/admin/categories');
                      }}
                      className="flex-row items-center bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200"
                    >
                      <Ionicons name="folder-open" size={13} color="#475569" style={{ marginRight: 3 }} />
                      <Text className="text-xs font-bold text-slate-700">Manage All</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setShowQuickCategoryModal(prev => !prev)}
                      className="flex-row items-center bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200"
                    >
                      <Ionicons name="add-circle" size={14} color="#1E3A8A" style={{ marginRight: 3 }} />
                      <Text className="text-xs font-black text-[#1E3A8A]">+ New</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Inline Quick Add Category Box */}
                {showQuickCategoryModal && (
                  <View className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Ionicons name="grid" size={14} color="#1E3A8A" style={{ marginRight: 5 }} />
                        <Text className="text-xs font-bold text-[#1E3A8A]">Create New Category</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setShowQuickCategoryModal(false); setNewCategoryName(''); }}
                        className="w-6 h-6 rounded-full bg-slate-200/60 items-center justify-center"
                      >
                        <Ionicons name="close" size={14} color="#475569" />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TextInput
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        placeholder="e.g. Beverages, Spices, Dairy"
                        placeholderTextColor="#94A3B8"
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleCreateQuickCategory}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-md font-semibold text-slate-800"
                      />
                      <TouchableOpacity
                        onPress={handleCreateQuickCategory}
                        disabled={creatingCategory}
                        className="bg-[#1E3A8A] px-4 py-2.5 rounded-xl items-center justify-center shadow-sm"
                      >
                        {creatingCategory ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text className="text-white text-xs font-bold">Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View className="flex-row flex-wrap mb-4">
                  {categories.map((cat, i) => {
                    const isSelected = formData.category === cat;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setFormData({ ...formData, category: cat })}
                        className={`px-4 py-2.5 rounded-full mr-2 mb-2 ${isSelected ? 'bg-[#1E3A8A] shadow-sm' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-sm text-center font-bold tracking-wide ${isSelected ? 'text-white' : 'text-slate-500'}`}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Inline Quick Add Chip */}
                  <TouchableOpacity
                    onPress={() => setShowQuickCategoryModal(prev => !prev)}
                    className="px-3.5 py-2 rounded-full mr-2 mb-2 bg-amber-50 border border-amber-300 border-dashed flex-row items-center"
                  >
                    <Ionicons name="add" size={14} color="#D97706" style={{ marginRight: 2 }} />
                    <Text className="text-xs font-black text-amber-800">Add Category</Text>
                  </TouchableOpacity>
                </View>

                {/* Unit Selector */}
                <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Unit</Text>
                <View className="flex-row flex-wrap mb-4">
                  {['pcs', 'kg', 'g', 'ltr', 'ml'].map((u, i) => {
                    const isSelected = formData.unit === u;
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setFormData({ ...formData, unit: u })}
                        className={`px-4 py-2.5 rounded-full mr-2 mb-2 ${isSelected ? 'bg-[#1E3A8A] shadow-sm' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-sm text-center font-bold tracking-wide ${isSelected ? 'text-white' : 'text-slate-500'}`}>{u}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Price Row */}
                <View className="flex-row mb-4">
                  <View className="flex-1 mr-3 relative bg-slate-50 border border-slate-200 rounded-2xl">
                    <View pointerEvents="none" className="absolute top-2 left-4 z-10">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Price (₹)</Text>
                    </View>
                    <TextInput
                      className="px-4 pt-6 pb-2 text-md font-semibold text-[#1E3A8A]"
                      value={formData.purchasePrice}
                      onChangeText={(val) => setFormData({ ...formData, purchasePrice: val })}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View className="flex-1 relative bg-slate-50 border border-slate-200 rounded-2xl">
                    <View pointerEvents="none" className="absolute top-2 left-4 z-10">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selling Price (₹)</Text>
                    </View>
                    <TextInput
                      className="px-4 pt-6 pb-2 text-md font-semibold text-[#1E3A8A]"
                      value={formData.sellingPrice}
                      onChangeText={(val) => setFormData({ ...formData, sellingPrice: val })}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                <View className="flex-row mb-8">
                  <View className="flex-1 mr-3 relative bg-slate-50 border border-slate-200 rounded-2xl">
                    <View pointerEvents="none" className="absolute top-2 left-4 z-10">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRP (₹)</Text>
                    </View>
                    <TextInput
                      className="px-4 pt-6 pb-2 text-md font-semibold text-[#1E3A8A]"
                      value={formData.mrp}
                      onChangeText={(val) => setFormData({ ...formData, mrp: val })}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View className="flex-1 relative bg-slate-50 border border-slate-200 rounded-2xl">
                    <View pointerEvents="none" className="absolute top-2 left-4 z-10">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Qty</Text>
                    </View>
                    <View className="flex-row items-center px-4 pt-6 pb-2">
                      <TextInput
                        className="flex-1 text-md font-semibold text-[#1E3A8A]"
                        value={String(formData.stockQty ?? '')}
                        onChangeText={(val) => setFormData({ ...formData, stockQty: val })}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                      />
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => setFormData(prev => ({ ...prev, stockQty: String(Math.max(0, (parseInt(prev.stockQty, 10) || 0) - 1)) }))}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 items-center justify-center shadow-xs"
                        >
                          <Ionicons name="remove" size={12} color="#1E3A8A" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setFormData(prev => ({ ...prev, stockQty: String((parseInt(prev.stockQty, 10) || 0) + 1) }))}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 items-center justify-center shadow-xs"
                        >
                          <Ionicons name="add" size={12} color="#1E3A8A" />
                        </TouchableOpacity>

                      </View>
                    </View>
                  </View>
                </View>

                {/* Product Description */}
                <View className="relative bg-slate-50 border border-slate-200 rounded-2xl mb-5">
                  <View pointerEvents="none" className="absolute top-2 left-4 z-10">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Description</Text>
                  </View>
                  <TextInput
                    className="px-4 pt-6 pb-3 text-sm text-[#1E3A8A]"
                    value={formData.description}
                    onChangeText={(val) => setFormData({ ...formData, description: val })}
                    placeholder="e.g. Pure and natural chakki fresh atta made from golden wheat."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={2}
                  />
                </View>



                {/* Product Options / Variants (e.g. 500g, 1kg) */}
                <View className="mb-6">
                  <View className="flex-row items-center justify-between mb-2">
                    <View>
                      <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Options / Sizes ({formData.variants?.length || 0})
                      </Text>
                      <Text className="text-[10px] text-slate-400">e.g. 1 kg, 500 g with custom prices & stock</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          variants: [
                            ...(prev.variants || []),
                            { label: '', mrp: '', sellingPrice: '', stockQty: '10', unitPrice: '' }
                          ]
                        }));
                      }}
                      className="flex-row items-center bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200"
                    >
                      <Ionicons name="add" size={14} color="#1E3A8A" />
                      <Text className="text-[11px] font-bold text-[#1E3A8A] ml-1">+ Add Option</Text>
                    </TouchableOpacity>
                  </View>

                  {formData.variants && formData.variants.length > 0 ? (
                    formData.variants.map((variant, vIdx) => (
                      <View key={vIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-2.5">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text className="text-xs font-bold text-slate-700">Option #{vIdx + 1}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setFormData(prev => ({
                                ...prev,
                                variants: prev.variants.filter((_, i) => i !== vIdx)
                              }));
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                        {/* Variant Label */}
                        <TextInput
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 mb-2"
                          placeholder="Option label (e.g. 1 kg, 500 g, 2 x 1 L)"
                          placeholderTextColor="#94A3B8"
                          value={variant.label}
                          onChangeText={(t) => {
                            const updated = [...formData.variants];
                            updated[vIdx].label = t;
                            setFormData({ ...formData, variants: updated });
                          }}
                        />

                        <View className="flex-row gap-2 mb-2">
                          <View className="flex-1">
                            <Text className="text-[9px] font-bold text-slate-400 mb-1">Selling Price (₹)</Text>
                            <TextInput
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={variant.sellingPrice}
                              onChangeText={(t) => {
                                const updated = [...formData.variants];
                                updated[vIdx].sellingPrice = t;
                                setFormData({ ...formData, variants: updated });
                              }}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[9px] font-bold text-slate-400 mb-1">MRP (₹)</Text>
                            <TextInput
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={variant.mrp}
                              onChangeText={(t) => {
                                const updated = [...formData.variants];
                                updated[vIdx].mrp = t;
                                setFormData({ ...formData, variants: updated });
                              }}
                            />
                          </View>
                          <View className="flex-1">
                            <Text className="text-[9px] font-bold text-slate-400 mb-1">Stock Qty</Text>
                            <TextInput
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={variant.stockQty}
                              onChangeText={(t) => {
                                const updated = [...formData.variants];
                                updated[vIdx].stockQty = t;
                                setFormData({ ...formData, variants: updated });
                              }}
                            />
                          </View>
                        </View>

                        {/* Unit Price (Optional, e.g. ₹19.7/100 ml) */}
                        <TextInput
                          className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-700"
                          placeholder="Unit price hint (optional, e.g. ₹19.7/100 ml)"
                          placeholderTextColor="#94A3B8"
                          value={variant.unitPrice}
                          onChangeText={(t) => {
                            const updated = [...formData.variants];
                            updated[vIdx].unitPrice = t;
                            setFormData({ ...formData, variants: updated });
                          }}
                        />
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-slate-400 italic">No variants yet. Base price and stock above will be used.</Text>
                  )}
                </View>

                {/* Actions */}
                <View className="flex flex-row align-center gap-3 justify-center">
                  <TouchableOpacity
                    onPress={() => setShowAddModal(false)}
                    className="bg-slate-100 flex-1 rounded-full py-3.5 items-center"
                  >
                    <Text className="text-slate-800 font-bold text-md tracking-wide">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    className="bg-[#1E3A8A] flex-1 rounded-full py-3.5 items-center shadow-md shadow-[#1E3A8A]/30"
                  >
                    <Text className="text-white font-bold text-md tracking-wide">SAVE</Text>
                  </TouchableOpacity>
                </View>

                {editingId && (
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddModal(false);
                      handleDelete(editingId);
                    }}
                    className="mt-3 py-3 items-center flex-row justify-center border border-red-200 bg-red-50 rounded-full"
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text className="text-red-500 font-bold text-xs">Delete Product</Text>
                  </TouchableOpacity>
                )}

              </ScrollView>
            </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>





    </SafeAreaView>
  );
}
