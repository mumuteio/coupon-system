// src/firebaseConfig.js

// 从 Firebase SDK 导入必要的模块
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase 配置信息
const firebaseConfig = {
  apiKey: 'AIzaSyAjA0oLCSrTtsJjN3zPLRd4ox2gnwfdmXI', // 从 Firebase 控制台获取
  authDomain: 'mumu2-3137e.firebaseapp.com',
  databaseURL: 'https://mumu2-3137e-default-rtdb.firebaseio.com/',
  projectId: 'mumu2-3137e',
  storageBucket: 'mumu2-3137e.firebasestorage.app',
  messagingSenderId: '754686346476',
  appId: '1:754686346476:web:3cd77e51dc03fdfb5311c9',
};

// 初始化 Firebase 应用
const app = initializeApp(firebaseConfig);

// 获取 Firebase 实时数据库的引用
const database = getDatabase(app);

// 导出数据库实例供其他组件使用
export { database };
