import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, TextInput,
  TouchableOpacity, ScrollView, StatusBar,
  Dimensions, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Curated Category Metadata & High-Res Fallbacks ────────────
const CATEGORY_META = {
  'ALL': {
    icon: 'grid',
    bg: '#FEF3C7',
    accent: '#B45309',
    tag: 'All Items'
  },
  'Grocery': {
    icon: 'basket',
    bg: '#ECFDF5',
    accent: '#059669',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    tag: 'Daily Staples'
  },
  'Grocery & Atta': {
    icon: 'nutrition',
    bg: '#FEF3C7',
    accent: '#B45309',
    imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    tag: 'Atta & Dal'
  },
  'Dairy & Fresh': {
    icon: 'water',
    bg: '#EFF6FF',
    accent: '#2563EB',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    tag: 'Milk & Eggs'
  },
  'Snacks & Drinks': {
    icon: 'fast-food',
    bg: '#FFFBEB',
    accent: '#D97706',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
    tag: 'Munchies'
  },
  'Electronics': {
    icon: 'hardware-chip',
    bg: '#F1F5F9',
    accent: '#475569',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    tag: 'Gadgets'
  },
  'Beauty': {
    icon: 'sparkles',
    bg: '#FDF2F8',
    accent: '#DB2777',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&w=400&q=80',
    tag: 'Skincare'
  },
  'Personal Care': {
    icon: 'heart',
    bg: '#F5F3FF',
    accent: '#7C3AED',
    imageUrl: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?auto=format&fit=crop&w=400&q=80',
    tag: 'Grooming'
  },
  'Kids': {
    icon: 'happy',
    bg: '#FDF2F8',
    accent: '#EC4899',
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80',
    tag: 'Toys & Care'
  },
  'Decor': {
    icon: 'home',
    bg: '#F0FDF4',
    accent: '#16A34A',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    tag: 'Living Space'
  },
  'Pharmacy': {
    icon: 'medkit',
    bg: '#ECFEFF',
    accent: '#0891B2',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5e4a836eb?auto=format&fit=crop&w=400&q=80',
    tag: 'First Aid'
  },
  'Gifting': {
    icon: 'gift',
    bg: '#FFF1F2',
    accent: '#E11D48',
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80',
    tag: 'Special Gifts'
  },
  'Stationery': {
    icon: 'book',
    bg: '#EFF6FF',
    accent: '#2563EB',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    tag: 'Office & Books'
  },
  'Fun': {
    icon: 'game-controller',
    bg: '#FEF3C7',
    accent: '#D97706',
    imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80',
    tag: 'Games & Play'
  },
  'Kitchenware': {
    icon: 'restaurant',
    bg: '#F8FAFC',
    accent: '#475569',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
    tag: 'Cookware'
  },
  'Household & Cleaning': {
    icon: 'sparkles',
    bg: '#F0FDFA',
    accent: '#0D9488',
    imageUrl: 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?auto=format&fit=crop&w=400&q=80',
    tag: 'Clean & Fresh'
  }
};

const getCategoryMeta = (name) => {
  return CATEGORY_META[name] || {
    icon: 'pricetag',
    bg: '#F8FAFC',
    accent: '#64748B',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    tag: 'Quick Mart'
  };
};

// ── Hero Promotional Banners ─────────────────────────────────
const PROMO_BANNERS = [
  {
    id: 'promo_1',
    badge: 'SUPERFAST ⚡ 10 MINS',
    title: 'Lightning Express',
    subtitle: 'Free delivery on orders above ₹199',
    cta: 'Explore Now',
    bgColor: '#0F172A',
    accentColor: '#F7C400',
    tagColor: '#FEF08A',
    icon: 'flash'
  },
  {
    id: 'promo_2',
    badge: 'DAILY HARVEST 🥛',
    title: 'Farm Fresh Essentials',
    subtitle: 'Milk, bread, farm eggs & seasonal greens',
    cta: 'Shop Fresh',
    bgColor: '#064E3B',
    accentColor: '#34D399',
    tagColor: '#A7F3D0',
    icon: 'leaf'
  },
  {
    id: 'promo_3',
    badge: 'CHILL & CRUNCH 🍿',
    title: 'Midnight Munchies',
    subtitle: 'Chilled drinks, chips & artisanal sweets',
    cta: 'Order Snacks',
    bgColor: '#7C2D12',
    accentColor: '#FB923C',
    tagColor: '#FED7AA',
    icon: 'ice-cream'
  }
];

