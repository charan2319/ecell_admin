import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Package, ShoppingBag, Users, Layout, LogOut, Plus, Edit, Trash2, TrendingUp, Coins, UserCheck, Image as ImageIcon, RefreshCcw
} from 'lucide-react';

const API_BASE = 'http://localhost:5001/api';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [hero, setHero] = useState([]);
  const [events, setEvents] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [aboutImage, setAboutImage] = useState(null);

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

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, uRes, oRes, hRes, eRes, bRes, cRes, aRes] = await Promise.all([
        axios.get(`${API_BASE}/products`),
        axios.get(`${API_BASE}/auth/users`),
        axios.get(`${API_BASE}/orders`),
        axios.get(`${API_BASE}/hero`),
        axios.get(`${API_BASE}/events`),
        axios.get(`${API_BASE}/brands`),
        axios.get(`${API_BASE}/products/categories`),
        axios.get(`${API_BASE}/about-image`)
      ]);
      setProducts(pRes.data);
      setUsers(uRes.data);
      setOrders(oRes.data);
      setHero(hRes.data);
      setEvents(eRes.data);
      setBrands(bRes.data);
      setCategories(cRes.data);
      setAboutImage(aRes.data);
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
      brand: item.brand || '',
      delivery_location: item.delivery_location || '',
      delivery_time: item.delivery_time || '',
      description: item.description || '', 
      category: item.category || '', title: item.title || '', subtitle: item.subtitle || '',
      is_new_arrival: !!item.is_new_arrival,
      image_url: item.image_url || '',
      extra_images: item.extra_images || []
    } : { 
      name: '', price_vc: '', original_price: '', brand: '', delivery_location: '', delivery_time: '',
      description: '', category: '', title: '', subtitle: '', is_new_arrival: false, image_url: '', extra_images: [] 
    });
    setShowModal(true);
  };

  const handleAdjustPoints = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const finalAmount = adjustType === 'add' ? parseInt(pointsAmount) : -Math.abs(parseInt(pointsAmount));
      await axios.post(`${API_BASE}/auth/adjust-points`, {
        user_id: selectedUser.id,
        amount: finalAmount,
        reason: pointsReason
      });
      setShowPointsModal(false);
      setPointsAmount('');
      setPointsReason('');
      setAdjustType('add');
      fetchAll();
    } catch (err) {
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

    Object.keys(finalFormData).forEach(key => {
      if (finalFormData[key] !== undefined && finalFormData[key] !== null) {
        data.append(key, finalFormData[key]);
      }
    });

    try {
      let url = `${API_BASE}/${modalType === 'product' ? 'products' :
        (modalType === 'hero' ? 'hero' : (modalType === 'event' ? 'events' :
          (modalType === 'about-image' ? 'about-image' : 'brands')))}`;
      let savedId = editingId;
      if (isEditing) await axios.put(`${url}/${editingId}`, data);
      else {
        const res = await axios.post(url, data);
        savedId = res.data.id;
      }

      // Upload extra images if any (products only)
      if (modalType === 'product' && extraImgFiles.length > 0 && savedId) {
        const extraData = new FormData();
        extraImgFiles.forEach(f => extraData.append('images', f));
        await axios.post(`${API_BASE}/products/${savedId}/images`, extraData);
      }

      setShowModal(false);
      setNewCategoryName('');
      setExtraImgFiles([]);
      fetchAll();
    } catch (err) {
      alert('Operation failed. Please check your data and connection.');
    } finally { setLoading(false); }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    try {
      await axios.delete(`${API_BASE}/${type}/${id}`);
      fetchAll();
    } catch (err) {
      console.error('Delete error for', type, id, ':', err);
      alert(`Error deleting ${type}. (Check: Did you restart your backend?) - ${err.response?.data?.message || err.message}`);
    }
  };

  const totalVcSales = orders.reduce((acc, curr) => acc + (curr.total_vc || 0), 0);

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
          <div className={`sidebar-item ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>
            <ImageIcon size={22} className="icon" /> <span>Site Content</span>
          </div>
          <div className="sidebar-item logout" style={{ marginTop: 'auto' }}>
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
                  activeTab === 'users' ? 'User Management' : 'Site Content Control'}</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><p style={{ color: '#6B7280', margin: 0 }}>Total Sales</p><h2 style={{ margin: '5px 0' }}>{totalVcSales} Vc's</h2></div>
                <div style={{ background: '#FFFBEB', padding: 12, borderRadius: 12 }}><Coins color="#FFC700" /></div>
              </div>
            </div>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><p style={{ color: '#6B7280', margin: 0 }}>Active Users</p><h2 style={{ margin: '5px 0' }}>{users.length}</h2></div>
                <div style={{ background: '#EFF6FF', padding: 12, borderRadius: 12 }}><UserCheck color="#3B82F6" /></div>
              </div>
            </div>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><p style={{ color: '#6B7280', margin: 0 }}>Total Orders</p><h2 style={{ margin: '5px 0' }}>{orders.length}</h2></div>
                <div style={{ background: '#F0FDF4', padding: 12, borderRadius: 12 }}><TrendingUp color="#10B981" /></div>
              </div>
            </div>
            <div className="dash-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><p style={{ color: '#6B7280', margin: 0 }}>Inventory</p><h2 style={{ margin: '5px 0' }}>{products.length} Products</h2></div>
                <div style={{ background: '#FEF2F2', padding: 12, borderRadius: 12 }}><Package color="#EF4444" /></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Active Inventory <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 400 }}>({products.length} items)</span></h2>
              <button className="btn btn-gold" onClick={() => handleOpenModal('product')}><Plus size={18} /> Add Product</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {products.map(p => {
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
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ background: '#F3F4F6', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', color: '#374151' }}>{p.category}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFC700' }}>{p.price_vc} Vc's</span>
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
              <thead><tr><th>ID</th><th>User</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>
                      <strong>{o.user_name}</strong><br />
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{o.email}</span>
                    </td>
                    <td>{o.total_vc} Vc's</td>
                    <td><span style={{ color: '#10B981', fontWeight: 600 }}>{o.status}</span></td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-gold" onClick={async () => {
                        try {
                          const res = await axios.get(`${API_BASE}/orders/${o.id}`);
                          setSelectedOrder(res.data);
                        } catch (err) { alert('Failed to fetch details'); }
                      }} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>View Details</button>
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
                {users.map(u => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><strong>{u.points} Vc's</strong></td>
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

        {activeTab === 'content' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3>Hero Slider Images</h3>
                <button className="btn btn-gold" onClick={() => handleOpenModal('hero')}><ImageIcon size={18} /> Add Hero Image</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {hero.map(h => (
                  <div key={h.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                    <img src={h.image_url} style={{ width: '100%', height: 120, objectFit: 'cover' }} alt="" />
                    <button onClick={() => deleteItem('hero', h.id)} style={{ position: 'absolute', top: 5, right: 5, background: 'red', border: 'none', color: '#fff', borderRadius: '50%', padding: 5, cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div className="dash-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>Upcoming Event</h3>
                  <button className="btn btn-gold" onClick={() => handleOpenModal('event')}>Update</button>
                </div>
                {events.length > 0 && (
                  <div style={{ marginTop: '1.5rem', position: 'relative', background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                    <strong>{events[0].title}</strong><br />{events[0].subtitle}
                    <button onClick={() => deleteItem('events', events[0].id)} style={{ position: 'absolute', right: 10, top: 10, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="dash-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>Trusted Brands</h3>
                  <button className="btn btn-gold" onClick={() => handleOpenModal('brand')}>+ Brand Image</button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem', flexWrap: 'wrap' }}>
                  {brands.map(b => (
                    <div key={b.id} style={{ padding: 8, border: '1px solid #eee', borderRadius: 8, position: 'relative', background: '#fff' }}>
                      <img src={b.image_url} height="30" style={{ objectFit: 'contain' }} alt="" />
                      <button onClick={() => deleteItem('brands', b.id)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', border: 'none', color: '#fff', borderRadius: '50%', padding: 2, cursor: 'pointer' }}><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* About Us Image */}
            <div className="dash-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3>About Us Image</h3>
                <button className="btn btn-gold" onClick={() => handleOpenModal('about-image')}>
                  <ImageIcon size={18} /> {aboutImage ? 'Replace Image' : 'Upload Image'}
                </button>
              </div>
              {aboutImage ? (
                <div style={{ position: 'relative', display: 'inline-block', borderRadius: 12, overflow: 'hidden' }}>
                  <img src={aboutImage.image_url} alt="About Us" style={{ width: '100%', maxWidth: 400, height: 220, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                  <button
                    onClick={async () => { if (window.confirm('Remove about image?')) { await axios.delete(`${API_BASE}/about-image`); fetchAll(); } }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'red', border: 'none', color: '#fff', borderRadius: '50%', padding: 6, cursor: 'pointer' }}
                  ><Trash2 size={14} /></button>
                </div>
              ) : (
                <div style={{ padding: '2rem', border: '2px dashed #E5E7EB', borderRadius: 12, textAlign: 'center', color: '#9CA3AF' }}>
                  No image uploaded yet. Upload one to display it in the About Us section on the user site.
                </div>
              )}
            </div>
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
                      await axios.post(`${API_BASE}/products/categories`, { name });
                      fetchAll();
                    } catch (err) {
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
              {categories.map(cat => (
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
                            await axios.put(`${API_BASE}/products/categories/${encodeURIComponent(cat)}`, { newName });
                            fetchAll();
                          } catch (err) {
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
                            await axios.delete(`${API_BASE}/products/categories/${encodeURIComponent(cat)}`);
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
              {categories.length === 0 && (
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
                    <label style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>Brand & Product Name</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <input 
                        type="text" 
                        placeholder="Brand (e.g. Lucacci)"
                        value={formData.brand} 
                        onChange={e => setFormData({...formData, brand: e.target.value})} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                      />
                      <input 
                        type="text" 
                        placeholder="Product Name"
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        required 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid #E5E7EB', fontSize: '0.9rem' }}
                      />
                    </div>
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
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {formData.extra_images.map(img => (
                        <div key={img.id} style={{ position: 'relative' }}>
                          <img src={img.image_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '2px solid #E5E7EB' }} />
                          <button
                            type="button"
                            onClick={async () => {
                              await axios.delete(`${API_BASE}/products/images/${img.id}`);
                              setFormData(prev => ({
                                ...prev,
                                extra_images: prev.extra_images.filter(i => i.id !== img.id)
                              }));
                            }}
                            style={{ position: 'absolute', top: -5, right: -5, background: 'red', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              <p><strong>Total Amount:</strong> {selectedOrder.total_vc} Vc's</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Placed On:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
            </div>

            <h3 style={{ marginBottom: '1rem' }}>Purchased Items</h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {selectedOrder.items?.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderBottom: '1px solid #eee' }}>
                  <img src={item.image_url} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{item.name}</p>
                    <p style={{ fontSize: '0.85rem', margin: 0 }}>{item.quantity} x {item.price_vc} Vc's</p>
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
    </div>
  );
}

export default Dashboard;
