import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useApp } from '../../context/AppContext';

export default function AdminInventoryScreen() {
  const { apiBaseUrl } = useApp();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState([]); // [{ id, uri, error }]
  const [categories, setCategories] = useState([]);
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
    } catch (e) {}
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
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    images: [],
    variants: [],
    description: ''
  }));

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/products`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (_e) { }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.filter(c => c.isActive).map(c => c.name));
      }
    } catch (_e) { }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${apiBaseUrl}/products`).then(r => r.json()).catch(() => ({})),
      fetch(`${apiBaseUrl}/categories`).then(r => r.json()).catch(() => ({}))
    ]).then(([prodRes, catRes]) => {
      if (!active) return;
      if (prodRes?.success) setProducts(prodRes.data);
      if (catRes?.success) {
        setCategories(catRes.data.filter(c => c.isActive).map(c => c.name));
      }
    });
    return () => { active = false; };
  }, [apiBaseUrl]);

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesLow = !filterLowStockOnly || (p.stockQty <= (p.reorderLevel || 5));
    return matchesSearch && matchesLow;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
      name: '',
      category: 'Grocery',
      unit: 'pcs',
      purchasePrice: '',
      mrp: '',
      sellingPrice: '',
      stockQty: '',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
      images: [],
      variants: [],
      description: ''
    });
    setPendingImages([]);
    setShowAddModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setPendingImages([]);
    setFormData({
      barcode: item.barcode || '',
      name: item.name || '',
      category: item.category || 'Grocery',
      unit: item.unit || 'pcs',
      purchasePrice: item.purchasePrice ? item.purchasePrice.toString() : '0',
      mrp: item.mrp ? item.mrp.toString() : '0',
      sellingPrice: item.sellingPrice ? item.sellingPrice.toString() : '0',
      stockQty: item.stockQty ? item.stockQty.toString() : '0',
      imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
      images: Array.isArray(item.images) ? [...item.images] : [],
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

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return;
      }
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickGalleryImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need gallery permissions to pick an image!');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const uploadAdditionalImageBase64 = async (base64, localUri) => {
    const tempId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Add to pendingImages right away so the user immediately sees it with a loading indicator
    setPendingImages(prev => [...prev, { id: tempId, uri: localUri || `data:image/jpeg;base64,${base64}` }]);

    try {
      const response = await fetch(`${apiBaseUrl}/upload/base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
      });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        // Move from pending to actual images list
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), data.imageUrl]
        }));
      } else {
        Alert.alert('Upload Failed', data.message || 'Could not upload image');
      }
    } catch (err) {
      Alert.alert('Upload Error', 'Failed to upload image to server');
    } finally {
      // Remove from pendingImages
      setPendingImages(prev => prev.filter(item => item.id !== tempId));
    }
  };

  const takeAdditionalPhoto = async () => {
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
        // Trigger upload in background without awaiting so user can immediately take/pick more
        uploadAdditionalImageBase64(asset.base64, asset.uri);
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickAdditionalImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission required to upload images.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload all selected images concurrently
        result.assets.forEach(asset => {
          if (asset.base64) {
            uploadAdditionalImageBase64(asset.base64, asset.uri);
          }
        });
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickAdditionalImage = () => {
    Alert.alert(
      'Add Additional Image',
      'Choose an option to add an extra product photo:',
      [
        {
          text: 'Take Photo (Camera)',
          onPress: takeAdditionalPhoto,
        },
        {
          text: 'Choose from Gallery',
          onPress: pickAdditionalImageFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const uploadImage = async (base64String) => {
    setUploading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/upload/base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64String }),
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        Alert.alert('Upload Failed', data.message || 'Could not upload image');
      }
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload image to server');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (pendingImages.length > 0) {
      Alert.alert('Uploading In Progress', 'Please wait a moment for the additional images to finish uploading.');
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter product name');
      return;
    }
    if (!formData.imageUrl.trim()) {
      Alert.alert('Required Image', 'Seller must upload or enter a Product Image URL!');
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
          purchasePrice: Number(formData.purchasePrice) || 0,
          mrp: Number(formData.mrp) || Number(formData.sellingPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          stockQty: Number(formData.stockQty) || 0,
          images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : [],
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
          <View className="bg-slate-100 rounded-full px-2 py-0.5 mr-2">
            <Text className="text-[10px] font-semibold tracking-wide text-slate-700">{item.category}</Text>
          </View>
          {item.barcode ? (
            <Text className="text-[9px] text-slate-400 font-mono">#{item.barcode.slice(-6)}</Text>
          ) : null}
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
      <View className="items-center justify-center pl-2 pr-1">
        <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
          <Ionicons name="pencil" size={13} color="#1E3A8A" />
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

      {/* Search Bar + Barcode Scanner Trigger */}
      <View className="mx-5 mb-2 flex-row items-center gap-2">
        <View className="flex-1 bg-white rounded-full px-4 py-3 flex-row items-center border border-slate-300">
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-md font-semibold text-[#1E3A8A]"
            placeholder="Search name, barcode..."
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

        {/* Barcode Camera Scanner Button */}
        <TouchableOpacity
          onPress={handleOpenScanner}
          className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 justify-center items-center shadow-xs"
        >
          <Ionicons name="barcode-outline" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {/* Low Stock Quick Filter Pill */}
      <View className="mx-5 mb-3 flex-row items-center">
        <TouchableOpacity
          onPress={() => setFilterLowStockOnly(false)}
          className={`px-3 py-1.5 rounded-xl mr-2 border ${
            !filterLowStockOnly ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'
          }`}
        >
          <Text className={`text-xs font-bold ${!filterLowStockOnly ? 'text-white' : 'text-slate-600'}`}>
            All ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterLowStockOnly(true)}
          className={`px-3 py-1.5 rounded-xl border flex-row items-center ${
            filterLowStockOnly ? 'bg-red-500 border-red-500' : 'bg-white border-slate-200'
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

              {/* Image Preview + Upload */}
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Product Photo</Text>
              <View className="bg-slate-50 rounded-xl p-2 border border-slate-100 flex-row items-center mb-6">
                <Image
                  source={{ uri: formData.imageUrl }}
                  className="rounded-xl mr-4 bg-slate-200 border border-slate-100"
                  style={{ width: 80, height: 100 }}
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <View className="flex-row flex-wrap">
                    <TouchableOpacity
                      onPress={takePhoto}
                      disabled={uploading}
                      className="bg-[#1E3A8A] rounded-lg px-3 py-1.5 flex-row items-center mr-2 mb-1.5 shadow-sm"
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text className="text-white text-[11px] font-black tracking-wide">Camera</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={pickGalleryImage}
                      disabled={uploading}
                      className="bg-slate-800 rounded-lg px-3 py-1.5 flex-row items-center mr-2 mb-1.5 shadow-sm"
                    >
                      <Ionicons name="images" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text className="text-white text-[11px] font-black tracking-wide">Gallery</Text>
                    </TouchableOpacity>
                    
                  </View>
                </View>
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
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Category</Text>
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
                      <TouchableOpacity
                        onPress={() => setFormData(prev => ({ ...prev, stockQty: String((parseInt(prev.stockQty, 10) || 0) + 5) }))}
                        className="px-1.5 h-6 rounded-md bg-blue-50 border border-blue-200 items-center justify-center shadow-xs"
                      >
                        <Text className="text-[10px] font-bold text-[#1E3A8A]">+5</Text>
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

              {/* Additional Product Images */}
              <View className="mb-6">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Text className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                      Additional Images ({(formData.images?.length || 0) + (pendingImages.length || 0)})
                    </Text>
                    {pendingImages.length > 0 && (
                      <View className="ml-2 flex-row items-center bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <ActivityIndicator size={10} color="#D97706" style={{ marginRight: 4 }} />
                        <Text className="text-[10px] font-bold text-amber-700">Uploading {pendingImages.length}...</Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      onPress={takeAdditionalPhoto}
                      className="flex-row items-center bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 mr-1.5 active:bg-blue-100"
                    >
                      <Ionicons name="camera" size={13} color="#1E3A8A" />
                      <Text className="text-[11px] font-bold text-[#1E3A8A] ml-1">Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={pickAdditionalImageFromGallery}
                      className="flex-row items-center bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 active:bg-slate-200"
                    >
                      <Ionicons name="images" size={13} color="#334155" />
                      <Text className="text-[11px] font-bold text-slate-700 ml-1">Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {(formData.images && formData.images.length > 0) || (pendingImages && pendingImages.length > 0) ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                    {/* Already uploaded images */}
                    {formData.images?.map((imgUri, idx) => (
                      <View key={`uploaded_${idx}`} className="relative mr-3 w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <Image source={{ uri: imgUri }} className="w-full h-full" resizeMode="cover" />
                        <TouchableOpacity
                          onPress={() => {
                            setFormData(prev => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx)
                            }));
                          }}
                          className="absolute top-0.5 right-0.5 bg-black/60 w-4.5 h-4.5 rounded-full items-center justify-center"
                        >
                          <Ionicons name="close" size={12} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Currently uploading images with loading overlay */}
                    {pendingImages.map((pending) => (
                      <View key={pending.id} className="relative mr-3 w-16 h-16 rounded-xl overflow-hidden border border-blue-300 bg-slate-100">
                        <Image source={{ uri: pending.uri }} className="w-full h-full opacity-60" resizeMode="cover" />
                        <View className="absolute inset-0 bg-black/30 items-center justify-center">
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text className="text-[8px] font-bold text-white mt-1">Uploading</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text className="text-xs text-slate-400 italic">No additional images added yet. Click Camera or Gallery to upload.</Text>
                )}
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
                  className="mt-3 py-2 items-center flex-row justify-center"
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


      {/* Barcode Camera Scanner Modal */}
      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-5 py-3 flex-row justify-between items-center">
            <Text className="text-white font-black text-lg">Scan Barcode</Text>
            <TouchableOpacity
              onPress={() => setScannerVisible(false)}
              className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center overflow-hidden">
            <CameraView
              style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.7 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr']
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            <View className="absolute border-2 border-blue-400 rounded-3xl w-72 h-44 bg-transparent justify-center items-center">
              <View className="w-full h-0.5 bg-blue-400/80" />
            </View>
          </View>

          <View className="p-5 items-center">
            <Text className="text-white text-xs font-semibold text-center mb-2">
              Align product barcode inside frame to search automatically.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
