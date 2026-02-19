import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';

/* ─── Category Config with icons ─── */
const CATEGORIES = [
  { key: 'All', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
  )},
  { key: 'Oils', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
  )},
  { key: 'Clothing', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
  )},
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Relevance' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
  { key: 'name-az', label: 'Name: A–Z' },
];

function Home() {
  const { addToCart, isAuthenticated, openAuthModal } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  /* ─── Filters ─── */
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetch('/server/do_not_del_ec_function/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        setLoading(false);
      });
  }, []);

  /* ─── Derived: unique categories from data ─── */
  const categoriesFromData = useMemo(() => {
    const cats = new Set();
    products.forEach((item) => {
      if (item.Products?.Category) cats.add(item.Products.Category);
    });
    return Array.from(cats);
  }, [products]);

  /* ─── Derived: max price ─── */
  const maxPrice = useMemo(() => {
    let m = 0;
    products.forEach((item) => {
      const p = parseFloat(item.Products?.Price || 0);
      if (p > m) m = p;
    });
    return Math.ceil(m / 100) * 100 || 10000;
  }, [products]);

  // Initialize price range once maxPrice is computed
  useEffect(() => {
    setPriceRange([0, maxPrice]);
  }, [maxPrice]);

  /* ─── Filtered & Sorted Products ─── */
  const filteredProducts = useMemo(() => {
    let results = products.map((item) => item.Products).filter(Boolean);

    // Category
    if (activeCategory !== 'All') {
      results = results.filter((p) => p.Category === activeCategory);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.Name?.toLowerCase().includes(q) ||
          p.Description?.toLowerCase().includes(q) ||
          p.Category?.toLowerCase().includes(q)
      );
    }

    // Price
    results = results.filter((p) => {
      const price = parseFloat(p.Price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort
    switch (sortBy) {
      case 'price-low':
        results.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price));
        break;
      case 'price-high':
        results.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price));
        break;
      case 'name-az':
        results.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
        break;
      default:
        break;
    }

    return results;
  }, [products, activeCategory, search, sortBy, priceRange]);

  function handleAddToCart(product) {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    addToCart(product);
    setAddedId(product.ROWID);
    setTimeout(() => setAddedId(null), 1200);
  }

  function clearFilters() {
    setSearch('');
    setActiveCategory('All');
    setSortBy('default');
    setPriceRange([0, maxPrice]);
  }

  const hasActiveFilters = search || activeCategory !== 'All' || sortBy !== 'default' || priceRange[0] > 0 || priceRange[1] < maxPrice;

  /* ─── Loading State ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading products...</p>
      </div>
    );
  }

  /* ─── Sidebar Filter Panel (shared between desktop & mobile) ─── */
  const filterPanel = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
        <div className="space-y-1">
          {CATEGORIES.map((cat) => {
            const count = cat.key === 'All'
              ? products.length
              : products.filter((i) => i.Products?.Category === cat.key).length;
            // Only show categories that exist in data (or are "All")
            if (cat.key !== 'All' && !categoriesFromData.includes(cat.key)) return null;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat.key
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={activeCategory === cat.key ? 'text-white' : 'text-gray-400'}>{cat.icon}</span>
                <span className="flex-1 text-left">{cat.key}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeCategory === cat.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{count}</span>
              </button>
            );
          })}
          {/* Dynamic categories not in CATEGORIES */}
          {categoriesFromData
            .filter((c) => !CATEGORIES.some((cat) => cat.key === c))
            .map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center text-xs ${activeCategory === cat ? 'text-white' : 'text-gray-400'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                </span>
                <span className="flex-1 text-left">{cat}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{products.filter((i) => i.Products?.Category === cat).length}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Range</h3>
        <div className="px-1">
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={50}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>₹0</span>
            <span className="font-semibold text-indigo-600">Up to ₹{priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Sort By</h3>
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                sortBy === opt.key
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-2.5 transition-all"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* ═══════ Hero Banner ═══════ */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Free delivery on all orders
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">
                Premium Oils &<br />Handcrafted Clothing
              </h1>
              <p className="text-white/80 text-sm sm:text-base max-w-md mb-6">
                Shop coconut oils, hair oils, groundnut oils, silk sarees & cotton nightwear — quality you can trust.
              </p>
              {/* Search Bar — Hero */}
              <div className="relative max-w-lg">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products, categories..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-gray-800 text-sm placeholder-gray-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-shadow"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="hidden lg:flex justify-end gap-6">
              {[
                { value: products.length, label: 'Products' },
                { value: categoriesFromData.length, label: 'Categories' },
                { value: '100%', label: 'Authentic' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-5 text-center min-w-[120px]">
                  <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-white/70 text-xs font-medium mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Category Pills (horizontal scroll) ═══════ */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => {
              if (cat.key !== 'All' && !categoriesFromData.includes(cat.key)) return null;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    activeCategory === cat.key
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.icon}
                  {cat.key}
                </button>
              );
            })}
            {categoriesFromData
              .filter((c) => !CATEGORIES.some((cat) => cat.key === c))
              .map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                    activeCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 whitespace-nowrap flex-shrink-0 ml-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ Main Content ═══════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          {/* ── Desktop Sidebar ── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-36 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              {filterPanel}
            </div>
          </aside>

          {/* ── Product Grid Area ── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-800">{filteredProducts.length}</span>{' '}
                  {filteredProducts.length === 1 ? 'product' : 'products'}
                  {activeCategory !== 'All' && (
                    <span> in <span className="font-semibold text-indigo-600">{activeCategory}</span></span>
                  )}
                  {search && (
                    <span> for "<span className="font-semibold text-indigo-600">{search}</span>"</span>
                  )}
                </p>
              </div>
              {/* Desktop sort dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="hidden sm:block text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Products */}
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-500">No products found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                <button onClick={clearFilters} className="btn-primary text-sm mt-2">Clear Filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {filteredProducts.map((product) => {
                  const isAdded = addedId === product.ROWID;
                  return (
                    <div
                      key={product.ROWID}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 group overflow-hidden flex flex-col"
                    >
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-gray-50">
                        <img
                          src={product.Image_URL}
                          alt={product.Name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {/* Category Badge */}
                        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[10px] sm:text-xs font-semibold text-indigo-600 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm">
                          {product.Category}
                        </span>
                        {/* Quick-add overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                        <button
                          onClick={() => handleAddToCart(product)}
                          className={`absolute bottom-2.5 right-2.5 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                            isAdded
                              ? 'bg-emerald-500 text-white scale-110'
                              : 'bg-white text-indigo-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          {isAdded ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                          )}
                        </button>
                      </div>

                      {/* Details */}
                      <div className="p-3 sm:p-4 flex flex-col flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {product.Name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1 line-clamp-2 leading-relaxed hidden sm:block">
                          {product.Description}
                        </p>

                        <div className="mt-auto pt-2 sm:pt-3 flex items-end justify-between gap-2">
                          <div>
                            <p className="text-lg sm:text-xl font-extrabold text-gray-800">
                              ₹{parseFloat(product.Price).toFixed(0)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">
                              {parseInt(product.Stock_Quantity) > 0
                                ? `${parseInt(product.Stock_Quantity)} in stock`
                                : 'Out of stock'}
                            </p>
                          </div>
                          {/* Add to Cart (mobile-visible, desktop appears below image) */}
                          <button
                            onClick={() => handleAddToCart(product)}
                            className={`sm:flex items-center gap-1 font-semibold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all duration-300 active:scale-95 ${
                              isAdded
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                          >
                            {isAdded ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                <span className="hidden sm:inline">Added</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                                <span className="hidden sm:inline">Add to Cart</span>
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ Mobile Filter Drawer ═══════ */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-in-right overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Filters</h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              {filterPanel}
            </div>
            <div className="sticky bottom-0 p-4 border-t border-gray-100 bg-white">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Show {filteredProducts.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
