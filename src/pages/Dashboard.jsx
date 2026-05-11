import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import {
  Package, ShoppingBag, Users, Layout, LogOut, Plus, Edit, Trash2, TrendingUp, Coins, UserCheck, Image as ImageIcon, RefreshCcw, Calendar, MapPin, ExternalLink
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend
} from 'recharts';
import coinImg from '../assets/coin.png';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [modalType, setModalType] = useState('product');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Adjustment states
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // 'add' or 'remove'

  // Category states
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [formData, setFormData] = useState({
    name: '', price_vc: '', original_price: '', brand: '', delivery_location: '', delivery_time: '', description: '', category: '', title: '', subtitle: '', is_new_arrival: false, image_url: ''
  });
  const [file, setFile] = useState(null);
  const [extraImgFiles, setExtraImgFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [timeframe, setTimeframe] = useState('7d'); // 7d, 30d, all
  
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  // Data processing for charts
  const salesData = useMemo(() => {
    if (!safeOrders.length) return [];
    
    const now = new Date();
    const dataMap = {};
    const days = timeframe === '7d' ? 7 : (timeframe === '30d' ? 30 : 90);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
    }

    safeOrders.forEach(o => {
      const d = new Date(o.created_at);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dataMap[dateStr]) {
        dataMap[dateStr].revenue += (Number(o.total_vc) || 0);
        dataMap[dateStr].orders += 1;
      }
    });
    return Object.values(dataMap);
  }, [safeOrders, timeframe]);

  const userGrowthData = useMemo(() => {
    if (!safeUsers.length) return [];
    
    const now = new Date();
    const dataMap = {};
    const days = timeframe === '7d' ? 7 : (timeframe === '30d' ? 30 : 90);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateStr] = { date: dateStr, users: 0 };
    }

    safeUsers.forEach(u => {
      const d = new Date(u.created_at || Date.now()); // Fallback if no date
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dataMap[dateStr]) {
        dataMap[dateStr].users += 1;
      }
    });
    return Object.values(dataMap);
  }, [safeUsers, timeframe]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, uRes, oRes, cRes] = await Promise.all([
        api.get('/products'),
        api.get('/auth/users'),
        api.get('/orders'),
        api.get('/products/categories')
      ]);
      setProducts(pRes.data);
      setUsers(uRes.data);
      setOrders(oRes.data);
      setCategories(cRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type, editing = false, item = null) => {
    setModalType(type);
    setIsEditing(editing);
    setEditingId(item?.id || null);
    setFile(null);
    setExtraImgFiles([]);
    setShowNewCategoryInput(false);
    setFormData(editing && item ? {
      name: item.name || '', price_vc: item.price_vc || '', 
      original_price: item.original_price || '',
      delivery_location: item.delivery_location || '',
      delivery_time: item.delivery_time || '',
      description: item.description || '', 
      category: item.category || '', title: item.title || '', subtitle: item.subtitle || '',
      is_new_arrival: !!item.is_new_arrival,
      image_url: item.image_url || '',
      extra_images: item.extra_images || []
    } : { 
      name: '', price_vc: '', original_price: '', delivery_location: '', delivery_time: '',
      description: '', category: '', title: '', subtitle: '', is_new_arrival: false, image_url: '', extra_images: [] 
    });
    setShowModal(true);
  };

  const parseLocationData = (locStr) => {
    if (!locStr || locStr === 'Not Specified') return { address: 'Not Specified', mapsUrl: null };
    try {
      const data = JSON.parse(locStr);
      if (typeof data === 'string') return { address: data, mapsUrl: null };
      
      // Saved address format: { name, phone, house, area, city, state, pincode, type }
      // GPS format: { name, pincode, lat, lon, full }
      let address;
      if (data && data.house) {
        address = `${data.name} — ${data.house}, ${data.area}, ${data.city}, ${data.state} - ${data.pincode}`;
      } else if (data) {
        address = data.full || `${data.name || ''} ${data.pincode || ''}`.trim() || 'Location Details';
      } else {
        address = 'N/A';
      }
      const mapsUrl = (data && data.lat && data.lon) ? `https://www.google.com/maps?q=${data.lat},${data.lon}` : null;
      return { address, mapsUrl };
    } catch (e) {
      return { address: locStr || 'N/A', mapsUrl: null };
    }
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalAmount = adjustType === 'add' ? parseInt(pointsAmount) : -Math.abs(parseInt(pointsAmount));
      await api.post('/auth/adjust-points', {
        user_id: selectedUser.id,
        amount: finalAmount,
        reason: pointsReason
      });
      setShowPointsModal(false);
      setPointsAmount('');
      setPointsReason('');
      setAdjustType('add');
      fetchAll();
    } catch (error) {
      console.error('Points adjustment error:', error);
      alert('Failed to adjust points');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'ADD_NEW') {
      setShowNewCategoryInput(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowNewCategoryInput(false);
      setFormData({ ...formData, category: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = new FormData();
    if (file) data.append('image', file);

    const catToSave = showNewCategoryInput ? newCategoryName : formData.category;
    const finalFormData = { ...formData, category: catToSave || formData.category };

    // Fields to skip when appending to FormData (non-serializable or handled separately)
    const skipFields = ['extra_images', 'image_url', 'title', 'subtitle'];

    Object.keys(finalFormData).forEach(key => {
      if (skipFields.includes(key)) return;
      if (finalFormData[key] !== undefined && finalFormData[key] !== null && finalFormData[key] !== '') {
        data.append(key, finalFormData[key]);
      }
    });

    // If editing and no new file was selected, preserve the existing image URL
    if (isEditing && !file && formData.image_url) {
      data.append('image_url', formData.image_url);
    }

    try {
      const url = `/${modalType === 'product' ? 'products' : 'auth'}`;
      let savedId = editingId;
      if (isEditing) await api.put(`${url}/${editingId}`, data);
      else {
        const res = await api.post(url, data);
        savedId = res.data.id || res.data.product?.id;
      }

      // Upload extra images if any (products only)
      if (modalType === 'product' && extraImgFiles.length > 0 && savedId) {
        const extraData = new FormData();
        extraImgFiles.forEach(f => extraData.append('images', f));
        await api.post(`/products/${savedId}/images`, extraData);
      }

      setShowModal(false);
      setNewCategoryName('');
      setExtraImgFiles([]);
      fetchAll();
    } catch (error) {
      console.error('Submit error:', error);
      alert('Operation failed. Please check your data and connection.');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await api.delete(`/${type}/${id}`);
      fetchAll();
    } catch (err) {
      console.error('Delete error for', type, id, ':', err);
      alert(`Error deleting ${type}. (Check: Did you restart your backend?) - ${err.response?.data?.message || err.message}`);
    }
  };

  // Clear All Products
  const handleClearAllProducts = async () => {
    const count = products.length;
    if (count === 0) { alert('No products to clear.'); return; }
    const confirmed = window.confirm(`⚠️ DANGER: You are about to delete ALL ${count} products.\n\nThis will also remove associated order items and product images.\n\nThis action is IRREVERSIBLE. Are you sure?`);
    if (!confirmed) return;
    const doubleConfirm = window.confirm(`Final confirmation: Delete ALL ${count} products permanently?`);
    if (!doubleConfirm) return;
    
    setLoading(true);
    try {
      const res = await api.delete('/products/clear-all/confirm');
      alert(res.data.message || 'All products deleted.');
      fetchAll();
    } catch (err) {
      console.error('Clear all error:', err);
      alert('Failed to clear products: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const totalVcSales = safeOrders.reduce((acc, curr) => acc + (Number(curr.total_vc) || 0), 0);

  return (
    <div className="admin-layout">
      {/* Sidebar - Single Premium Side Bar */}
      <aside className="sidebar">
        <div className="sidebar-header">FOUNDER'S MART</div>
        <nav className="sidebar-nav">
          <div className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <TrendingUp size={22} className="icon" /> <span>Dashboard</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <Package size={22} className="icon" /> <span>Products</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <ShoppingBag size={22} className="icon" /> <span>Orders</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <Users size={22} className="icon" /> <span>Users</span>
          </div>
          <div className={`sidebar-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
            <Layout size={22} className="icon" /> <span>Categories</span>
          </div>
          <div className="sidebar-item logout" style={{ marginTop: 'auto' }} onClick={() => setShowLogoutModal(true)}>
            <LogOut size={22} className="icon" /> <span>Logout</span>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <div className="header-row">
          <h1>{activeTab === 'dashboard' ? 'Dashboard Overview' :
            activeTab === 'products' ? 'Product Management' :
              activeTab === 'orders' ? 'Order History' :
                activeTab === 'categories' ? 'Category Management' :
                  activeTab === 'users' ? 'User Management' : 'Admin Panel'}</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="dashboard-analytics-v2">
            {/* Simple Box Cards - REVERTED STYLE */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="dash-card" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Total Revenue</p><h2 style={{ margin: '5px 0' }}>{totalVcSales.toLocaleString()} <img src={coinImg} alt="VC" className="coin-icon" /></h2></div>
                <div style={{ background: '#FFFBEB', padding: 10, borderRadius: 12 }}><Coins color="#FFC700" size={24} /></div>
              </div>
              <div className="dash-card" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Total Orders</p><h2 style={{ margin: '5px 0' }}>{orders.length}</h2></div>
                <div style={{ background: '#F0FDF4', padding: 10, borderRadius: 12 }}><ShoppingBag color="#10B981" size={24} /></div>
              </div>
              <div className="dash-card" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Active Users</p><h2 style={{ margin: '5px 0' }}>{users.length}</h2></div>
                <div style={{ background: '#EFF6FF', padding: 10, borderRadius: 12 }}><UserCheck color="#3B82F6" size={24} /></div>
              </div>
              <div className="dash-card" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Inventory</p><h2 style={{ margin: '5px 0' }}>{products.length}</h2></div>
                <div style={{ background: '#FEF2F2', padding: 10, borderRadius: 12 }}><Package color="#EF4444" size={24} /></div>
              </div>
            </div>

            {/* Timeframe Toggles */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#F3F4F6', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
              {['7d', '30d', 'all'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{ 
                    padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: timeframe === t ? '#fff' : 'transparent',
                    boxShadow: timeframe === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    fontWeight: 700, fontSize: '0.8rem', color: timeframe === t ? '#000' : '#6B7280'
                  }}
                >
                  {t === '7d' ? '7 Days' : (t === '30d' ? '30 Days' : 'Last 3 Months')}
                </button>
              ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="dash-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Revenue Trends</h3>
                  <div style={{ background: '#FFFBEB', color: '#B45309', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>VC Points</div>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFC700" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#FFC700" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                      <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="revenue" stroke="#FFC700" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dash-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>User Growth</h3>
                  <div style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>New Users</div>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} />
                      <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="users" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2>Active Inventory <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 400 }}>({safeProducts.length} items)</span></h2>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {safeProducts.length > 0 && (
                  <button 
                    className="btn" 
                    onClick={handleClearAllProducts}
                    style={{ background: '#EF4444', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}
                    disabled={loading}
                  >
                    <Trash2 size={16} /> Clear All
                  </button>
                )}
                <button className="btn btn-gold" onClick={() => handleOpenModal('product')}><Plus size={18} /> Add Product</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {safeProducts.map(p => {
                const allImgs = [p.image_url, ...(p.extra_images || []).map(i => i.image_url)].filter(Boolean);
                return (
                  <div key={p.id} style={{ background: '#F9FAFB', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #E5E7EB', transition: 'box-shadow 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    {/* Image strip */}
                    <div style={{ position: 'relative', height: 160, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <img src={allImgs[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
                      {allImgs.length > 1 && (
                        <div style={{ position: 'absolute', top: 8, right: 8, background: '#FFC700', color: '#000', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                          +{allImgs.length - 1} more
                        </div>
                      )}
                      {p.is_new_arrival && (
                        <div style={{ position: 'absolute', top: 8, left: 8, background: '#10B981', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>NEW</div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name?.replace(/\bHp\b/g, 'HP')}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', color: '#374151' }}>{p.category}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFC700' }}>{p.price_vc} <img src={coinImg} alt="VC" className="coin-icon" /></span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: '0.75rem' }}>
                        <button className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '6px' }} onClick={() => handleOpenModal('product', true, p)}><Edit size={14} /> Edit</button>
                        <button className="btn" style={{ flex: 1, fontSize: '0.8rem', padding: '6px', color: 'red' }} onClick={() => deleteItem('products', p.id)}><Trash2 size={14} /> Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="dash-card">
            <h2>Order History</h2>
            <table>
              <thead><tr><th>ID</th><th>User</th><th>Location</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {safeOrders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>
                      <strong>{o.user_name}</strong><br />
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{o.email}</span>
                    </td>
                    <td>
                      {(() => {
                        const { address, mapsUrl } = parseLocationData(o.delivery_location);
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ maxWidth: '150px', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={address}>
                              {address}
                            </div>
                            {mapsUrl && (
                              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6', display: 'flex' }} title="Open in Google Maps">
                                <MapPin size={16} />
                              </a>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>{o.total_vc} <img src={coinImg} alt="VC" className="coin-icon" /></td>
                    <td><span style={{ color: '#10B981', fontWeight: 600 }}>{o.status}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-gold" onClick={async () => {
                        try {
                          const res = await api.get(`/orders/${o.id}`);
                          setSelectedOrder(res.data);
                        } catch (error) { 
                          console.error('Fetch order details error:', error);
                          alert('Failed to fetch details'); 
                        }
                      }} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>View Details</button>
                      
                      {o.status !== 'Delivered' && (
                        <button 
                          className="btn" 
                          style={{ padding: '4px 12px', fontSize: '0.8rem', background: '#10B981', color: '#fff' }}
                          onClick={async () => {
                            if (window.confirm('Mark this order as Delivered?')) {
                              try {
                                await api.patch(`/orders/${o.id}/status`, { status: 'Delivered' });
                                fetchAll();
                              } catch (err) {
                                alert('Failed to update status');
                              }
                            }
                          }}
                        >
                          Deliver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="dash-card">
            <h2>Registered Users</h2>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Balance</th><th>Role</th><th>Actions</th></tr></thead>
              <tbody>
                {safeUsers.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><strong>{u.points} <img src={coinImg} alt="VC" className="coin-icon" /></strong></td>
                    <td>{u.is_admin ? 'Admin' : 'Student'}</td>
                    <td>
                      <button className="btn btn-gold" onClick={() => { setSelectedUser(u); setShowPointsModal(true); }} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>Adjust Vc's</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2>All Categories</h2>
                <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Rename a category to update all products belonging to it. Delete categories that have no products.</p>
              </div>
              <button 
                className="btn btn-gold" 
                onClick={async () => {
                  const name = window.prompt('Enter new category name:');
                  if (name) {
                    try {
                      setLoading(true);
                      await api.post('/products/categories', { name });
                      fetchAll();
                    } catch (error) {
                      console.error('Add category error:', error);
                      alert('Failed to add category');
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
              >
                <Plus size={18} /> Add Category
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {safeCategories.map(cat => (
                <div key={cat} style={{
                  background: '#F9FAFB',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 700, color: '#374151' }}>{cat}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={async () => {
                        const newName = window.prompt(`Enter new name for category "${cat}":`, cat);
                        if (newName && newName !== cat) {
                          try {
                            setLoading(true);
                            await api.put(`/products/categories/${encodeURIComponent(cat)}`, { newName });
                            fetchAll();
                          } catch (error) {
                            console.error('Rename category error:', error);
                            alert('Failed to rename category');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                    >
                      <Edit size={14} style={{ marginRight: '4px' }} /> Rename
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'red' }}
                      onClick={async () => {
                        if (window.confirm(`Delete category "${cat}"?`)) {
                          try {
                            setLoading(true);
                            await api.delete(`/products/categories/${encodeURIComponent(cat)}`);
                            fetchAll();
                          } catch (err) {
                            alert(err.response?.data?.message || 'Failed to delete category');
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {safeCategories.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                  No categories found. Add your first product to create a category!
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Redesigned Product/Content Modal - Premium Compact Style */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setShowNewCategoryInput(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '18px', padding: '1.25rem 1.5rem' }}>
            <h1 style={{ marginBottom: '1.25rem', fontSize: '1.5rem', fontWeight: 800 }}>{isEditing ? 'Edit' : 'Add'} {modalType}</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modalType === 'product' && (
                <>
                  <div className="form-field">
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Product Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter product name"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      required 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div className="form-field">
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Price (Vc's)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input 
                        type="number" 
                        placeholder="Current Price"
                        value={formData.price_vc} 
                        onChange={e => setFormData({...formData, price_vc: e.target.value})} 
                        required 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                      />
                      <input 
                        type="number" 
                        placeholder="Original Price (optional)"
                        value={formData.original_price} 
                        onChange={e => setFormData({...formData, original_price: e.target.value})} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Delivery Info</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Location (e.g. Alliance University)"
                        value={formData.delivery_location} 
                        onChange={e => setFormData({...formData, delivery_location: e.target.value})} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Time (e.g. 7 Days)"
                        value={formData.delivery_time} 
                        onChange={e => setFormData({...formData, delivery_time: e.target.value})} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Category</label>
                    <select
                      value={showNewCategoryInput ? 'ADD_NEW' : formData.category}
                      onChange={handleCategoryChange}
                      required={!showNewCategoryInput}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem', background: '#fff' }}
                    >
                      <option value="">Select Category</option>
                      {safeCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="ADD_NEW">+ Add New Category</option>
                    </select>
                  </div>

                  {showNewCategoryInput && (
                    <div className="form-field">
                      <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>New Category Name</label>
                      <input
                        type="text"
                        placeholder="Type new category..."
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB' }}
                      />
                    </div>
                  )}

                  <div className="form-field">
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', minHeight: '80px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                    <div className={`premium-checkbox ${formData.is_new_arrival ? 'checked' : ''}`} onClick={() => setFormData({ ...formData, is_new_arrival: !formData.is_new_arrival })}>
                      {formData.is_new_arrival && <div className="check-dot" />}
                    </div>
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, cursor: 'pointer' }} onClick={() => setFormData({ ...formData, is_new_arrival: !formData.is_new_arrival })}>
                      Is New Arrival?
                    </label>
                  </div>
                </>
              )}

              {modalType === 'event' && (
                <>
                  <div className="form-field"><label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Event Title</label><input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }} /></div>
                  <div className="form-field"><label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Event Subtitle</label><input type="text" value={formData.subtitle} onChange={e => setFormData({ ...formData, subtitle: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }} /></div>
                </>
              )}

              <div className="form-field">
                <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Main Image {isEditing ? '(leave blank to keep existing)' : ''}</label>

                {/* Show current main image when editing */}
                {isEditing && formData.image_url && (
                  <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img src={formData.image_url} alt="Current" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 10, border: '2px solid #E5E7EB' }} />
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Current main image</span>
                  </div>
                )}

                <div className="file-upload-styled">
                  <input type="file" onChange={e => setFile(e.target.files[0])} required={!isEditing && modalType !== 'event'} id="modal-file" />
                  <label htmlFor="modal-file" style={{ display: 'block', padding: '12px', textAlign: 'center', border: '2px dashed #D1D5DB', borderRadius: '12px', cursor: 'pointer', color: '#6B7280' }}>
                    {file ? file.name : 'Click to choose new main image'}
                  </label>
                </div>
              </div>

              {/* Extra images section - only for products */}
              {modalType === 'product' && (
                <div className="form-field">
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Extra Images (optional, up to 10)</label>

                  {/* Show existing extra images when editing */}
                  {isEditing && formData.extra_images && formData.extra_images.length > 0 && (
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      {formData.extra_images.map(img => (
                        <div key={img.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <img src={img.image_url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, border: '2px solid #E5E7EB' }} />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.put(`/products/${editingId}/promote-image/${img.id}`);
                                const res = await api.get(`/products/${editingId}`);
                                setFormData(res.data);
                              } catch(err) { alert('Failed to make main image'); }
                            }}
                            style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.65rem', padding: '4px 8px', cursor: 'pointer', fontWeight: 600 }}
                          >Make Main</button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await api.delete(`/products/images/${img.id}`);
                                setFormData(prev => ({
                                  ...prev,
                                  extra_images: prev.extra_images.filter(i => i.id !== img.id)
                                }));
                              } catch(err) { alert('Failed to delete image'); }
                            }}
                            style={{ position: 'absolute', top: -6, right: -6, background: '#EF4444', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="file-upload-styled">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={e => setExtraImgFiles(Array.from(e.target.files))}
                      id="modal-extra-files"
                    />
                    <label htmlFor="modal-extra-files" style={{ display: 'block', padding: '12px', textAlign: 'center', border: '2px dashed #D1D5DB', borderRadius: '12px', cursor: 'pointer', color: '#6B7280' }}>
                      {extraImgFiles.length > 0 ? `${extraImgFiles.length} file(s) selected` : 'Click to add extra images'}
                    </label>
                  </div>
                </div>
              )}

              <div className="modal-btn-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ background: '#F3F4F6', color: '#374151', borderRadius: '12px', padding: '14px', fontWeight: 700 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold" style={{ borderRadius: '12px', padding: '14px', fontWeight: 700 }}>{loading ? 'Working...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.8rem' }}>Order Details #{selectedOrder.id}</h2>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <p><strong>Customer:</strong> {selectedOrder.user_name}</p>
              <p><strong>Email:</strong> {selectedOrder.email}</p>
              <p><strong>Total Amount:</strong> {selectedOrder.total_vc} <img src={coinImg} alt="VC" className="coin-icon" /></p>
              <p><strong>Status:</strong> <span style={{ color: selectedOrder.status === 'Delivered' ? '#10B981' : '#F59E0B', fontWeight: 700 }}>{selectedOrder.status}</span></p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0 }}><strong>Delivery Location:</strong></p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#4B5563' }}>
                    {parseLocationData(selectedOrder.delivery_location).address}
                  </p>
                </div>
                {parseLocationData(selectedOrder.delivery_location).mapsUrl && (
                  <a 
                    href={parseLocationData(selectedOrder.delivery_location).mapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn" 
                    style={{ background: '#3B82F6', color: '#fff', fontSize: '0.75rem', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MapPin size={14} /> View Map <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <p><strong>Placed On:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Purchased Items</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                  <img src={item.image_url} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{item.name?.replace(/\bHp\b/g, 'HP')}</p>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>{item.quantity} x {item.price_vc} <img src={coinImg} alt="VC" className="coin-icon" /></p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* User Points Adjustment Modal */}
      {showPointsModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', borderRadius: '24px', padding: '2.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem' }}>Adjust Vc's</h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>Modifying balance for <strong>{selectedUser.name}</strong></p>
            <form onSubmit={handleAdjustPoints} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-field">
                <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Action Type</label>
                <select
                  value={adjustType}
                  onChange={e => setAdjustType(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E5E7EB', background: '#fff' }}
                >
                  <option value="add">Add VC's</option>
                  <option value="remove">Remove VC's</option>
                </select>
              </div>
              <div className="form-field">
                <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Amount (In VC's)</label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={e => setPointsAmount(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E5E7EB' }}
                />
              </div>
              <div className="form-field">
                <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>Reason</label>
                <input
                  type="text"
                  value={pointsReason}
                  onChange={e => setPointsReason(e.target.value)}
                  placeholder="Referral bonus, Violation, etc."
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #E5E7EB' }}
                />
              </div>
              <div className="modal-btn-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                <button type="button" className="btn" onClick={() => setShowPointsModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={loading}>{loading ? 'Adjusting...' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#FEF2F2', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <LogOut size={30} color="#EF4444" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Are you sure?</h2>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>You will need to login again to access the admin panel.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn" style={{ flex: 1, border: '1px solid #E5E7EB' }} onClick={() => setShowLogoutModal(false)}>No, Stay</button>
              <button className="btn" style={{ flex: 1, background: '#000', color: '#fff' }} onClick={onLogout}>Yes, Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
