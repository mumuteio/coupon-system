// 导入Firebase配置
import { database } from './firebaseConfig';
import { ref, onValue, set } from 'firebase/database';

import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Search, Edit2, Save, X, ArrowUpDown, Send, RotateCcw, Wifi, WifiOff, Loader } from 'lucide-react';
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

  // Firebase实时监听
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

    // 监听网络状态
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

  // 保存到Firebase
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-600 text-lg">正在从Firebase加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              优惠券发放管理系统
            </h1>
            <div className="flex items-center gap-3">
              {isOnline ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Wifi size={18} />
                  <span className="text-sm font-medium">Firebase在线</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  <WifiOff size={18} />
                  <span className="text-sm font-medium">网络离线</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <X size={18} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">总记录数</div>
              <div className="text-2xl font-bold text-blue-700">{coupons.length}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600 font-medium">已发放未使用</div>
              <div className="text-2xl font-bold text-yellow-700">{issuedCoupons.length}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">可发放优惠券</div>
              <div className="text-2xl font-bold text-green-700">{availableCoupons.length}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">已回收次数</div>
              <div className="text-2xl font-bold text-purple-700">{coupons.filter(c => c.redeemDate).length}</div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
              <Send size={24} />
              快捷发放优惠券
            </h2>
            {availableCoupons.length > 0 ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择可发放的优惠券
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {availableCoupons.map(code => (
                      <button
                        key={code}
                        onClick={() => setSelectedCoupon(code)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          selectedCoupon === code
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-green-200 text-green-800 hover:bg-green-300'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCoupon && (
                  <div className="bg-white p-4 rounded-lg border-2 border-green-400">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          已选优惠券
                        </label>
                        <input
                          type="text"
                          value={selectedCoupon}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          发放日期 *
                        </label>
                        <input
                          type="date"
                          value={issueFormData.issueDate}
                          onChange={(e) => setIssueFormData({...issueFormData, issueDate: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          备注
                        </label>
                        <input
                          type="text"
                          value={issueFormData.remarks}
                          onChange={(e) => setIssueFormData({...issueFormData, remarks: e.target.value})}
                          placeholder="姓名、电话等"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleQuickIssue}
                      disabled={!isOnline}
                      className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Send size={20} />
                      确认发放
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                暂无可发放的优惠券（所有优惠券都在外流通中）
              </div>
            )}
          </div>

          {issuedCoupons.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
                <RotateCcw size={24} />
                快捷回收优惠券
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  已发放未使用的优惠券（点击回收）
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      使用日期 *
                    </label>
                    <input
                      type="date"
                      value={redeemFormData.redeemDate}
                      onChange={(e) => setRedeemFormData({...redeemFormData, redeemDate: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      备注（可选）
                    </label>
                    <input
                      type="text"
                      value={redeemFormData.remarks}
                      onChange={(e) => setRedeemFormData({...redeemFormData, remarks: e.target.value})}
                      placeholder="补充备注信息"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {issuedCoupons.map(code => (
                    <button
                      key={code}
                      onClick={() => handleQuickRedeem(code)}
                      disabled={!isOnline}
                      className="bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg font-medium hover:bg-yellow-300 transition-all flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={16} />
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索优惠券编号或备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors w-full sm:w-auto"
            >
              <Download size={18} />
              导出到Excel
            </button>
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('couponCode')}
                  >
                    <div className="flex items-center gap-2">
                      优惠券编号
                      <ArrowUpDown size={16} />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('issueDate')}
                  >
                    <div className="flex items-center gap-2">
                      发放日期
                      <ArrowUpDown size={16} />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('redeemDate')}
                  >
                    <div className="flex items-center gap-2">
                      使用日期
                      <ArrowUpDown size={16} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">备注</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedCoupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      暂无数据，请添加优惠券记录
                    </td>
                  </tr>
                ) : (
                  sortedCoupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{coupon.couponCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{coupon.issueDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{coupon.redeemDate || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${coupon.redeemDate ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {coupon.redeemDate ? '已使用' : '未使用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{coupon.remarks || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="编辑"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={!isOnline}
                            className="text-red-600 hover:text-red-800 p-1 disabled:text-gray-400 disabled:cursor-not-allowed"
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

          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">手动录入优惠券记录</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优惠券编号 *
                </label>
                <input
                  type="text"
                  name="couponCode"
                  value={formData.couponCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入优惠券编号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  发放日期 *
                </label>
                <input
                  type="date"
                  name="issueDate"
                  value={formData.issueDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用日期
                </label>
                <input
                  type="date"
                  name="redeemDate"
                  value={formData.redeemDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备注
                </label>
                <input
                  type="text"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="可输入姓名、电话等信息"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={!isOnline}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-2 bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <X size={18} />
                  取消
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}