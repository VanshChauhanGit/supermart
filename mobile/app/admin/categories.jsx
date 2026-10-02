import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  Modal, Image, ScrollView, Alert, StatusBar, ActivityIndicator 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      if (data.success) setCategories(data.data);
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
      sortOrder: '1',
      isActive: true
    });
    setShowAddModal(true);
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required!');
        return;
      }
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      let fData = new FormData();
      fData.append('image', { uri: uri, name: 'cat.jpg', type: 'image/jpeg' });
      const response = await fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        body: fData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
      } else {
        Alert.alert('Upload Failed', data.message || 'Error uploading image');
      }
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload image');
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
          sortOrder: Number(formData.sortOrder)
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchCategories();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Remove this category?', [
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
      
      <View className="px-5 pt-6 pb-4 flex-row justify-between items-end">
        <View>
          <Text className="text-4xl tracking-tight font-black text-[#1E3A8A]">Categories</Text>
        </View>
        <TouchableOpacity 
          className="bg-[#1E3A8A] rounded-full px-4 py-3 shadow-sm shadow-[#1E3A8A]/30" 
          onPress={handleOpenAdd}
        >
          <Text className="text-white text-xs font-black tracking-wide">+ Add Category</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={item => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View className="bg-white rounded-[20px] p-4 mb-3 flex-row items-center shadow-sm shadow-slate-200/40 border border-slate-100/50">
            <Image 
              source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} 
              className="w-[72px] h-[72px] rounded-2xl bg-slate-50 mr-4 border border-slate-100" 
            />
            <View className="flex-1">
              <Text className="text-[15px] leading-tight font-black text-[#1E3A8A] mb-1">{item.name}</Text>
              <View className="flex-row items-center mt-1">
                <View className="bg-slate-100 rounded-full px-2 py-0.5 mr-2">
                  <Text className="text-[10px] font-black tracking-wide text-slate-700">Sort: {item.sortOrder}</Text>
                </View>
                <View className={`rounded-full px-2 py-0.5 ${item.isActive ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                  <Text className={`text-[10px] font-black tracking-wide ${item.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                    {item.isActive ? 'Active' : 'Hidden'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} className="bg-red-50 rounded-full w-9 h-9 items-center justify-center ml-2">
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <BlurView intensity={40} tint="dark" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View className="bg-white rounded-t-[32px] max-h-[90%] shadow-2xl overflow-hidden">
            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Handle */}
              <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
              
              <Text className="text-2xl font-black text-[#1E3A8A] tracking-tight mb-6 flex-row items-center">
                {editingId ? 'Edit Category' : 'Add Category'}
              </Text>
              
              {/* Image Preview + Upload */}
              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Image</Text>
              <View className="bg-slate-50 rounded-[20px] p-3 border border-slate-100 flex-row items-center mb-6">
                <Image source={{ uri: formData.imageUrl || 'https://via.placeholder.com/150' }} className="w-[80px] h-[80px] rounded-2xl mr-4 bg-slate-200 border border-slate-100" />
                <View className="flex-1">
                  <TextInput
                    className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#1E3A8A] mb-3"
                    value={formData.imageUrl}
                    onChangeText={(val) => setFormData({ ...formData, imageUrl: val })}
                    placeholder="Paste image URL"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity 
                    className="bg-[#1E3A8A] rounded-lg px-3 py-1.5 flex-row items-center self-start shadow-sm" 
                    onPress={takePhoto}
                    disabled={uploading}
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
                </View>
              </View>

              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Category Name</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-base font-bold text-[#1E3A8A] mb-6"
                value={formData.name}
                onChangeText={(val) => setFormData({ ...formData, name: val })}
                placeholder="e.g. Beverages"
                placeholderTextColor="#94A3B8"
              />

              <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Sort Order</Text>
              <TextInput
                className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-base font-bold text-slate-900 mb-8"
                value={formData.sortOrder.toString()}
                onChangeText={(val) => setFormData({ ...formData, sortOrder: val })}
                keyboardType="numeric"
              />

              <TouchableOpacity
                onPress={handleSave}
                className="bg-[#1E3A8A] rounded-full py-4 items-center mb-3 shadow-sm shadow-[#1E3A8A]/30"
              >
                <Text className="text-white font-black text-base tracking-wide">SAVE CATEGORY</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="bg-slate-100 rounded-full py-4 items-center"
              >
                <Text className="text-slate-600 font-bold text-sm tracking-wide">Cancel</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </BlurView>
      </Modal>

    </SafeAreaView>
  );
}
