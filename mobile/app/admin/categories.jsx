import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  Modal, Image, ScrollView, Alert, StatusBar, ActivityIndicator, Switch 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useApp } from '../../context/AppContext';

export default function AdminCategoriesScreen() {
  const { apiBaseUrl } = useApp();
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    sortOrder: '1',
    isActive: true
  });

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/categories`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      imageUrl: '',
      sortOrder: String(categories.length + 1),
      isActive: true
    });
    setShowAddModal(true);
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      name: item.name || '',
      imageUrl: item.imageUrl || '',
      sortOrder: String(item.sortOrder || '1'),
      isActive: item.isActive !== undefined ? Boolean(item.isActive) : true
    });
    setShowAddModal(true);
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
          await uploadImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          await uploadImage(asset.uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo: ' + (error.message || ''));
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required to choose photos.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await uploadImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          await uploadImage(asset.uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick photo: ' + (error.message || ''));
    }
  };

  const uploadImage = async (imageInput) => {
    setUploading(true);
    try {
      let response;
      if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
        // Base64 upload to /upload/base64
        response = await fetch(`${apiBaseUrl}/upload/base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageInput }),
        });
      } else {
        // Native URI multipart upload - NEVER set Content-Type header manually in React Native
        let fData = new FormData();
        fData.append('image', {
          uri: imageInput,
          name: `cat-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        response = await fetch(`${apiBaseUrl}/upload`, {
          method: 'POST',
          body: fData,
        });
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        Alert.alert('Upload Failed', data.message || 'Could not upload image');
      }
    } catch (error) {
      console.error('Category image upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please check your network connection.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter category name');
      return;
    }
    try {
      const url = editingId ? `${apiBaseUrl}/categories/${editingId}` : `${apiBaseUrl}/categories`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          sortOrder: Number(formData.sortOrder) || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchCategories();
      } else {
        Alert.alert('Failed', data.message || 'Could not save category');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save category: ' + e.message);
    }
  };

  const handleDelete = async (id, catName) => {
    Alert.alert('Confirm Delete', `Are you sure you want to delete "${catName || 'this category'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${apiBaseUrl}/categories/${id}`, { method: 'DELETE' });
            fetchCategories();
          } catch (e) {}
        }
      }
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Top Header with Back Navigation */}
      <View className="px-5 pt-4 pb-4 flex-row justify-between items-center">
        <View className="flex-row items-center flex-1 mr-3">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 justify-center items-center shadow-xs mr-3"
          >
            <Ionicons name="arrow-back" size={18} color="#1E3A8A" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-black text-[#1E3A8A] tracking-tight">Categories</Text>
            <Text className="text-[11px] font-semibold text-slate-400">
              {categories.length} total categories
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          className="bg-[#1E3A8A] rounded-2xl px-4 py-2.5 flex-row items-center shadow-md shadow-[#1E3A8A]/30" 
          onPress={handleOpenAdd}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text className="text-white text-xs font-black tracking-wide">Add Category</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={() => handleEdit(item)}
            className="bg-white rounded-[22px] p-4 mb-3 flex-row items-center shadow-xs border border-slate-100"
          >
            <Image 
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} 
              className="w-[68px] h-[68px] rounded-2xl bg-slate-100 mr-3.5 border border-slate-100" 
            />
            <View className="flex-1">
              <Text className="text-base font-black text-[#1E3A8A] mb-1">{item.name}</Text>
              <View className="flex-row items-center mt-0.5">
                <View className="bg-slate-100 rounded-full px-2 py-0.5 mr-2">
                  <Text className="text-[10px] font-black text-slate-600">Sort: {item.sortOrder}</Text>
                </View>
                <View className={`rounded-full px-2 py-0.5 ${item.isActive ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  <Text className={`text-[10px] font-black ${item.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {item.isActive ? 'Active' : 'Hidden'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons: Edit + Delete */}
            <View className="flex-row items-center ml-2 gap-1.5">
              <TouchableOpacity 
                onPress={() => handleEdit(item)} 
                className="bg-blue-50 border border-blue-200/80 rounded-xl w-9 h-9 items-center justify-center"
              >
                <Ionicons name="pencil" size={15} color="#1E3A8A" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => handleDelete(item._id, item.name)} 
                className="bg-red-50 border border-red-200/80 rounded-xl w-9 h-9 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Add / Edit Category Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <BlurView intensity={40} tint="dark" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-[32px] max-h-[92%] shadow-2xl overflow-hidden">
            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Top Drag Handle */}
              <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-5" />
              
              <View className="flex-row justify-between items-center mb-5">
                <View>
                  <Text className="text-2xl font-black text-[#1E3A8A] tracking-tight">
                    {editingId ? 'Edit Category' : 'Add New Category'}
                  </Text>
                  <Text className="text-xs text-slate-400 font-semibold mt-0.5">
                    {editingId ? 'Modify category name, image and visibility' : 'Create a new storefront category'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              {/* Image Preview + Upload Actions */}
              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Image</Text>
              <View className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex-row items-center mb-5">
                <Image 
                  source={{ uri: formData.imageUrl || 'https://via.placeholder.com/150' }} 
                  className="w-20 h-20 rounded-2xl mr-3.5 bg-slate-200 border border-slate-200" 
                />
                <View className="flex-1">
                  <TextInput
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#1E3A8A] mb-2.5"
                    value={formData.imageUrl}
                    onChangeText={(val) => setFormData({ ...formData, imageUrl: val })}
                    placeholder="Image URL or upload below"
                    placeholderTextColor="#94A3B8"
                  />
                  <View className="flex-row gap-2">
                    <TouchableOpacity 
                      className="bg-[#1E3A8A] rounded-xl px-3 py-2 flex-row items-center shadow-xs" 
                      onPress={takePhoto}
                      disabled={uploading}
                    >
                      <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text className="text-white text-xs font-black">Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      className="bg-slate-200 rounded-xl px-3 py-2 flex-row items-center" 
                      onPress={pickFromGallery}
                      disabled={uploading}
                    >
                      <Ionicons name="images" size={14} color="#334155" style={{ marginRight: 4 }} />
                      <Text className="text-slate-700 text-xs font-black">Gallery</Text>
                    </TouchableOpacity>
                  </View>
                  {uploading && (
                    <View className="flex-row items-center mt-2">
                      <ActivityIndicator size="small" color="#1E3A8A" style={{ marginRight: 6 }} />
                      <Text className="text-[10px] text-slate-500 font-semibold">Uploading...</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Category Name */}
              <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Category Name</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-md font-bold text-[#1E3A8A] mb-5"
                value={formData.name}
                onChangeText={(val) => setFormData({ ...formData, name: val })}
                placeholder="e.g. Beverages, Dairy, Snacks"
                placeholderTextColor="#94A3B8"
              />

              {/* Sort Order */}
              <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Display Sort Order</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-md font-bold text-slate-900 mb-5"
                value={formData.sortOrder.toString()}
                onChangeText={(val) => setFormData({ ...formData, sortOrder: val })}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#94A3B8"
              />

              {/* Visibility Switch */}
              <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                <View className="flex-1 mr-3">
                  <Text className="text-xs font-black text-slate-800 uppercase tracking-wide">Category Active</Text>
                  <Text className="text-xs text-slate-500 font-medium mt-0.5">
                    {formData.isActive ? 'Active and visible in customer storefront' : 'Hidden from storefront'}
                  </Text>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={(val) => setFormData({ ...formData, isActive: val })}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={formData.isActive ? '#1E3A8A' : '#94A3B8'}
                />
              </View>

              {/* Submit Buttons */}
              <TouchableOpacity
                onPress={handleSave}
                className="bg-[#1E3A8A] rounded-2xl py-4 items-center mb-3 shadow-md shadow-[#1E3A8A]/30 flex-row justify-center"
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-sm tracking-wide uppercase">
                  {editingId ? 'Update Category' : 'Save Category'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="bg-slate-100 rounded-2xl py-3.5 items-center"
              >
                <Text className="text-slate-600 font-bold text-xs tracking-wide">Cancel</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </BlurView>
      </Modal>

    </SafeAreaView>
  );
}
