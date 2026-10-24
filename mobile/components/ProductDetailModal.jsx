import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal,
  ScrollView, Dimensions, Animated, StatusBar,
  Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.85;

const triggerHaptic = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) { }
};

export default function ProductDetailModal({
  visible,
  product,
  onClose,
  addToCart,
  updateCartQty,
  getItemQtyInCart,
  apiBaseUrl,
}) {
  const insets = useSafeAreaInsets();
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fullProduct, setFullProduct] = useState(null);
  const imageScrollRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Fetch full product details when modal opens
  useEffect(() => {
    if (visible && product) {
      setActiveImageIdx(0);
      setSelectedVariantIdx(0);
      setFullProduct(product); // Start with what we have

      // Fetch latest from server for full details
      if (product._id && apiBaseUrl) {
        setLoading(true);
        fetch(`${apiBaseUrl}/products/${product._id}`)
          .then(r => r.json())
          .then(data => {
            if (data.success && data.data) {
              setFullProduct(data.data);
            }
          })
          .catch(() => { })
          .finally(() => setLoading(false));
      }

      // Animate in from bottom
      slideAnim.setValue(SCREEN_HEIGHT);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible, product?._id]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  if (!visible || !product) return null;

  const p = fullProduct || product;

  // Build image list — combine imageUrl and images array, deduplicated
  const allImages = [];
  if (p.imageUrl) allImages.push(p.imageUrl);
  if (p.images && p.images.length > 0) {
    p.images.forEach(img => {
      if (img && !allImages.includes(img)) allImages.push(img);
    });
  }
  if (allImages.length === 0) {
    allImages.push('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80');
  }

  // Build unified variants list:
  // If product has variants, include the main product as the first option, followed by all variants.
  // This ensures users can select the main base product as well as any sub-variants.
  const allVariants = (p.variants && p.variants.length > 0)
    ? [
        {
          _id: 'main_base',
          isMainBase: true,
          label: p.unit ? `1 ${p.unit}` : 'Standard',
          sellingPrice: p.sellingPrice,
          mrp: p.mrp,
          stockQty: p.stockQty,
          unitPrice: ''
        },
        ...p.variants
      ]
    : [];

  const hasVariants = allVariants.length > 0;
  const currentVariant = hasVariants ? (allVariants[selectedVariantIdx] || allVariants[0]) : null;

  // Determine effective price/stock based on selected variant (or base if mainOption selected)
  const isBaseSelected = !currentVariant || currentVariant.isMainBase;
  const effectivePrice = currentVariant ? currentVariant.sellingPrice : p.sellingPrice;
  const effectiveMrp = currentVariant ? currentVariant.mrp : p.mrp;
  const effectiveStock = currentVariant ? currentVariant.stockQty : p.stockQty;
  const isOutOfStock = effectiveStock <= 0;

  const discount = effectiveMrp > effectivePrice
    ? Math.round(((effectiveMrp - effectivePrice) / effectiveMrp) * 100)
    : 0;

  const cartItemKey = (!isBaseSelected && currentVariant?._id)
    ? `${p._id}_${currentVariant._id}`
    : (p.cartItemId || p._id);

  const qtyInCart = getItemQtyInCart
    ? getItemQtyInCart(p._id, !isBaseSelected ? currentVariant?._id : null)
    : 0;

  const isMaxStockReached = effectiveStock !== undefined && effectiveStock !== null && qtyInCart >= effectiveStock;

  const handleImageScroll = (event) => {
    const xOffset = event.nativeEvent.contentOffset.x;
    const idx = Math.round(xOffset / SCREEN_WIDTH);
    setActiveImageIdx(Math.max(0, Math.min(allImages.length - 1, idx)));
  };

  const handleAddToCart = () => {
    if (isOutOfStock || isMaxStockReached) return;
    triggerHaptic();
    if (!isBaseSelected && currentVariant) {
      // Add as sub-variant
      addToCart({
        ...p,
        sellingPrice: currentVariant.sellingPrice,
        mrp: currentVariant.mrp,
        stockQty: currentVariant.stockQty,
        variantId: currentVariant._id,
        variantLabel: currentVariant.label,
      });
    } else {
      // Add as main base product
      addToCart({
        ...p,
        sellingPrice: p.sellingPrice,
        mrp: p.mrp,
        stockQty: p.stockQty,
        variantId: null,
        variantLabel: null,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.5)" />

      {/* Backdrop — Only covers area behind modal */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={{ flex: 1 }}
        />

        {/* Modal Content — Animated slide up */}
        <Animated.View
          style={{
            width: '100%',
            height: SCREEN_HEIGHT * 0.88,
            backgroundColor: '#FFFFFF', // Clean white background
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            transform: [{ translateY: slideAnim }],
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1 }}
              bounces={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
            >
              {/* ── Close Handle Bar ── */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#E2E8F0',
                }} />
              </View>

              {/* ── Close Button ── */}
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30,
                  elevation: 5,
                }}
              >
                <Ionicons name="chevron-down" size={22} color="#1E293B" />
              </TouchableOpacity>



              {/* ── Image Carousel with Pure Left/Right Touch Swipe ── */}
              <View style={{ position: 'relative', width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}>
                <ScrollView
                  ref={imageScrollRef}
                  horizontal
                  pagingEnabled
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleImageScroll}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                >
                  {allImages.map((imgUri, idx) => (
                    <View
                      key={`img_${idx}`}
                      style={{
                        width: SCREEN_WIDTH,
                        height: IMAGE_HEIGHT,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#FAFAFA',
                      }}
                    >
                      <Image
                        source={{ uri: imgUri }}
                        style={{
                          width: SCREEN_WIDTH * 0.76,
                          height: IMAGE_HEIGHT * 0.88,
                        }}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
                </ScrollView>

                {/* Image Counter Badge (e.g. 1 / 3) */}
                {allImages.length > 1 && (
                  <View style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 16,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    zIndex: 20,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
                      {activeImageIdx + 1} / {allImages.length}
                    </Text>
                  </View>
                )}

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                  <View style={{
                    ...fullOverlayStyle,
                    backgroundColor: 'rgba(255,255,255,0.78)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <View style={{
                      backgroundColor: '#EF4444',
                      paddingHorizontal: 22,
                      paddingVertical: 10,
                      borderRadius: 12,
                      transform: [{ rotate: '-10deg' }],
                      shadowColor: '#EF4444',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 5,
                    }}>
                      <Text style={{
                        color: '#FFF',
                        fontSize: 17,
                        fontWeight: '900',
                        letterSpacing: 1.5,
                      }}>
                        OUT OF STOCK
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* ── Info Bar Below Carousel (Interactive Dots & Thumbnails) ── */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#F1F5F9',
              }}>
                {/* Center: Image Dots */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {allImages.map((_, i) => (
                    <TouchableOpacity
                      key={`dot_${i}`}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      onPress={() => {
                        triggerHaptic();
                        imageScrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
                        setActiveImageIdx(i);
                      }}
                    >
                      <View style={{
                        width: i === activeImageIdx ? 20 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: i === activeImageIdx ? '#FACC15' : '#E2E8F0',
                      }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* ── Product Info Section ── */}
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                {/* Product Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: '#0F172A',
                    lineHeight: 26,
                    letterSpacing: -0.3,
                    flex: 1,
                  }}>
                    {p.name}
                  </Text>
                  {loading && (
                    <ActivityIndicator size="small" color="#D97706" style={{ marginLeft: 8 }} />
                  )}
                </View>

                {/* Description */}
                {p.description ? (
                  <Text style={{
                    fontSize: 13,
                    color: '#64748B',
                    fontWeight: '500',
                    marginTop: 6,
                    lineHeight: 19,
                  }}>
                    {p.description}
                  </Text>
                ) : null}

                {/* Unit / Quantity Label */}
                <Text style={{
                  fontSize: 13,
                  color: '#94A3B8',
                  fontWeight: '600',
                  marginTop: 10,
                }}>
                  Quantity: {currentVariant ? currentVariant.label : `1 ${p.unit || 'pc'}`}
                </Text>
              </View>

              {/* ── Variant Selector (Shows ALL variants including main base product) ── */}
              {hasVariants && (
                <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}>
                    Select Pack / Size
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{padding: 7}}>
                    {allVariants.map((variant, idx) => {
                      const isSelected = idx === selectedVariantIdx;
                      const variantDiscount = variant.mrp > variant.sellingPrice
                        ? Math.round(((variant.mrp - variant.sellingPrice) / variant.mrp) * 100)
                        : 0;
                      const variantOutOfStock = variant.stockQty <= 0;

                      return (
                        <TouchableOpacity
                          key={variant._id || `var_${idx}`}
                          onPress={() => {
                            if (!variantOutOfStock) {
                              triggerHaptic();
                              setSelectedVariantIdx(idx);
                            }
                          }}
                          activeOpacity={variantOutOfStock ? 1 : 0.7}
                          style={{
                            minWidth: 110,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 14,
                            borderWidth: isSelected ? 2 : 1.5,
                            borderColor: variantOutOfStock
                              ? '#E2E8F0'
                              : isSelected
                                ? '#EAB308'
                                : '#E2E8F0',
                            borderStyle: variantOutOfStock ? 'dashed' : 'solid',
                            backgroundColor: variantOutOfStock
                              ? '#F8FAFC'
                              : isSelected
                                ? '#FEFCE8'
                                : '#FFFFFF',
                            marginRight: 10,
                            opacity: variantOutOfStock ? 0.55 : 1,
                          }}
                        >
                          <Text style={{
                            fontSize: 13,
                            fontWeight: '800',
                            color: variantOutOfStock ? '#94A3B8' : '#0F172A',
                          }}>
                            {variant.label}
                          </Text>

                          {variantDiscount > 0 && (
                            <Text style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: variantOutOfStock ? '#94A3B8' : '#16A34A',
                              marginTop: 2,
                            }}>
                              {variantDiscount}% OFF
                            </Text>
                          )}

                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'baseline',
                            marginTop: 3,
                          }}>
                            <Text style={{
                              fontSize: 15,
                              fontWeight: '900',
                              color: variantOutOfStock ? '#94A3B8' : '#0F172A',
                            }}>
                              ₹{variant.sellingPrice}
                            </Text>
                            {variant.mrp > variant.sellingPrice && (
                              <Text style={{
                                fontSize: 11,
                                fontWeight: '600',
                                color: '#94A3B8',
                                textDecorationLine: 'line-through',
                                marginLeft: 4,
                              }}>
                                ₹{variant.mrp}
                              </Text>
                            )}
                          </View>

                          {variant.unitPrice ? (
                            <Text style={{
                              fontSize: 10,
                              fontWeight: '600',
                              color: '#94A3B8',
                              marginTop: 2,
                            }}>
                              {variant.unitPrice}
                            </Text>
                          ) : null}

                          {/* Stock indicator pill on bottom border */}
                          {variantOutOfStock ? (
                            <View style={{
                              position: 'absolute',
                              bottom: -8,
                              alignSelf: 'center',
                              backgroundColor: '#FEF2F2',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#FECACA',
                            }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#EF4444' }}>
                                Out of stock
                              </Text>
                            </View>
                          ) : variant.stockQty <= 5 && variant.stockQty > 0 ? (
                            <View style={{
                              position: 'absolute',
                              bottom: -8,
                              alignSelf: 'center',
                              backgroundColor: '#FFFFFF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: isSelected ? '#EAB308' : '#CBD5E1',
                            }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B' }}>
                                {variant.stockQty} left
                              </Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* ── Stock Info (non-variant) ── */}
              {!hasVariants && p.stockQty <= 5 && p.stockQty > 0 && (
                <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FEF2F2',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    alignSelf: 'flex-start',
                  }}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#EF4444',
                      marginLeft: 4,
                    }}>
                      Only {p.stockQty} left in stock!
                    </Text>
                  </View>
                </View>
              )}

              {loading && (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FACC15" />
                </View>
              )}
            </ScrollView>

            {/* ── Sticky Bottom Add-to-Cart Bar ── */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#F1F5F9',
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 8,
            }}>
              {/* Price Info */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {currentVariant && (
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: '#64748B',
                      marginRight: 6,
                    }}>
                      {currentVariant.label}
                    </Text>
                  )}
                  {discount > 0 && (
                    <View style={{
                      backgroundColor: '#DCFCE7',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color: '#16A34A',
                      }}>
                        {discount}% OFF
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '900',
                    color: isOutOfStock ? '#94A3B8' : '#0F172A',
                  }}>
                    ₹{effectivePrice}
                  </Text>
                  {effectiveMrp > effectivePrice && (
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#94A3B8',
                      textDecorationLine: 'line-through',
                      marginLeft: 6,
                    }}>
                      ₹{effectiveMrp}
                    </Text>
                  )}
                </View>
              </View>

              {/* Add / Qty Button (Vibrant Yellow replaces old Blue) */}
              {isOutOfStock ? (
                <View style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 32,
                  paddingVertical: 14,
                  borderRadius: 14,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '800',
                    color: '#94A3B8',
                  }}>
                    Out of Stock
                  </Text>
                </View>
              ) : qtyInCart === 0 ? (
                <TouchableOpacity
                  onPress={handleAddToCart}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: '#FACC15',
                    paddingHorizontal: 40,
                    paddingVertical: 14,
                    borderRadius: 14,
                    shadowColor: '#EAB308',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '900',
                    color: '#111827',
                    letterSpacing: 0.5,
                  }}>
                    ADD
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FACC15',
                    borderRadius: 14,
                    paddingHorizontal: 4,
                    paddingVertical: 4,
                    shadowColor: '#EAB308',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                    elevation: 3,
                  }}>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        updateCartQty(cartItemKey, -1);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: 'rgba(0,0,0,0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="remove" size={20} color="#111827" />
                    </TouchableOpacity>

                    <Text style={{
                      color: '#111827',
                      fontSize: 17,
                      fontWeight: '900',
                      paddingHorizontal: 16,
                      minWidth: 40,
                      textAlign: 'center',
                    }}>
                      {qtyInCart}
                    </Text>

                    <TouchableOpacity
                      disabled={isMaxStockReached}
                      onPress={() => {
                        if (isMaxStockReached) {
                          triggerHaptic();
                          return;
                        }
                        triggerHaptic();
                        updateCartQty(cartItemKey, 1, effectiveStock);
                      }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: isMaxStockReached ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isMaxStockReached ? 0.35 : 1,
                      }}
                    >
                      <Ionicons name="add" size={20} color="#111827" />
                    </TouchableOpacity>
                  </View>

                  {isMaxStockReached && (
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#EF4444',
                      marginTop: 4,
                    }}>
                      Max stock ({effectiveStock}) reached
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const fullOverlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
};