export default function CustomerHomeScreen() {
  const insets = useSafeAreaInsets();
  const { cart, addToCart, updateCartQty, apiBaseUrl, customerUser } = useApp();

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [dbCategories, setDbCategories] = useState([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Safe Haptic feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_e) { }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${apiBaseUrl}/categories`).then(r => r.json()).catch(() => ({})),
      fetch(`${apiBaseUrl}/products`).then(r => r.json()).catch(() => ({}))
    ]).then(([catRes, prodRes]) => {
      if (!active) return;
      if (catRes?.success) {
        setDbCategories(catRes.data.filter(c => c.isActive));
      }
      if (prodRes?.success) {
        setProducts(prodRes.data);
      }
    });

    return () => { active = false; };
  }, [apiBaseUrl]);

  const onRefresh = () => {
    setRefreshing(true);
    triggerHaptic();
    Promise.all([
      fetch(`${apiBaseUrl}/categories`).then(r => r.json()).catch(() => ({})),
      fetch(`${apiBaseUrl}/products`).then(r => r.json()).catch(() => ({}))
    ]).then(([catRes, prodRes]) => {
      if (catRes?.success) {
        setDbCategories(catRes.data.filter(c => c.isActive));
      }
      if (prodRes?.success) {
        setProducts(prodRes.data);
      }
    }).finally(() => {
      setRefreshing(false);
    });
  };

  // Build dynamic top tabs
  const topTabs = [
    { id: 'ALL', label: 'All', icon: 'grid' },
    ...dbCategories.map(c => {
      const meta = getCategoryMeta(c.name);
      return { id: c.name, label: c.name, icon: meta.icon };
    })
  ];

  // Dynamic Product Filter
  const filtered = products.filter(p => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return (
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.subCategory?.toLowerCase().includes(term)
      );
    }
    if (selectedTab === 'ALL') return true;
    return p.category === selectedTab;
  });

  const cartTotalCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotalPrice = cart.reduce((acc, i) => acc + (i.sellingPrice * i.quantity), 0);

  const getItemQtyInCart = (id) => {
    const found = cart.find(i => i._id === id);
    return found ? found.quantity : 0;
  };

  // Fixed Sticky Header Height
  const HEADER_HEIGHT = insets.top + 154;

  const handleBannerScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
    if (slide !== activeBannerIndex) {
      setActiveBannerIndex(slide);
    }
  };

  // ── Sub-component: Best Seller Quick Strip (Top 5) ───────────
  const bestSellers = products.slice(0, 5);

  const renderListHeader = () => (
    <View style={{ paddingTop: HEADER_HEIGHT + 8 }}>

      {/* ── 1. Hero Promo Carousel (Only on ALL tab & empty search) ── */}
      {selectedTab === 'ALL' && !searchTerm && (
        <View className="mb-4">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleBannerScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {PROMO_BANNERS.map((banner, index) => (
              <View
                key={banner.id}
                className="rounded-3xl p-[18px] justify-between min-h-[130px]"
                style={{
                  width: SCREEN_WIDTH - 32,
                  marginRight: index < PROMO_BANNERS.length - 1 ? 12 : 0,
                  backgroundColor: banner.bgColor,
                }}
              >
                <View>
                  <View className="flex-row justify-between items-center">
                    <View className="bg-white/15 px-2.5 py-1 rounded-full self-start">
                      <Text
                        className="text-[10px] font-black tracking-wide"
                        style={{ color: banner.tagColor }}
                      >
                        {banner.badge}
                      </Text>
                    </View>
                    <Ionicons name={banner.icon} size={24} color={banner.accentColor} />
                  </View>

                  <Text className="text-white text-[19px] font-black mt-2.5 tracking-tight">
                    {banner.title}
                  </Text>
                  <Text className="text-white/80 text-xs font-semibold mt-0.5">
                    {banner.subtitle}
                  </Text>
                </View>

                <View className="flex-row items-center mt-3">
                  <View
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: banner.accentColor }}
                  >
                    <Text className="text-[#0F172A] text-[11px] font-black">
                      {banner.cta} →
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Dots Indicator */}
          <View className="flex-row justify-center items-center mt-2">
            {PROMO_BANNERS.map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full mx-1 ${activeBannerIndex === i ? 'w-4.5 bg-[#F7C400]' : 'w-1.5 bg-slate-200'
                  }`}
              />
            ))}
          </View>
        </View>
      )}

      {/* ── 2. Trust Badges Pill Row ────────────────────────────── */}
      {selectedTab === 'ALL' && !searchTerm && (
        <View className="flex-row justify-between mx-4 mb-4 bg-[#F8FAFC] rounded-2xl py-2.5 px-3.5 border border-slate-200">
          <View className="flex-row items-center">
            <Ionicons name="flash" size={14} color="#D97706" />
            <Text className="text-[11px] font-extrabold text-slate-800 ml-1.5">10 Min Fast</Text>
          </View>
          <View className="w-[1px] h-3.5 bg-slate-300 self-center" />
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={14} color="#059669" />
            <Text className="text-[11px] font-extrabold text-slate-800 ml-1.5">100% Genuine</Text>
          </View>
          <View className="w-[1px] h-3.5 bg-slate-300 self-center" />
          <View className="flex-row items-center">
            <Ionicons name="pricetag" size={14} color="#2563EB" />
            <Text className="text-[11px] font-extrabold text-slate-800 ml-1.5">Best MRP Deals</Text>
          </View>
        </View>
      )}

      {/* ── 3. Visual "Shop by Category" Grid ───────────────────── */}
      {selectedTab === 'ALL' && !searchTerm && dbCategories.length > 0 && (
        <View className="mx-4 mb-5">
          <View className="flex-row justify-between items-center mb-3">
            <View>
              <Text className="text-xl font-bold text-slate-900 tracking-tight">
                Shop by Category
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {dbCategories.map(cat => {
              const meta = getCategoryMeta(cat.name);
              const resolvedImage = (cat.imageUrl && !cat.imageUrl.includes('placeholder'))
                ? cat.imageUrl
                : meta.imageUrl;

              return (
                <TouchableOpacity
                  key={cat._id}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedTab(cat.name);
                  }}
                  activeOpacity={0.8}
                  className="w-[23%] mb-3.5 items-center"
                >
                  <View
                    className="w-full aspect-square rounded-xl items-center justify-center border border-slate-200/80 shadow-xs overflow-hidden mb-1.5"
                    style={{ backgroundColor: meta.bg }}
                  >
                    <Image
                      source={{ uri: resolvedImage }}
                      className="w-full h-full rounded-xl"
                      resizeMode="cover"
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    className="text-[11px] font-extrabold text-slate-900 text-center leading-tight"
                  >
                    {cat.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="text-[9px] font-bold text-center mt-0.5"
                    style={{ color: meta.accent }}
                  >
                    {meta.tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── 4. Horizontal Quick-Picks Shelf (Only on ALL tab) ─────── */}
      {selectedTab === 'ALL' && !searchTerm && bestSellers.length > 0 && (
        <View className="mb-5">
          <View className="flex-row justify-between items-center px-4 mb-2.5">
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-slate-900 mr-1.5">
                Trending Quick-Picks
              </Text>
              <View className="bg-[#EF4444] px-1.5 py-0.5 rounded">
                <Text className="text-white text-[9px] font-black">HOT</Text>
              </View>
            </View>
            <Text className="text-[11px] font-bold text-slate-500">Swipe →</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {bestSellers.map(item => {
              const qty = getItemQtyInCart(item._id);
              const discount = item.mrp > item.sellingPrice
                ? Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100)
                : 0;

              return (
                <View
                  key={`shelf_${item._id}`}
                  className="w-[125px] mr-3.5 justify-between"
                >
                  <View>
                    <View className="w-full aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden mb-2 relative">
                      <Image
                        source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      {discount > 0 && (
                        <View className="absolute top-1.5 left-1.5 bg-[#16A34A] px-1.5 py-0.5 rounded-md shadow-xs">
                          <Text className="text-white text-[9px] font-black">{discount}% OFF</Text>
                        </View>
                      )}
                    </View>

                    <Text numberOfLines={1} className="text-[12px] font-black text-slate-900">
                      {item.name}
                    </Text>
                    <Text className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {item.unit || '1 pc'}
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-[13px] font-black text-slate-900">
                      ₹{item.sellingPrice}
                    </Text>

                    {qty === 0 ? (
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          addToCart(item);
                        }}
                        className="bg-white px-2 py-1 rounded-lg border border-[#F7C400] shadow-xs active:bg-amber-50"
                      >
                        <Text className="text-[#D97706] text-[10px] font-black">+ ADD</Text>
                      </TouchableOpacity>
                    ) : (
                      <View className="flex-row items-center bg-[#F7C400] rounded-lg px-1 py-0.5 border border-[#FACC15]">
                        <TouchableOpacity onPress={() => { triggerHaptic(); updateCartQty(item._id, -1); }}>
                          <Text className="text-slate-900 font-black text-[11px] px-1">-</Text>
                        </TouchableOpacity>
                        <Text className="text-slate-900 font-black text-[11px] px-1">{qty}</Text>
                        <TouchableOpacity onPress={() => { triggerHaptic(); updateCartQty(item._id, 1); }}>
                          <Text className="text-slate-900 font-black text-[11px] px-1">+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── 5. Main Grid Section Header ─────────────────────────── */}
      <View className="mx-4 mb-3.5 flex-row justify-between items-center">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight">
            {searchTerm ? `Results for "${searchTerm}"` : selectedTab === 'ALL' ? 'Explore All Products' : selectedTab}
          </Text>
          {selectedTab === 'ALL' && !searchTerm && (
            <Text className="text-xs font-medium text-slate-500 mt-0.5">
              Best prices & freshest picks for your home
            </Text>
          )}
        </View>

        <View className="bg-slate-100 px-2.5 py-1 rounded-full">
          <Text className="text-xs font-bold text-slate-600">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* Filter Active Breadcrumb */}
      {selectedTab !== 'ALL' && (
        <View className="mx-4 mb-3 flex-row items-center">
          <TouchableOpacity
            onPress={() => setSelectedTab('ALL')}
            className="flex-row items-center bg-slate-100 px-2.5 py-1 rounded-full"
          >
            <Text className="text-[11px] font-extrabold text-slate-600 mr-1">
              Showing: {selectedTab}
            </Text>
            <Ionicons name="close-circle" size={14} color="#64748B" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ══════════════════════════════════════════════════════
          PREMIUM STICKY HEADER (Tailwind / NativeWind)
          ══════════════════════════════════════════════════════ */}
      <View
        className="absolute top-0 left-0 right-0 z-50 bg-white/95 border-b border-slate-200/70 shadow-xs"
        style={{ paddingTop: insets.top }}
      >
        {/* ── Row 1: Delivery Location & Fast Arrival Pill ── */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-1.5">
          {/* Location Details */}
          <View className="flex-1 mr-3">
            <View className="flex-row items-center">
              <View className="bg-[#FEF08A] px-2 py-0.5 rounded-md flex-row items-center mr-1.5">
                <Ionicons name="flash" size={11} color="#854D0E" />
                <Text className="text-[10px] font-black text-[#854D0E] ml-0.5">10 MINS</Text>
              </View>
              <Text className="text-xs font-black text-slate-900">
                Delivery to <Text className="text-amber-600">Home</Text>
              </Text>
              <Ionicons name="chevron-down" size={13} color="#64748B" style={{ marginLeft: 3 }} />
            </View>
            <Text
              numberOfLines={1}
              className="text-[11px] font-medium text-slate-500 mt-0.5"
            >
              {customerUser?.name ? `${customerUser.name} • ` : ''}Sector 62, Noida
            </Text>
          </View>

          {/* User Profile Avatar Link */}
          <TouchableOpacity
            onPress={() => router.push('/customer/profile')}
            activeOpacity={0.8}
            className="w-[38px] h-[38px] rounded-full bg-[#FEF3C7] border-[1.5px] border-[#FACC15] items-center justify-center"
          >
            <Text className="text-[15px] font-black text-[#92400E]">
              {customerUser?.name ? customerUser.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Row 2: Search Bar with Clear & Voice Indicator ── */}
        <View className="mx-4 my-1.5 flex-row items-center bg-[#F8FAFC] rounded-2xl border border-slate-200 px-3.5 h-[46px]">
          <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-[13px] font-medium text-slate-900 py-0"
            placeholder="Search 'milk, tea, coke, chips, atta'..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />

          {searchTerm.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchTerm('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={19} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center">
              <View className="w-[1px] h-4 bg-slate-300 mx-2" />
              <Ionicons name="mic-outline" size={19} color="#475569" />
            </View>
          )}
        </View>

        {/* ── Row 3: Horizontal Pill Tabs with Icons ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 2 }}
        >
          {topTabs.map(tab => {
            const isActive = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  triggerHaptic();
                  setSelectedTab(tab.id);
                  setSearchTerm('');
                }}
                activeOpacity={0.7}
                className={`flex-row items-center px-3 py-1.5 rounded-full mr-2 border shadow-xs ${isActive ? 'bg-[#0F172A] border-[#0F172A]' : 'bg-[#F8FAFC] border-slate-200'
                  }`}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#F7C400' : '#64748B'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  className={`text-xs ${isActive ? 'font-black text-white' : 'font-semibold text-slate-600'
                    }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {/* ─────────────────────────────────────────────── */}

      {/* ── Main Product Grid FlatList ────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        numColumns={2}
        columnWrapperClassName="justify-between px-4"
        contentContainerStyle={{ paddingBottom: cartTotalCount > 0 ? 190 : 130 }}
        ListHeaderComponent={renderListHeader()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F7C400', '#0F172A']}
            tintColor="#F7C400"
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12 px-6">
            <View className="w-[72px] h-[72px] rounded-full bg-[#FEF3C7] items-center justify-center mb-4">
              <Ionicons name="basket-outline" size={36} color="#D97706" />
            </View>
            <Text className="text-base font-black text-slate-900 text-center">
              No items match &apos;{searchTerm || selectedTab}&apos;
            </Text>
            <Text className="text-xs font-medium text-slate-500 text-center mt-1 max-w-[260px]">
              Try searching with different keywords or browse our full store categories.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setSearchTerm('');
                setSelectedTab('ALL');
              }}
              className="mt-4.5 bg-slate-900 px-4 py-2.5 rounded-full"
            >
              <Text className="text-[#F7C400] text-xs font-black">
                Reset & Browse Store
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const qtyInCart = getItemQtyInCart(item._id);
          const discount = item.mrp > item.sellingPrice
            ? Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100)
            : 0;

          return (
            <View className="w-[48%] mb-5 justify-between">
              <View>
                {/* Product Image Frame (4:5 portrait aspect ratio as shown in screenshot) */}
                <View className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 relative mb-2">
                  <Image
                    source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Bookmark Icon in top right */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={triggerHaptic}
                    className="absolute top-2 right-2 bg-black/25 w-7 h-7 rounded-full items-center justify-center z-10"
                  >
                    <Ionicons name="bookmark-outline" size={15} color="#FFFFFF" />
                  </TouchableOpacity>

                  {/* Floating Yellow App Theme Add Button */}
                  {qtyInCart === 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        addToCart(item);
                      }}
                      activeOpacity={0.8}
                      className="absolute bottom-2 right-2 w-9 h-9 bg-white rounded-xl border-[1.5px] border-[#F7C400] items-center justify-center shadow-md z-20 active:bg-amber-50"
                    >
                      <Ionicons name="add" size={22} color="#D97706" />
                    </TouchableOpacity>
                  ) : (
                    <View className="absolute bottom-2 right-2 bg-[#F7C400] rounded-xl px-2 py-1.5 flex-row items-center shadow-md z-20 border border-[#FACC15]">
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          updateCartQty(item._id, -1);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="px-1"
                      >
                        <Text className="text-slate-900 font-black text-xs">-</Text>
                      </TouchableOpacity>
                      <Text className="text-slate-900 font-black text-xs px-1.5">
                        {qtyInCart}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          updateCartQty(item._id, 1);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="px-1"
                      >
                        <Text className="text-slate-900 font-black text-xs">+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Unit / Pieces Badge (e.g. 4 pieces / 1 pc) */}
                <View className="self-start mb-1 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  <Text className="text-blue-600 text-[10px] font-bold">
                    {item.unit ? `${item.unit}` : '1 pc'}
                  </Text>
                </View>

                {/* Price Row: Selling Price + Struck-through MRP */}
                <View className="flex-row items-baseline mt-0.5">
                  <Text className="text-base font-black text-slate-900">
                    ₹{item.sellingPrice}
                  </Text>
                  {item.mrp > item.sellingPrice && (
                    <Text className="text-xs font-semibold text-slate-400 line-through ml-1.5">
                      ₹{item.mrp}
                    </Text>
                  )}
                </View>

                {/* Discount Percentage in Green */}
                {discount > 0 && (
                  <Text className="text-xs font-black text-emerald-600 mt-0.5">
                    {discount}% OFF
                  </Text>
                )}

                {/* Product Name */}
                <Text
                  numberOfLines={2}
                  className="text-[13px] font-bold text-slate-900 leading-snug mt-1 h-[36px]"
                >
                  {item.name}
                </Text>
              </View>

              {/* Bottom Weight/Volume Spec Badge */}
              <View className="self-start mt-2">
                <View className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-bold text-slate-600">
                    {item.unit || 'Standard'}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ══════════════════════════════════════════════════════
          PREMIUM FLOATING VIEW CART PILL
          ══════════════════════════════════════════════════════ */}
      {cartTotalCount > 0 && (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 items-center z-50"
          style={{ bottom: Math.max(insets.bottom, 8) + 65  }}
        >
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              router.push('/customer/cart');
            }}
            activeOpacity={0.9}
            className="bg-white/95 rounded-[36px] py-2 px-3.5 flex-row items-center border border-[#F7C400]/50 shadow-lg"
          >
            {/* Left Yellow Cart Icon Circle */}
            <View className="w-[38px] h-[38px] rounded-full bg-[#F7C400] items-center justify-center mr-2.5 shrink-0">
              <Ionicons name="cart" size={19} color="#111827" />
            </View>

            {/* Middle Details (auto-expands to fit text) */}
            <View className="mr-3 justify-center">
              <Text numberOfLines={1} className="text-[#111827] text-[13px] font-black tracking-tight">
                View cart
              </Text>
              <Text numberOfLines={1} className="text-[#4B5563] text-[11px] font-bold mt-0.5">
                {cartTotalCount} {cartTotalCount === 1 ? 'Item' : 'Items'} • ₹{cartTotalPrice}
              </Text>
            </View>

            {/* Right Yellow Chevron Action Circle */}
            <View className="w-[34px] h-[34px] rounded-full bg-[#F7C400] items-center justify-center shrink-0">
              <Ionicons name="chevron-forward" size={18} color="#111827" />
            </View>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}
