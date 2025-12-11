// 导入Firebase配置
import { database } from './firebaseConfig';
import { ref, onValue, set } from 'firebase/database';

import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Search, Edit2, Save, X, ArrowUpDown, Send, RotateCcw, Wifi, WifiOff, Loader, Sparkles, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CouponSystem() {
  const [coupons, setCoupons] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedCoupon, setSelectedCoupon] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState(null);
  const [issueFormData, setIssueFormData] = useState({
    issueDate: '',
    remarks: ''
  });
  const [redeemFormData, setRedeemFormData] = useState({
    redeemDate: '',
    remarks: ''
  });
  const [formData, setFormData] = useState({
    couponCode: '',
    issueDate: '',
    redeemDate: '',
    remarks: ''
  });

  useEffect(() => {
    setLoading(true);
    
    const couponsRef = ref(database, 'coupons');
    
    const unsubscribe = onValue(couponsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const couponsArray = Object.entries(data).map(([id, value]) => ({
          ...value,
          id
        }));
        setCoupons(couponsArray);
      } else {
        setCoupons([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Firebase读取错误:', error);
      setError('数据加载失败: ' + error.message);
      setLoading(false);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveToFirebase = async (newCoupons) => {
    try {
      const couponsRef = ref(database, 'coupons');
      const couponsObject = newCoupons.reduce((acc, coupon) => {
        acc[coupon.id] = coupon;
        return acc;
      }, {});
      
      await set(couponsRef, couponsObject);
      return true;
    } catch (err) {
      console.error('Firebase保存失败:', err);
      setError('保存失败: ' + err.message);
      return false;
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async () => {
    if (!formData.couponCode || !formData.issueDate) {
      alert('请填写必填项：优惠券编号、发放日期');
      return;
    }

    if (!isOnline) {
      alert('当前网络离线，请检查网络连接');
      return;
    }

    let newCoupons;
    if (editingId) {
      newCoupons = coupons.map(c => 
        c.id === editingId ? { ...formData, id: editingId } : c
      );
      setEditingId(null);
    } else {
      const newCoupon = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      newCoupons = [...coupons, newCoupon];
    }

    const success = await saveToFirebase(newCoupons);
    if (success) {
      setFormData({
        couponCode: '',
        issueDate: '',
        redeemDate: '',
        remarks: ''
      });
    }
  };

  const handleQuickIssue = async () => {
    if (!selectedCoupon || !issueFormData.issueDate) {
      alert('请选择优惠券并填写发放日期');
      return;
    }

    if (!isOnline) {
      alert('当前网络离线，请检查网络连接');
      return;
    }

    const couponRecords = coupons.filter(c => c.couponCode === selectedCoupon);
    const latestRecord = couponRecords.sort((a, b) => b.id - a.id)[0];
    
    if (latestRecord && !latestRecord.redeemDate) {
      alert(`优惠券 ${selectedCoupon} 当前在外流通中，无法发放！`);
      return;
    }

    const newCoupon = {
      couponCode: selectedCoupon,
      issueDate: issueFormData.issueDate,
      redeemDate: '',
      remarks: issueFormData.remarks,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    const newCoupons = [...coupons, newCoupon];
    const success = await saveToFirebase(newCoupons);
    
    if (success) {
      setSelectedCoupon('');
      setIssueFormData({ issueDate: '', remarks: '' });
      alert(`优惠券 ${selectedCoupon} 发放成功！`);
    }
  };

  const handleQuickRedeem = async (couponCode) => {
    if (!redeemFormData.redeemDate) {
      alert('请填写使用日期');
      return;
    }

    if (!isOnline) {
      alert('当前网络离线，请检查网络连接');
      return;
    }

    const records = coupons.filter(c => c.couponCode === couponCode);
    const latestUnredeemed = records
      .filter(c => c.issueDate && !c.redeemDate)
      .sort((a, b) => b.id - a.id)[0];

    if (!latestUnredeemed) {
      alert('未找到该优惠券的发放记录');
      return;
    }

    const newCoupons = coupons.map(c => 
      c.id === latestUnredeemed.id 
        ? { 
            ...c, 
            redeemDate: redeemFormData.redeemDate, 
            remarks: redeemFormData.remarks || c.remarks,
            updatedAt: new Date().toISOString()
          } 
        : c
    );

    const success = await saveToFirebase(newCoupons);
    
    if (success) {
      setRedeemFormData({ redeemDate: '', remarks: '' });
      alert(`优惠券 ${couponCode} 回收成功！`);
    }
  };

  const handleEdit = (coupon) => {
    setFormData(coupon);
    setEditingId(coupon.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这条记录吗？')) {
      return;
    }

    if (!isOnline) {
      alert('当前网络离线，请检查网络连接');
      return;
    }

    const newCoupons = coupons.filter(c => c.id !== id);
    await saveToFirebase(newCoupons);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      couponCode: '',
      issueDate: '',
      redeemDate: '',
      remarks: ''
    });
  };

  const exportToExcel = () => {
    if (coupons.length === 0) {
      alert('没有数据可导出');
      return;
    }

    const exportData = coupons.map(c => ({
      '优惠券编号': c.couponCode,
      '发放日期': c.issueDate,
      '使用日期': c.redeemDate || '未使用',
      '备注': c.remarks || '',
      '创建时间': c.createdAt ? new Date(c.createdAt).toLocaleString('zh-CN') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '优惠券记录');
    
    const fileName = `优惠券记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getAvailableCoupons = () => {
    const couponGroups = {};
    
    coupons.forEach(coupon => {
      if (!couponGroups[coupon.couponCode]) {
        couponGroups[coupon.couponCode] = [];
      }
      couponGroups[coupon.couponCode].push(coupon);
    });

    const available = [];
    
    Object.keys(couponGroups).forEach(code => {
      const records = couponGroups[code].sort((a, b) => b.id - a.id);
      const latest = records[0];
      
      if (latest.redeemDate) {
        available.push(code);
      }
    });

    return available.sort();
  };

  const getIssuedNotRedeemed = () => {
    const couponGroups = {};
    
    coupons.forEach(coupon => {
      if (!couponGroups[coupon.couponCode]) {
        couponGroups[coupon.couponCode] = [];
      }
      couponGroups[coupon.couponCode].push(coupon);
    });

    const issued = [];
    
    Object.keys(couponGroups).forEach(code => {
      const records = couponGroups[code].sort((a, b) => b.id - a.id);
      const latest = records[0];
      
      if (latest.issueDate && !latest.redeemDate) {
        issued.push(code);
      }
    });

    return issued.sort();
  };

  const filteredCoupons = coupons.filter(c => 
    c.couponCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.remarks && c.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedCoupons = [...filteredCoupons].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue = a[sortConfig.key] || '';
    let bValue = b[sortConfig.key] || '';

    if (sortConfig.key === 'couponCode') {
      aValue = aValue.toString();
      bValue = bValue.toString();
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const availableCoupons = getAvailableCoupons();
  const issuedCoupons = getIssuedNotRedeemed();

  if (loading) {
    return (
      <div className="min-h-screen" style={{
        background: 'linear-gradient(to bottom right, #7c3aed, #9333ea, #4f46e5)',
        padding: '1rem'
      }}>
        <div className="text-center">
          <div className="relative">
            <Loader className="animate-spin mx-auto mb-4" style={{color: 'white'}} size={64} />
            <Sparkles className="absolute top-0 left-1/2" style={{
              transform: 'translateX(-50%)',
              color: '#fcd34d',
              animation: 'pulse 2s infinite'
            }} size={24} />
          </div>
          <p style={{color: 'white', fontSize: '1.25rem', fontWeight: '600'}}>正在加载数据...</p>
          <p style={{color: '#ddd6fe', fontSize: '0.875rem', marginTop: '0.5rem'}}>Firebase云端同步中</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #7c3aed, #9333ea, #4f46e5)',
      padding: '2rem'
    }}>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 mb-6 border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-2xl shadow-lg">
                <Sparkles className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  优惠券管理系统
                </h1>
                <p className="text-purple-200 text-sm mt-1">实时云端同步 · 多人协作</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="flex items-center gap-2 bg-green-500/20 backdrop-blur-sm border border-green-400/30 text-green-100 px-4 py-2 rounded-full shadow-lg">
                  <Wifi size={18} />
                  <span className="text-sm font-medium">在线同步</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-100 px-4 py-2 rounded-full shadow-lg">
                  <WifiOff size={18} />
                  <span className="text-sm font-medium">离线模式</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-100 px-4 py-3 rounded-2xl mb-6 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-200 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-5 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="text-blue-100 text-sm font-medium">总记录</div>
                <TrendingUp className="text-blue-200" size={20} />
              </div>
              <div className="text-4xl font-bold text-white">{coupons.length}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-5 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="text-yellow-100 text-sm font-medium">流通中</div>
                <Send className="text-yellow-200" size={20} />
              </div>
              <div className="text-4xl font-bold text-white">{issuedCoupons.length}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="text-green-100 text-sm font-medium">可发放</div>
                <Sparkles className="text-green-200" size={20} />
              </div>
              <div className="text-4xl font-bold text-white">{availableCoupons.length}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-5 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="text-purple-100 text-sm font-medium">已回收</div>
                <RotateCcw className="text-purple-200" size={20} />
              </div>
              <div className="text-4xl font-bold text-white">{coupons.filter(c => c.redeemDate).length}</div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 mb-6 border border-green-400/30">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="bg-green-500 p-2 rounded-xl">
              <Send size={24} className="text-white" />
            </div>
            快捷发放优惠券
          </h2>
          {availableCoupons.length > 0 ? (
            <>
              <div className="mb-6">
                <label className="block text-green-100 text-sm font-medium mb-3">
                  选择可发放的优惠券
                </label>
                <div className="flex flex-wrap gap-3">
                  {availableCoupons.map(code => (
                    <button
                      key={code}
                      onClick={() => setSelectedCoupon(code)}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        selectedCoupon === code
                          ? 'bg-white text-green-600 shadow-2xl scale-110'
                          : 'bg-green-500/30 backdrop-blur-sm text-white hover:bg-green-500/50 border border-green-400/30'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCoupon && (
                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        已选优惠券
                      </label>
                      <input
                        type="text"
                        value={selectedCoupon}
                        disabled
                        className="w-full px-4 py-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        发放日期 *
                      </label>
                      <input
                        type="date"
                        value={issueFormData.issueDate}
                        onChange={(e) => setIssueFormData({...issueFormData, issueDate: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">
                        备注信息
                      </label>
                      <input
                        type="text"
                        value={issueFormData.remarks}
                        onChange={(e) => setIssueFormData({...issueFormData, remarks: e.target.value})}
                        placeholder="姓名、电话等"
                        className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleQuickIssue}
                    disabled={!isOnline}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                  >
                    <Send size={20} />
                    确认发放优惠券
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-green-100 py-8 bg-white/5 rounded-2xl">
              <p className="text-lg">暂无可发放的优惠券</p>
              <p className="text-sm text-green-200 mt-2">所有优惠券都在外流通中</p>
            </div>
          )}
        </div>

        {issuedCoupons.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 mb-6 border border-yellow-400/30">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="bg-yellow-500 p-2 rounded-xl">
                <RotateCcw size={24} className="text-white" />
              </div>
              快捷回收优惠券
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  使用日期 *
                </label>
                <input
                  type="date"
                  value={redeemFormData.redeemDate}
                  onChange={(e) => setRedeemFormData({...redeemFormData, redeemDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  备注信息（可选）
                </label>
                <input
                  type="text"
                  value={redeemFormData.remarks}
                  onChange={(e) => setRedeemFormData({...redeemFormData, remarks: e.target.value})}
                  placeholder="补充备注"
                  className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {issuedCoupons.map(code => (
                <button
                  key={code}
                  onClick={() => handleQuickRedeem(code)}
                  disabled={!isOnline}
                  className="bg-white/20 backdrop-blur-sm border border-yellow-400/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={16} />
                  {code}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300" size={20} />
              <input
                type="text"
                placeholder="搜索优惠券编号或备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/90 rounded-xl border-0 focus:ring-2 focus:ring-purple-400 text-gray-800"
              />
            </div>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all font-semibold shadow-xl w-full md:w-auto"
            >
              <Download size={18} />
              导出Excel
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full">
              <thead className="bg-white/20 backdrop-blur-sm">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/30 transition-colors"
                    onClick={() => handleSort('couponCode')}
                  >
                    <div className="flex items-center gap-2">
                      优惠券编号
                      <ArrowUpDown size={16} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/30 transition-colors"
                    onClick={() => handleSort('issueDate')}
                  >
                    <div className="flex items-center gap-2">
                      发放日期
                      <ArrowUpDown size={16} />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/30 transition-colors"
                    onClick={() => handleSort('redeemDate')}
                  >
                    <div className="flex items-center gap-2">
                      使用日期
                      <ArrowUpDown size={16} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">备注</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedCoupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-purple-200">
                      <p className="text-lg">暂无数据</p>
                      <p className="text-sm mt-2">请添加优惠券记录</p>
                    </td>
                  </tr>
                ) : (
                  sortedCoupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-white/10 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-white">{coupon.couponCode}</td>
                      <td className="px-6 py-4 text-sm text-purple-100">{coupon.issueDate}</td>
                      <td className="px-6 py-4 text-sm text-purple-100">{coupon.redeemDate || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          coupon.redeemDate 
                            ? 'bg-green-500/30 text-green-100 border border-green-400/50' 
                            : 'bg-yellow-500/30 text-yellow-100 border border-yellow-400/50'
                        }`}>
                          {coupon.redeemDate ? '已使用' : '流通中'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-purple-100">{coupon.remarks || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="bg-blue-500/30 backdrop-blur-sm border border-blue-400/50 text-blue-100 hover:bg-blue-500/50 p-2 rounded-lg transition-all"
                            title="编辑"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={!isOnline}
                            className="bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-red-100 hover:bg-red-500/50 p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 mt-6 border border-purple-400/30">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="bg-purple-500 p-2 rounded-xl">
              <Plus size={24} className="text-white" />
            </div>
            手动录入优惠券记录
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                优惠券编号 *
              </label>
              <input
                type="text"
                name="couponCode"
                value={formData.couponCode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-purple-400"
                placeholder="输入优惠券编号"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                发放日期 *
              </label>
              <input
                type="date"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                使用日期
              </label>
              <input
                type="date"
                name="redeemDate"
                value={formData.redeemDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                备注信息
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl bg-white/90 border-0 focus:ring-2 focus:ring-purple-400"
                placeholder="姓名、电话等"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!isOnline}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingId ? (
                <>
                  <Save size={18} />
                  更新记录
                </>
              ) : (
                <>
                  <Plus size={18} />
                  添加记录
                </>
              )}
            </button>
            
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-3 rounded-xl hover:bg-white/30 transition-all font-semibold"
              >
                <X size={18} />
                取消
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 text-center">
          <p className="text-purple-200 text-sm">
            ✨ 数据实时同步到Firebase云端 · 支持多人协作 · 安全可靠
          </p>
        </div>
      </div>
    </div>
  );
}