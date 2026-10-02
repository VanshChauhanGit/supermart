import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, TextInput,
  TouchableOpacity, ScrollView, StatusBar, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();
  const { cart, addToCart, updateCartQty, apiBaseUrl } = useApp();

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/categories`)
      .then(res => res.json())
      .then(data => { if (data.success) setDbCategories(data.data.filter(c => c.isActive)); })
      .catch(() => { });
  }, [apiBaseUrl]);

  // Top navigation tabs dynamically built from API categories
  const topTabs = [
    { id: 'ALL', label: 'All', icon: 'grid' },
    ...dbCategories.map(c => ({ id: c.name, label: c.name, icon: 'pricetag-outline' }))
  ];

  // 1. Grocery & Kitchen Category Grid
  const groceryCategories = [
    {
      id: 'veg_fruit',
      title: 'Vegetables &\nFruits',
      categoryKey: 'Dairy & Fresh',
      bgColor: '#EAF7ED',
      imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'atta_rice',
      title: 'Atta, Rice &\nDal',
      categoryKey: 'Grocery & Atta',
      bgColor: '#FDF2E9',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'oil_masala',
      title: 'Oil, Ghee &\nMasala',
      categoryKey: 'Grocery & Atta',
      bgColor: '#FEF9E7',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'dairy_egg',
      title: 'Dairy, Bread\n& Eggs',
      categoryKey: 'Dairy & Fresh',
      bgColor: '#EBF5FB',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'bakery_biscuits',
      title: 'Bakery &\nBiscuits',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#FFF8E7',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'dry_fruits',
      title: 'Dry Fruits &\nCereals',
      categoryKey: 'Grocery & Atta',
      bgColor: '#FFF3E0',
      imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'meat_fish',
      title: 'Chicken,\nMeat & Fish',
      categoryKey: 'Dairy & Fresh',
      bgColor: '#FDEDEC',
      imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'kitchenware',
      title: 'Kitchenware &\nAppliances',
      categoryKey: 'Kitchenware',
      bgColor: '#F2F4F4',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=300&q=80'
    }
  ];

  // 2. Snacks & Drinks Category Grid (Matching Screenshot - Row 1 & Row 2!)
  const snacksCategories = [
    {
      id: 'chips_namkeen',
      title: 'Chips &\nNamkeen',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#FEF9E7',
      imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'sweets_choco',
      title: 'Sweets &\nChocolates',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#F3E5F5',
      imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'drinks_juices',
      title: 'Drinks &\nJuices',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#E8F5E9',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'tea_coffee',
      title: 'Tea, Coffee\n& Milk Drinks',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#E0F2F1',
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'instant_noodles',
      title: 'Instant Noodles\n& Pasta',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#FFF9C4',
      imageUrl: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'sauces_spreads',
      title: 'Sauces &\nSpreads',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#FFEBEE',
      imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'mouth_fresheners',
      title: 'Pan Corner &\nFresheners',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#E0F2F1',
      imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'ice_creams',
      title: 'Ice Creams &\nDesserts',
      categoryKey: 'Snacks & Drinks',
      bgColor: '#FFFDE7',
      imageUrl: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=300&q=80'
    }
  ];

  // 3. Beauty & Personal Care Category Grid
  const beautyCategories = [
    {
      id: 'bath_body',
      title: 'Bath &\nBody',
      categoryKey: 'Personal Care',
      bgColor: '#E3F2FD',
      imageUrl: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'hair_care',
      title: 'Hair &\nShampoo',
      categoryKey: 'Personal Care',
      bgColor: '#FCE4EC',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'skin_care',
      title: 'Skin &\nFace Creams',
      categoryKey: 'Personal Care',
      bgColor: '#FBE9E7',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'baby_hygiene',
      title: 'Baby Care &\nHygiene',
      categoryKey: 'Personal Care',
      bgColor: '#F3E5F5',
      imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=300&q=80'
    }
  ];

  // 4. Electronics Category Grid
  const electronicsCategories = [
    {
      id: 'headphones',
      title: 'Headphones &\nEarbuds',
      categoryKey: 'Kitchenware',
      bgColor: '#ECEFF1',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'chargers',
      title: 'Chargers &\nCables',
      categoryKey: 'Kitchenware',
      bgColor: '#E1F5FE',
      imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'trimmers',
      title: 'Grooming &\nTrimmers',
      categoryKey: 'Kitchenware',
      bgColor: '#E0F7FA',
      imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 'smart_home',
      title: 'Smart Home &\nSockets',
      categoryKey: 'Kitchenware',
      bgColor: '#E8EAF6',
      imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=300&q=80'
    }
  ];

  // Fetch product catalog from backend API
  useEffect(() => {
    fetch(`${apiBaseUrl}/products`)
      .then(res => res.json())
      .then(data => { if (data.success) setProducts(data.data); })
      .catch(() => { });
  }, [apiBaseUrl]);

  // Dynamic Product Filter depending on Selected Top Tab or Search Term
  const filtered = products.filter(p => {
    if (searchTerm) return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (selectedTab === 'ALL') return true;
    return p.category === selectedTab;
  });

  const cartTotalCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotalPrice = cart.reduce((acc, i) => acc + (i.sellingPrice * i.quantity), 0);

  const getItemQtyInCart = (id) => {
    const found = cart.find(i => i._id === id);
    return found ? found.quantity : 0;
  };

  // Header height: top inset + 10 (top margin) + 46 (search bar) + 10 (bottom margin) + 58 (tabs with padding)
  const HEADER_HEIGHT = insets.top + 124;

  const ListHeaderComponent = () => (
    <View style={{ paddingTop: HEADER_HEIGHT + 8 }}>

      {/* ── Dynamic Tab View Renderers ────────────────────────── */}
      {selectedTab === 'ALL' && dbCategories.length > 0 && (
        <View className="mt-2 px-4">
          <Text className="text-base font-black text-slate-900 mb-3">Shop by Category</Text>
          <View className="flex-row flex-wrap justify-between">
            {dbCategories.map(cat => (
              <TouchableOpacity
                key={cat._id}
                onPress={() => setSelectedTab(cat.name)}
                activeOpacity={0.8}
                className="w-[23%] mb-4 items-center"
              >
                <View
                  className="w-full aspect-square rounded-2xl items-center justify-center mb-1.5 shadow-sm border border-slate-200/60 bg-[#F8FAFC]"
                >
                  <Image
                    source={{ uri: cat.imageUrl || 'https://via.placeholder.com/150' }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                </View>
                <Text className="text-[11px] font-semibold text-slate-800 text-center leading-tight">
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Bestsellers Section Header ───────────────────────────────── */}
      <View className="mt-4 px-4 flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <Text className="text-base font-black text-slate-900 mr-2">Instant Delivery Items</Text>
          <View className="bg-[#F7C400] px-2 py-0.5 rounded-md">
            <Text className="text-[9px] font-black text-[#111827]">⚡ 10 MINS</Text>
          </View>
        </View>
        <Text className="text-xs text-slate-400 font-bold">{filtered.length} Items</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ══════════════════════════════════════════════════════
          STATIC TOP HEADER — Exact Blinkit screenshot match
          ══════════════════════════════════════════════════════ */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255,255,255,0.92)',
          paddingTop: insets.top,
        }}
      >
        {/* ── Search Bar: large pill, white bg, divider + mic ── */}
        <View style={{
          marginHorizontal: 14,
          marginTop: 10,
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 50,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          paddingLeft: 16,
          paddingRight: 14,
          paddingVertical: 11,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.07,
          shadowRadius: 6,
          elevation: 3,
        }}>
          <Ionicons name="search" size={19} color="#6B7280" style={{ marginRight: 10 }} />
          <TextInput
            style={{ flex: 1, fontSize: 14, fontWeight: '400', color: '#111827', padding: 0 }}
            placeholder="Search for atta, dal, coke and more"
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {/* Vertical divider */}
          <View style={{ width: 1, height: 22, backgroundColor: '#CBD5E1', marginHorizontal: 12 }} />
          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={21} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="mic" size={21} color="#374151" />
          )}
        </View>

        {/* ── Category Tabs: flat icons, no boxes, thick underline on active ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {topTabs.map(tab => {
            const isActive = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => { setSelectedTab(tab.id); setSearchTerm(''); }}
                activeOpacity={0.7}
                style={{
                  alignItems: 'center',
                  marginRight: 30,
                  paddingBottom: 10,
                  borderBottomWidth: isActive ? 3 : 0,
                  borderBottomColor: '#111827',
                }}
              >
                <Ionicons
                  name={tab.icon}
                  size={24}
                  color={isActive ? '#111827' : '#6B7280'}
                  style={{ marginBottom: 5 }}
                />
                <Text style={{
                  fontSize: 12,
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? '#111827' : '#6B7280',
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {/* ─────────────────────────────────────────────── */}

      {/* Main Content Grid */}

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: cartTotalCount > 0 ? 190 : 130 }}
        ListHeaderComponent={<ListHeaderComponent />}
        renderItem={({ item }) => {
          const qtyInCart = getItemQtyInCart(item._id);
          const discount = Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100);

          return (
            <View className="w-[48%] bg-white rounded-3xl p-3 mb-3.5 border border-slate-200 shadow-sm relative justify-between">

              <View>
                {/* 10 MINS & Discount Badges */}
                <View className="flex-row justify-between items-center mb-1 z-10">
                  <View className="bg-slate-100 px-1.5 py-0.5 rounded-md flex-row items-center border border-slate-200">
                    <Ionicons name="timer-outline" size={10} color="#1E293B" />
                    <Text className="text-[8px] font-black text-slate-800 ml-0.5">10 MINS</Text>
                  </View>
                  {discount > 0 && (
                    <View className="bg-emerald-600 px-1.5 py-0.5 rounded-md">
                      <Text className="text-white text-[8px] font-black">{discount}% OFF</Text>
                    </View>
                  )}
                </View>

                {/* Product Image */}
                <View className="w-full h-28 bg-white items-center justify-center my-1 rounded-2xl overflow-hidden">
                  <Image
                    source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                </View>

                {/* Category & Title */}
                <Text className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-0.5">{item.category}</Text>
                <Text className="text-xs font-black text-slate-900 h-8" numberOfLines={2}>{item.name}</Text>
                <Text className="text-[10px] text-slate-400 font-semibold my-1">{item.unit}</Text>
              </View>

              {/* Price & Quantity Selector */}
              <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-slate-100">
                <View>
                  <Text className="text-sm font-black text-slate-900">₹{item.sellingPrice}</Text>
                  <Text className="text-[10px] text-slate-400 line-through font-medium">₹{item.mrp}</Text>
                </View>

                {qtyInCart === 0 ? (
                  <TouchableOpacity
                    className="bg-[#111827] rounded-xl px-3 py-1.5 shadow-sm border border-slate-900 flex-row items-center"
                    onPress={() => addToCart(item)}
                    activeOpacity={0.8}
                  >
                    <Text className="text-[#F7C400] text-xs font-black">+ ADD</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-emerald-700 rounded-xl px-2 py-1 flex-row items-center shadow-sm">
                    <TouchableOpacity
                      onPress={() => updateCartQty(item._id, -1)}
                      className="px-1"
                    >
                      <Text className="text-white font-black text-xs">-</Text>
                    </TouchableOpacity>
                    <Text className="text-white font-black text-xs px-2">{qtyInCart}</Text>
                    <TouchableOpacity
                      onPress={() => updateCartQty(item._id, 1)}
                      className="px-1"
                    >
                      <Text className="text-white font-black text-xs">+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

            </View>
          );
        }}
      />

      {/* ── Floating Translucent View Cart Banner ── */}
      {cartTotalCount > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/customer/cart')}
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            bottom: Math.max(insets.bottom, 8) + 78,
            left: 100,
            right: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 36,
            paddingVertical: 8,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: 'rgba(247, 196, 0, 0.5)',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
            zIndex: 50,
          }}
        >
          {/* Left Yellow Cart Icon Circle + Details */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#F7C400',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Ionicons name="cart" size={19} color="#111827" />
            </View>
            <View>
              <Text style={{ color: '#111827', fontSize: 13, fontWeight: '900', letterSpacing: -0.2 }}>
                View cart
              </Text>
              <Text style={{ color: '#4B5563', fontSize: 11, fontWeight: '700', marginTop: 1 }}>
                {cartTotalCount} {cartTotalCount === 1 ? 'Item' : 'Items'} • ₹{cartTotalPrice}
              </Text>
            </View>
          </View>

          {/* Right Yellow Chevron Action Circle */}
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: '#F7C400',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-forward" size={18} color="#111827" />
          </View>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}


