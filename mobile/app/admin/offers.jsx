import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, 
  Modal, ScrollView, Alert, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function AdminOffersScreen() {
  const { apiBaseUrl } = useApp();
  const [offers, setOffers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderValue: '0',
    maxDiscount: '',
    isActive: true
  });

  const fetchOffers = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/offers/admin`);
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      code: '', title: '', description: '', discountType: 'PERCENTAGE',
      discountValue: '', minOrderValue: '0', maxDiscount: '', isActive: true
    });
    setShowAddModal(true);
  };

  const handleEdit = (offer) => {
    setEditingId(offer._id);
    setFormData({
      code: offer.code,
      title: offer.title,
      description: offer.description || '',
      discountType: offer.discountType,
      discountValue: offer.discountValue.toString(),
      minOrderValue: offer.minOrderValue.toString(),
      maxDiscount: offer.maxDiscount ? offer.maxDiscount.toString() : '',
      isActive: offer.isActive
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.title || !formData.discountValue) {
      Alert.alert('Required', 'Please fill all mandatory fields.');
      return;
    }
    try {
      const url = editingId ? `${apiBaseUrl}/offers/${editingId}` : `${apiBaseUrl}/offers`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discountValue: Number(formData.discountValue),
          minOrderValue: Number(formData.minOrderValue) || 0,
          maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        fetchOffers();
      } else {
        Alert.alert('Error', data.message || 'Failed to save offer');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save offer');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Delete this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${apiBaseUrl}/offers/${id}`, { method: 'DELETE' });
            fetchOffers();
          } catch (e) {}
        }
      }
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <View className="flex-1 p-4">
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-black text-slate-900">Offers & Promo</Text>
          <TouchableOpacity 
            className="bg-[#28469E] rounded-2xl px-4 py-2.5 justify-center shadow-md shadow-[#28469E]/20" 
            onPress={handleOpenAdd}
          >
            <Text className="text-white font-extrabold text-xs">+ Add Offer</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={offers}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="bg-white rounded-2xl p-4 mb-3 border border-slate-200 shadow-sm"
              onPress={() => handleEdit(item)}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="bg-emerald-100 px-2 py-1 rounded-lg">
                  <Text className="text-emerald-800 font-bold text-xs">{item.code}</Text>
                </View>
                <View className="flex-row">
                  <View className={`px-2 py-1 rounded-lg ${item.isActive ? 'bg-blue-100' : 'bg-slate-200'} mr-2`}>
                    <Text className={`text-xs font-bold ${item.isActive ? 'text-blue-800' : 'text-slate-600'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item._id)}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-base font-black text-slate-900 mb-1">{item.title}</Text>
              <Text className="text-xs text-slate-500 mb-2">{item.description}</Text>
              
              <View className="flex-row flex-wrap border-t border-slate-100 pt-2 mt-1">
                <Text className="text-[11px] font-medium text-slate-600 mr-3">
                  Type: <Text className="font-bold text-slate-800">{item.discountType}</Text>
                </Text>
                <Text className="text-[11px] font-medium text-slate-600 mr-3">
                  Value: <Text className="font-bold text-slate-800">{item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `₹${item.discountValue}`}</Text>
                </Text>
                <Text className="text-[11px] font-medium text-slate-600">
                  Min Order: <Text className="font-bold text-slate-800">₹{item.minOrderValue}</Text>
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />

        <Modal visible={showAddModal} animationType="slide" transparent>
          <View className="flex-1 bg-slate-900/60 justify-end">
            <ScrollView className="bg-white rounded-t-3xl p-5 max-h-[90%] shadow-2xl">
              <Text className="text-lg font-black text-slate-900 mb-4">
                {editingId ? 'Edit Offer' : 'Create Offer'}
              </Text>
              
              <Text className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Promo Code:</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-3 text-sm font-bold text-slate-900 mb-3"
                value={formData.code}
                onChangeText={(val) => setFormData({ ...formData, code: val.toUpperCase() })}
                placeholder="e.g. DIWALI50"
                autoCapitalize="characters"
              />

              <Text className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Offer Title:</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-900 mb-3"
                value={formData.title}
                onChangeText={(val) => setFormData({ ...formData, title: val })}
                placeholder="e.g. 50% Off on Groceries"
              />

              <Text className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Discount Type:</Text>
              <View className="flex-row mb-3">
                {['PERCENTAGE', 'FLAT', 'FREE_DELIVERY'].map(type => (
                  <TouchableOpacity 
                    key={type}
                    onPress={() => setFormData({ ...formData, discountType: type })}
                    className={`px-3 py-2 rounded-xl mr-2 border ${formData.discountType === type ? 'bg-[#28469E] border-[#28469E]' : 'bg-white border-slate-300'}`}
                  >
                    <Text className={`text-xs font-bold ${formData.discountType === type ? 'text-white' : 'text-slate-600'}`}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Discount Value:</Text>
              <TextInput
                className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-3 text-sm font-semibold text-slate-900 mb-3"
                value={formData.discountValue}
                onChangeText={(val) => setFormData({ ...formData, discountValue: val })}
                keyboardType="numeric"
                placeholder={formData.discountType === 'PERCENTAGE' ? "e.g. 20 (for 20%)" : "e.g. 100 (for ₹100 off)"}
              />

              <View className="flex-row justify-between mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Min Order (₹):</Text>
                  <TextInput
                    className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900"
                    value={formData.minOrderValue}
                    onChangeText={(val) => setFormData({ ...formData, minOrderValue: val })}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Max Cap (₹):</Text>
                  <TextInput
                    className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-900"
                    value={formData.maxDiscount}
                    onChangeText={(val) => setFormData({ ...formData, maxDiscount: val })}
                    keyboardType="numeric"
                    placeholder="Optional"
                  />
                </View>
              </View>

              <View className="flex-row items-center mb-6 mt-2">
                <Text className="text-sm font-bold text-slate-800 mr-4">Status:</Text>
                <TouchableOpacity 
                  onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`px-4 py-2 rounded-xl ${formData.isActive ? 'bg-emerald-100' : 'bg-slate-200'}`}
                >
                  <Text className={`font-bold ${formData.isActive ? 'text-emerald-800' : 'text-slate-600'}`}>
                    {formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-8">
                <TouchableOpacity className="bg-[#28469E] rounded-2xl py-3.5 items-center mb-2 shadow-md shadow-[#28469E]/30" onPress={handleSave}>
                  <Text className="text-white font-extrabold text-sm">SAVE OFFER</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-slate-100 rounded-2xl py-3 items-center" onPress={() => setShowAddModal(false)}>
                  <Text className="text-slate-600 font-bold text-xs">Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}
