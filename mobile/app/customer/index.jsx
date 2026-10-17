import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, Image, TextInput,
  TouchableOpacity, ScrollView, StatusBar,
  Dimensions, RefreshControl, Animated,
  StyleSheet, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useApp } from '../../context/AppContext';
import VoiceSearchModal from '../../components/VoiceSearchModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_CARD_WIDTH = SCREEN_WIDTH - 32;
const BANNER_GAP = 12;
const BANNER_SNAP_INTERVAL = BANNER_CARD_WIDTH + BANNER_GAP;

const PRODUCT_GRID_PADDING = 14;
const PRODUCT_GRID_GAP = 8;
const PRODUCT_ITEM_WIDTH = Math.floor((SCREEN_WIDTH - (PRODUCT_GRID_PADDING * 2) - (PRODUCT_GRID_GAP * 2)) / 3);

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

// ── Hero Promotional Banners (Frosted Glassmorphism Edition) ──
const PROMO_BANNERS = [
  {
    id: 'promo_1',
    badge: 'SUPERFAST ⚡ 10 MINS',
    title: 'Lightning Express',
    subtitle: 'Free delivery on orders above ₹199',
    cta: 'Explore Now',
    baseBg: '#090D16',
    glow1: '#EAB308',
    glow2: '#3B82F6',
    accentColor: '#FACC15',
    tagColor: '#FEF08A',
    borderColor: 'rgba(250, 204, 21, 0.28)',
    icon: 'flash'
  },
  {
    id: 'promo_2',
    badge: 'DAILY HARVEST 🥛',
    title: 'Farm Fresh Essentials',
    subtitle: 'Milk, bread, farm eggs & seasonal greens',
    cta: 'Shop Fresh',
    baseBg: '#03251B',
    glow1: '#10B981',
    glow2: '#06B6D4',
    accentColor: '#34D399',
    tagColor: '#A7F3D0',
    borderColor: 'rgba(52, 211, 153, 0.28)',
    icon: 'leaf'
  },
  {
    id: 'promo_3',
    badge: 'CHILL & CRUNCH 🍿',
    title: 'Midnight Munchies',
    subtitle: 'Chilled drinks, chips & artisanal sweets',
    cta: 'Order Snacks',
    baseBg: '#2D0F06',
    glow1: '#F97316',
    glow2: '#EC4899',
    accentColor: '#FB923C',
    tagColor: '#FED7AA',
    borderColor: 'rgba(251, 146, 60, 0.28)',
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
  const [refreshing, setRefreshing] = useState(false);
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

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

  // Dynamic Sticky Header Height (measured dynamically via onLayout)
  const [headerHeight, setHeaderHeight] = useState(insets.top + 98);

  const bannerScrollRef = useRef(null);
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const bannerIndexRef = useRef(0);

  // Auto-scroll hero promo banner every 5 seconds
  useEffect(() => {
    if (selectedTab !== 'ALL' || Boolean(searchTerm)) return;
    const timer = setInterval(() => {
      const next = (bannerIndexRef.current + 1) % PROMO_BANNERS.length;
      bannerIndexRef.current = next;
      bannerScrollRef.current?.scrollTo({
        x: next * BANNER_SNAP_INTERVAL,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedTab, searchTerm]);

  const handleMomentumScrollEnd = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const slide = Math.round(xOffset / BANNER_SNAP_INTERVAL);
    bannerIndexRef.current = Math.max(0, Math.min(PROMO_BANNERS.length - 1, slide));
  };

  // ── Sub-component: Best Seller Quick Strip (Top 5) ───────────
  const bestSellers = products.slice(0, 5);

  const renderListHeader = () => (
    <View style={{ paddingTop: headerHeight + 6 }}>

      {/* ── 1. Hero Promo Carousel (Only on ALL tab & empty search) ── */}
      {selectedTab === 'ALL' && !searchTerm && (
        <View className="mb-4">
          <Animated.ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum={true}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {PROMO_BANNERS.map((banner, index) => (
              <View
                key={banner.id}
                className="rounded-3xl justify-between min-h-[142px] overflow-hidden relative"
                style={{
                  width: BANNER_CARD_WIDTH,
                  marginRight: index < PROMO_BANNERS.length - 1 ? BANNER_GAP : 0,
                  backgroundColor: banner.baseBg,
                  borderWidth: 1,
                  borderTopWidth: 0,
                  borderColor: banner.borderColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.16,
                  shadowRadius: 10,
                  elevation: 4,
                }}
              >
                {/* Ambient Glowing Orbs behind the frosted glass */}
                <View
                  style={{
                    position: 'absolute',
                    top: -35,
                    right: -20,
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    backgroundColor: banner.glow1,
                    opacity: 0.42,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: -40,
                    left: 20,
                    width: 130,
                    height: 130,
                    borderRadius: 65,
                    backgroundColor: banner.glow2,
                    opacity: 0.32,
                  }}
                />

                {/* Native Frosted Blur Layer */}
                <BlurView
                  intensity={Platform.OS === 'ios' ? 28 : 50}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />

                {/* Subtle Radial Gloss Reflection */}
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '60%',
                    height: '55%',
                    backgroundColor: 'rgba(255, 255, 255, 0.035)',
                    borderBottomRightRadius: 80,
                  }}
                />

                {/* Foreground Glass Content */}
                <View className="p-[18px] justify-between flex-1">
                  <View>
                    <View className="flex-row justify-between items-center">
                      {/* Frosted Glass Badge Pill */}
                      <View
                        className="px-2.5 py-1 rounded-full self-start flex-row items-center"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.22)',
                        }}
                      >
                        <Text
                          className="text-[10px] font-black tracking-wide"
                          style={{ color: banner.tagColor }}
                        >
                          {banner.badge}
                        </Text>
                      </View>

                      {/* Frosted Glass Icon Badge */}
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.22)',
                        }}
                      >
                        <Ionicons name={banner.icon} size={20} color={banner.accentColor} />
                      </View>
                    </View>

                    <Text className="text-white text-[19px] font-black mt-2 tracking-tight">
                      {banner.title}
                    </Text>
                    <Text className="text-white/80 text-xs font-semibold mt-0.5">
                      {banner.subtitle}
                    </Text>
                  </View>

                  <View className="flex-row items-center mt-3">
                    <View
                      className="px-3 py-1.5 rounded-full flex-row items-center"
                      style={{
                        backgroundColor: banner.accentColor,
                        shadowColor: banner.accentColor,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        elevation: 2,
                      }}
                    >
                      <Text className="text-[#090D16] text-[11px] font-black mr-1">
                        {banner.cta}
                      </Text>
                      <Ionicons name="arrow-forward" size={12} color="#090D16" />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </Animated.ScrollView>

          {/* Smooth Continuous Animated Dots Indicator */}
          <View className="flex-row justify-center items-center mt-3">
            {PROMO_BANNERS.map((_, i) => {
              const inputRange = [
                (i - 1) * BANNER_SNAP_INTERVAL,
                i * BANNER_SNAP_INTERVAL,
                (i + 1) * BANNER_SNAP_INTERVAL,
              ];

              const dotWidth = bannerScrollX.interpolate({
                inputRange,
                outputRange: [6, 16, 6],
                extrapolate: 'clamp',
              });

              const dotColor = bannerScrollX.interpolate({
                inputRange,
                outputRange: ['#CBD5E1', '#F7C400', '#CBD5E1'],
                extrapolate: 'clamp',
              });

              const dotOpacity = bannerScrollX.interpolate({
                inputRange,
                outputRange: [0.65, 1, 0.65],
                extrapolate: 'clamp',
              });

              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic();
                    bannerIndexRef.current = i;
                    bannerScrollRef.current?.scrollTo({
                      x: i * BANNER_SNAP_INTERVAL,
                      animated: true,
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  style={{ paddingHorizontal: 3 }}
                >
                  <Animated.View
                    style={{
                      width: dotWidth,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: dotColor,
                      opacity: dotOpacity,
                    }}
                  />
                </TouchableOpacity>
              );
            })}
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
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          if (height > 0 && Math.abs(height - headerHeight) > 1) {
            setHeaderHeight(height);
          }
        }}
        className="absolute top-0 left-0 right-0 z-50 bg-white/95 border-b border-slate-200/70 shadow-xs"
        style={{ paddingTop: insets.top }}
      >
        {/* ── Row 1: Delivery Location & Fast Arrival Pill ── */}
        {/* <View className="flex-row items-center justify-between px-4 pt-2 pb-1.5">
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


          <TouchableOpacity
            onPress={() => router.push('/customer/profile')}
            activeOpacity={0.8}
            className="w-[38px] h-[38px] rounded-full bg-[#FEF3C7] border-[1.5px] border-[#FACC15] items-center justify-center"
          >
            <Text className="text-[15px] font-black text-[#92400E]">
              {customerUser?.name ? customerUser.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </TouchableOpacity>
        </View> */}

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
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setSearchTerm('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={19} color="#94A3B8" />
              </TouchableOpacity>
              <View className="w-[1px] h-4 bg-slate-300 mx-2" />
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setVoiceModalVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Ionicons name="mic" size={19} color="#D97706" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-[1px] h-4 bg-slate-300 mx-2" />
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setVoiceModalVisible(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
                className="p-1 -mr-1"
              >
                <Ionicons name="mic-outline" size={19} color="#D97706" />
              </TouchableOpacity>
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

      {/* ── Main Product Grid FlatList (3-Column Compact Grid) ── */}
      <FlatList
        key="product_grid_3col"
        data={filtered}
        keyExtractor={item => item._id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        numColumns={3}
        columnWrapperStyle={{ gap: PRODUCT_GRID_GAP, paddingHorizontal: PRODUCT_GRID_PADDING }}
        contentContainerStyle={{ paddingBottom: cartTotalCount > 0 ? 190 : 130 }}
        ListHeaderComponent={renderListHeader()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F7C400', '#0F172A']}
            tintColor="#F7C400"
            progressViewOffset={headerHeight}
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
            <View
              style={{ width: PRODUCT_ITEM_WIDTH }}
              className="mb-4 justify-between"
            >
              <View>
                {/* Product Image Frame (Taller Aspect Ratio) */}
                <View className="w-full aspect-[1/1.18] rounded-2xl overflow-hidden bg-slate-50 relative mb-1.5">
                  <Image
                    source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />

                  {/* Refined Frosted Discount Badge (No solid green bg) */}
                  {discount > 0 && (
                    <View className="absolute top-1.5 left-1.5 bg-white/95 px-1.5 py-0.5 rounded-md shadow-xs border border-emerald-200/60 z-10">
                      <Text className="text-emerald-700 text-[9px] font-black tracking-tight">
                        {discount}% OFF
                      </Text>
                    </View>
                  )}

                  {/* Add Button: Compact when 0, Full-Width Bar across bottom when added */}
                  {qtyInCart === 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        addToCart(item);
                      }}
                      activeOpacity={0.8}
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        width: 28,
                        height: 28,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.92)',
                        borderWidth: 1,
                        borderColor: 'rgba(226, 232, 240, 0.9)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 3,
                        zIndex: 20,
                      }}
                    >
                      <Ionicons name="add" size={17} color="#FFC107" />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        right: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.92)',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(226, 232, 240, 0.9)',
                        paddingVertical: 3,
                        paddingHorizontal: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        shadowColor: '#000000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.10,
                        shadowRadius: 6,
                        elevation: 4,
                        zIndex: 20,
                      }}
                    >
                      {/* Minus Gray Action Button (matching active tab bar gray) */}
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          updateCartQty(item._id, -1);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          backgroundColor: '#EAEAEA',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="remove" size={14} color="#FFC107" />
                      </TouchableOpacity>

                      {/* Quantity in Center */}
                      <Text
                        style={{
                          color: '#111827',
                          fontWeight: '800',
                          fontSize: 12,
                          paddingHorizontal: 4,
                        }}
                      >
                        {qtyInCart}
                      </Text>

                      {/* Plus Gray Action Button (matching active tab bar gray) */}
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          updateCartQty(item._id, 1);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 8,
                          backgroundColor: '#EAEAEA',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="add" size={14} color="#FFC107" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Product Name First (2 full lines visible) */}
                <Text
                  numberOfLines={2}
                  className="text-[11.5px] font-bold text-slate-900 leading-[16px] min-h-[34px] mt-1"
                >
                  {item.name}
                </Text>

                {/* Unit Below Name (e.g. 1 pc / 1 L) */}
                <Text className="text-[10px] font-semibold text-slate-400 mt-0.5" numberOfLines={1}>
                  {item.unit || '1 pc'}
                </Text>
              </View>

              {/* Price Row: Selling Price + Struck-through MRP */}
              <View className="mt-1">
                <View className="flex-row items-baseline">
                  <Text className="text-[13px] font-black text-slate-900">
                    ₹{item.sellingPrice}
                  </Text>
                  {item.mrp > item.sellingPrice && (
                    <Text className="text-[9px] font-semibold text-slate-400 line-through ml-1">
                      ₹{item.mrp}
                    </Text>
                  )}
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

      {/* ── Voice Search Interactive Modal ── */}
      <VoiceSearchModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSearch={(query) => {
          setSearchTerm(query);
          setSelectedTab('ALL');
        }}
      />

    </SafeAreaView>
  );
}
