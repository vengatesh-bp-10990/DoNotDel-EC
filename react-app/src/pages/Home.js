import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const SORT_OPTIONS = [
  { key: 'default', label: 'Relevance' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
  { key: 'name-az', label: 'Name: A–Z' },
];

const BANNERS = [
  { title: 'Pure Cold-Pressed Oils', subtitle: 'From our farm to your kitchen — 100% natural, chemical-free', bg: 'from-amber-600 via-orange-500 to-red-500', cta: 'Shop Oils' },
  { title: 'Handwoven Silk Sarees', subtitle: 'Traditional Kanchipuram & handloom sarees crafted with love', bg: 'from-pink-600 via-rose-500 to-amber-500', cta: 'Shop Sarees' },
  { title: 'Herbal Hair Care', subtitle: 'Nourish your hair with age-old recipes — Bhringraj, Amla & more', bg: 'from-emerald-600 via-teal-500 to-cyan-500', cta: 'Shop Hair Oils' },
  { title: 'Comfy Cotton Nightwear', subtitle: 'Sleep in luxury — soft cotton & silk nightwear for women', bg: 'from-indigo-600 via-purple-500 to-pink-500', cta: 'Shop Nightwear' },
];

function Home() {
  const { addToCart, isAuthenticated, openAuthModal } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);

  // Auto-rotate carousel
  useEffect(() => {
    const t = setInterval(() => setCurrentBanner(p => (p + 1) % BANNERS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('https://donotdel-ec-60047179487.development.catalystserverless.in/server/do_not_del_ec_function/products')
      .then(r => r.json())
      .then(data => { if (data.success) setProducts(data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const categoriesFromData = useMemo(() => {
    const cats = new Set();
    products.forEach(item => { if (item.Products?.Category) cats.add(item.Products.Category); });
    return Array.from(cats);
  }, [products]);

  const maxPrice = useMemo(() => {
    let m = 0;
    products.forEach(item => { const p = parseFloat(item.Products?.Price || 0); if (p > m) m = p; });
    return Math.ceil(m / 100) * 100 || 10000;
  }, [products]);

  useEffect(() => { setPriceRange([0, maxPrice]); }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    let results = products.map(item => item.Products).filter(Boolean);
    if (activeCategory !== 'All') results = results.filter(p => p.Category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(p => p.Name?.toLowerCase().includes(q) || p.Description?.toLowerCase().includes(q) || p.Category?.toLowerCase().includes(q));
    }
    results = results.filter(p => { const price = parseFloat(p.Price); return price >= priceRange[0] && price <= priceRange[1]; });
    switch (sortBy) {
      case 'price-low': results.sort((a, b) => parseFloat(a.Price) - parseFloat(b.Price)); break;
      case 'price-high': results.sort((a, b) => parseFloat(b.Price) - parseFloat(a.Price)); break;
      case 'name-az': results.sort((a, b) => (a.Name || '').localeCompare(b.Name || '')); break;
      default: break;
    }
    return results;
  }, [products, activeCategory, search, sortBy, priceRange]);

  const handleAddToCart = useCallback((product) => {
    if (!isAuthenticated) { openAuthModal(); return; }
    addToCart(product);
    setAddedId(product.ROWID);
    setTimeout(() => setAddedId(null), 1200);
  }, [isAuthenticated, openAuthModal, addToCart]);

  function clearFilters() { setSearch(''); setActiveCategory('All'); setSortBy('default'); setPriceRange([0, maxPrice]); }
  const hasActiveFilters = search || activeCategory !== 'All' || sortBy !== 'default' || priceRange[0] > 0 || priceRange[1] < maxPrice;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading products...</p>
      </div>
    );
  }

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Categories</h3>
        <div className="space-y-1">
          <CatBtn label="All" count={products.length} active={activeCategory === 'All'} onClick={() => setActiveCategory('All')} />
          {categoriesFromData.map(cat => (
            <CatBtn key={cat} label={cat} count={products.filter(i => i.Products?.Category === cat).length}
              active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Price Range</h3>
        <input type="range" min={0} max={maxPrice} step={50} value={priceRange[1]}
          onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])} className="w-full accent-amber-600 cursor-pointer" />
        <div className="flex justify-between text-xs text-gray-500 mt-1.5">
          <span>₹0</span><span className="font-semibold text-amber-600">Up to ₹{priceRange[1]}</span>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Sort By</h3>
        {SORT_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setSortBy(opt.key)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${sortBy === opt.key ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
            {opt.label}
          </button>
        ))}
      </div>
      {hasActiveFilters && (
        <button onClick={clearFilters} className="w-full text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-2.5 transition-all">Clear All Filters</button>
      )}
    </div>
  );

  return (
    <div>
      {/* ═══════ Carousel Banner ═══════ */}
      <div className="relative overflow-hidden">
        <div className="transition-transform duration-700 ease-in-out flex" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
          {BANNERS.map((banner, i) => (
            <div key={i} className={`min-w-full bg-gradient-to-r ${banner.bg} relative`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    Free delivery on orders above ₹500
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">{banner.title}</h1>
                  <p className="text-white/80 text-sm sm:text-base max-w-md mb-6">{banner.subtitle}</p>
                  <button onClick={() => { const cat = banner.cta.replace('Shop ', ''); const match = categoriesFromData.find(c => c.toLowerCase().includes(cat.toLowerCase())); setActiveCategory(match || 'All'); }}
                    className="bg-white text-gray-800 font-bold py-3 px-6 rounded-xl text-sm hover:shadow-lg transition-all">
                    {banner.cta} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => setCurrentBanner(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentBanner ? 'bg-white w-7' : 'bg-white/40 hover:bg-white/60'}`} />
          ))}
        </div>
        {/* Arrows */}
        <button onClick={() => setCurrentBanner(p => (p - 1 + BANNERS.length) % BANNERS.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center justify-center z-20 hidden sm:flex">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={() => setCurrentBanner(p => (p + 1) % BANNERS.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-all flex items-center justify-center z-20 hidden sm:flex">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* ═══════ Category Scroll + Search ═══════ */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
              <button onClick={() => setActiveCategory('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === 'All' ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
              {categoriesFromData.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${activeCategory === cat ? 'bg-amber-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{cat}</button>
              ))}
            </div>
            {/* Search on Desktop */}
            <div className="hidden sm:block relative w-64">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </div>
            <button onClick={() => setShowMobileFilters(true)}
              className="lg:hidden flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              Filters
            </button>
          </div>
          {/* Mobile Search */}
          <div className="sm:hidden pb-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Main Content ═══════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-36 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">{filterPanel}</div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-800">{filteredProducts.length}</span> products
                {activeCategory !== 'All' && <span> in <span className="font-semibold text-amber-600">{activeCategory}</span></span>}
                {search && <span> for "<span className="font-semibold text-amber-600">{search}</span>"</span>}
              </p>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="hidden sm:block text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400">
                {SORT_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <p className="text-lg font-semibold text-gray-500">No products found</p>
                <button onClick={clearFilters} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-5 rounded-xl text-sm transition-all">Clear Filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {filteredProducts.map(product => {
                  const isAdded = addedId === product.ROWID;
                  return (
                    <div key={product.ROWID} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 group overflow-hidden flex flex-col">
                      <div className="relative aspect-square overflow-hidden bg-gray-50">
                        <img src={product.Image_URL} alt={product.Name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy"
                          onError={e => { e.target.onerror = null; e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmNWY1ZjQiLz48dGV4dCB4PSIyMDAiIHk9IjIxMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSIgZm9udC1zaXplPSIxNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='; }} />
                        <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-[10px] sm:text-xs font-semibold text-amber-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-sm">{product.Category}</span>
                        <button onClick={() => handleAddToCart(product)}
                          className={`absolute bottom-2.5 right-2.5 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isAdded ? 'bg-emerald-500 text-white scale-110' : 'bg-white text-amber-600 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:bg-amber-600 hover:text-white'}`}>
                          {isAdded ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                        </button>
                      </div>
                      <div className="p-3 sm:p-4 flex flex-col flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-gray-800 group-hover:text-amber-600 transition-colors line-clamp-1">{product.Name}</h3>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1 line-clamp-2 leading-relaxed hidden sm:block">{product.Description}</p>
                        <div className="mt-auto pt-2 sm:pt-3 flex items-end justify-between gap-2">
                          <div>
                            <p className="text-lg sm:text-xl font-extrabold text-gray-800">₹{parseFloat(product.Price).toFixed(0)}</p>
                            <p className="text-[10px] sm:text-xs text-emerald-600 font-medium">{parseInt(product.Stock_Quantity) > 0 ? `${parseInt(product.Stock_Quantity)} in stock` : 'Out of stock'}</p>
                          </div>
                          <button onClick={() => handleAddToCart(product)}
                            className={`sm:flex items-center gap-1 font-semibold py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all duration-300 active:scale-95 ${isAdded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'}`}>
                            {isAdded ? <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg><span className="hidden sm:inline">Added</span></span>
                              : <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg><span className="hidden sm:inline">Add to Cart</span></span>}
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

      {/* Mobile Filter Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-in-right overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">{filterPanel}</div>
            <div className="sticky bottom-0 p-4 border-t border-gray-100 bg-white">
              <button onClick={() => setShowMobileFilters(false)} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition-all">
                Show {filteredProducts.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatBtn({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-amber-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
      <span className="flex-1 text-left">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
    </button>
  );
}

export default Home;
