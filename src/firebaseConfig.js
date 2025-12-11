import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAjA0oLCSrTtsJjN3zPLRd4ox2gnwfdmXI',
  authDomain: 'mumu2-3137e.firebaseapp.com',
  databaseURL: 'https://mumu2-3137e-default-rtdb.firebaseio.com/',
  projectId: 'mumu2-3137e',
  storageBucket: 'mumu2-3137e.firebasestorage.app',
  messagingSenderId: '754686346476',
  appId: '1:754686346476:web:3cd77e51dc03fdfb5311c9',
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };