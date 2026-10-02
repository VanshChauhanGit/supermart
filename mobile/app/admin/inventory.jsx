import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, Image, ScrollView, Alert, StatusBar, ActivityIndicator,
  PanResponder, TouchableWithoutFeedback, Dimensions, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
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
  const [categories, setCategories] = useState([]);
  const [popover, setPopover] = useState({ visible: false, item: null, position: { x: 0, y: 0 }, alignTop: false });

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 50) {
          setShowAddModal(false);
        }
      }
    })
  ).current;

  const samplePresets = [
    { label: 'Atta', url: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=400&q=80' },
    { label: 'Milk', url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80' },
    { label: 'Oil', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80' },
    { label: 'Noodles', url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=400&q=80' },
  ];

  const [formData, setFormData] = useState({
    barcode: '890' + Math.floor(1000000000 + Math.random() * 9000000000),
    name: '',
    category: 'Grocery',
    unit: 'pcs',
    purchasePrice: '',
    mrp: '',
    sellingPrice: '',
    stockQty: '',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
  });

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/products`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (e) { }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.filter(c => c.isActive).map(c => c.name));
      }
    } catch (e) { }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

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
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
    });
    setShowAddModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      barcode: item.barcode || '',
      name: item.name || '',
      category: item.category || 'Grocery',
      unit: item.unit || 'pcs',
      purchasePrice: item.purchasePrice ? item.purchasePrice.toString() : '0',
      mrp: item.mrp ? item.mrp.toString() : '0',
      sellingPrice: item.sellingPrice ? item.sellingPrice.toString() : '0',
      stockQty: item.stockQty ? item.stockQty.toString() : '0',
      imageUrl: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
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
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
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
          purchasePrice: Number(formData.purchasePrice),
          mrp: Number(formData.mrp),
          sellingPrice: Number(formData.sellingPrice),
          stockQty: Number(formData.stockQty)
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
        <View className="flex-row items-center mb-2">
          <View className="bg-slate-100 rounded-full px-2 py-0.5 mr-2">
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
      <View className="px-5 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-4xl tracking-tight font-semibold text-[#1E3A8A]">Catalog</Text>
          <Text className="text-xs text-slate-500 font-semibold mt-1">
            {products.length} products · {products.filter(p => p.stockQty <= (p.reorderLevel || 5)).length} low stock
          </Text>
        </View>
        <View className="flex-row">
          {/* <TouchableOpacity
            onPress={() => router.push('/admin/categories')}
            className="bg-slate-200/60 rounded-full px-4 py-3 mr-2"
          >
            <Text className="text-slate-700 text-xs font-black tracking-wide">Categories</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            onPress={handleOpenAdd}
            className="bg-[#1E3A8A] rounded-full px-4 py-3 shadow-sm shadow-[#1E3A8A]/30"
          >
            <Text className="text-white text-sm font-bold tracking-wide">+ Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="mx-5 mb-4">
        <View className="bg-white rounded-full px-4 py-3.5 flex-row items-center border border-slate-300">
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-md font-semibold text-[#1E3A8A]"
            placeholder="Search product name, SKU..."
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
            <Text className="text-xs text-slate-400 mt-1">Tap "+ Add Item" to get started</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isLow = item.stockQty <= (item.reorderLevel || 5);
          let itemRef = null;
          let lastPress = 0;

          const showOptions = () => {
            if (itemRef) {
              itemRef.measure((x, y, width, height, pageX, pageY) => {
                const windowHeight = Dimensions.get('window').height;
                const alignTop = pageY > windowHeight / 2;
                setPopover({
                  visible: true,
                  item,
                  position: { x: pageX, y: pageY, width, height },
                  alignTop
                });
              });
            }
          };

          const handlePress = () => {
            const time = new Date().getTime();
            const delta = time - lastPress;
            const DOUBLE_PRESS_DELAY = 300; // ms
            if (delta < DOUBLE_PRESS_DELAY) {
              showOptions();
            }
            lastPress = time;
          };

          return (
            <TouchableOpacity
              ref={ref => { itemRef = ref; }}
              activeOpacity={0.7}
              onPress={handlePress}
              onLongPress={showOptions}
              className={`bg-white rounded-xl p-2 mb-2 flex-row items-center ${isLow ? 'border border-red-200' : 'border border-slate-300'}`}
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
                  style={{ width: 80, height: 80 }}
                />
                <View className="flex-1">
                  {/* <TextInput
                    className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E3A8A] mb-3"
                    value={formData.imageUrl}
                    onChangeText={(val) => setFormData({ ...formData, imageUrl: val })}
                    placeholder="Paste image URL"
                    placeholderTextColor="#94A3B8"
                  /> */}
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
                    {samplePresets.map((p, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setFormData({ ...formData, imageUrl: p.url })}
                        className="bg-slate-200 rounded-lg px-2.5 py-1.5 mr-2 mb-1.5"
                      >
                        <Text className="text-[11px] font-black text-slate-700 tracking-wide">{p.label}</Text>
                      </TouchableOpacity>
                    ))}
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
                  <TextInput
                    className="px-4 pt-6 pb-2 text-md font-semibold text-[#1E3A8A]"
                    value={formData.stockQty}
                    onChangeText={(val) => setFormData({ ...formData, stockQty: val })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
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

            </ScrollView>
          </View>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Popover Modal */}
      {popover.visible && popover.item && (
        <Modal transparent animationType="fade" visible={popover.visible} onRequestClose={() => setPopover({ visible: false, item: null, position: { x: 0, y: 0 }, alignTop: false })}>
          <TouchableWithoutFeedback onPress={() => setPopover({ visible: false, item: null, position: { x: 0, y: 0 }, alignTop: false })}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }}>

              {/* Highlighted item clone */}
              <View
                style={{
                  position: 'absolute',
                  top: popover.position.y,
                  left: popover.position.x,
                  width: popover.position.width,
                  height: popover.position.height,
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderColor: popover.item.stockQty <= (popover.item.reorderLevel || 5) ? '#fecaca' : '#cbd5e1',
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 6
                }}
              >
                {renderProductItemContent(popover.item, popover.item.stockQty <= (popover.item.reorderLevel || 5))}
              </View>

              <TouchableWithoutFeedback>
                <View
                  style={{
                    position: 'absolute',
                    top: popover.alignTop ? undefined : popover.position.y + popover.position.height + 8,
                    bottom: popover.alignTop ? Dimensions.get('window').height - popover.position.y + 8 : undefined,
                    right: 20,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 5,
                    minWidth: 140
                  }}
                >
                  <TouchableOpacity
                    className="flex-row items-center px-4 py-3 border-b border-slate-100"
                    onPress={() => {
                      const item = popover.item;
                      setPopover({ visible: false, item: null, position: { x: 0, y: 0 }, alignTop: false });
                      handleEdit(item);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color="#64748B" style={{ marginRight: 12 }} />
                    <Text className="text-sm font-bold text-slate-700">Edit Product</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-row items-center px-4 py-3"
                    onPress={() => {
                      const id = popover.item._id;
                      setPopover({ visible: false, item: null, position: { x: 0, y: 0 }, alignTop: false });
                      handleDelete(id);
                    }}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" style={{ marginRight: 12 }} />
                    <Text className="text-sm font-bold text-red-500">Delete Product</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

    </SafeAreaView>
  );
}
