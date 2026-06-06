import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, ShieldAlert, RefreshCw, Search, CheckCircle2, AlertCircle, Tv, Film, ExternalLink, Moon, Sun, ChevronLeft, ChevronRight, Inbox, Video, Trash2, Lock, LogOut, Filter, Copy, Check, ShieldCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';

// TUS LLAVES REALES DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCML0EpHjSK_9VY22_kAlS41qUHAmEl-zk",
  authDomain: "lector-codigos-77e09.firebaseapp.com",
  projectId: "lector-codigos-77e09",
  storageBucket: "lector-codigos-77e09.firebasestorage.app",
  messagingSenderId: "551428025531",
  appId: "1:551428025531:web:3a9ff4d7e8543927e74d9e"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  // --- SISTEMA DE LOGIN ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('authDashboard') === 'true';
  });

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  const USER_CORRECTO = 'admin';
  const PASS_CORRECTA = 'secreto123';
  
  const LOGO_URL = 'https://scontent.fbog2-4.fna.fbcdn.net/v/t39.30808-6/674956853_122171454344930844_2921257025913987444_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=13d280&_nc_ohc=PNV-tmLchfQQ7kNvwHvyrZi&_nc_oc=AdooOPRetGIeIqIyWvRsAbQxPPykR8JDGxfYSlzxAE4Oasyxm4z__JrMEECSo8rejzo&_nc_zt=23&_nc_ht=scontent.fbog2-4.fna&_nc_gid=Qh1vCcZ70AWbBfDwNyK-Cw&_nc_ss=7a3a8&oh=00_Af0wdJTptfLUqPo_2aqQSIMC_XmYI3GMCeLDqewQ7DSDjw&oe=69EAF9B0'; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (usernameInput === USER_CORRECTO && passwordInput === PASS_CORRECTA) {
      setIsAuthenticated(true);
      localStorage.setItem('authDashboard', 'true');
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('authDashboard');
    setUsernameInput('');
    setPasswordInput('');
  };

  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [filterDomain, setFilterDomain] = useState('All');
  const [notification, setNotification] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [nowMs, setNowMs] = useState(Date.now());
  const itemsPerPage = 10;

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = useCallback((message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleClearAll = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'received_codes'));
      const batches = [];
      for (let i = 0; i < snapshot.docs.length; i += 500) {
        const batch = writeBatch(db);
        snapshot.docs.slice(i, i + 500).forEach(docSnap => {
          batch.delete(doc(db, 'received_codes', docSnap.id));
        });
        batches.push(batch.commit());
      }
      await Promise.all(batches);
      setShowClearConfirm(false);
      showNotification('Base de datos limpiada completamente', 'success');
    } catch (error) {
      showNotification('Error al limpiar base de datos', 'error');
    }
    setLoading(false);
  }, [showNotification]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const q = query(collection(db, 'received_codes'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const todayStr = now.toLocaleDateString();
      const lastClear = localStorage.getItem('lastAutoClearDate');
      const needsCleanup = lastClear !== todayStr;

      const startOfToday = new Date().setHours(0, 0, 0, 0);

      let fetchedCodes = [];
      const docsToDelete = [];

      snapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        let timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        let docTimeMs = Date.now(); 

        if (data.timestamp) {
          if (data.timestamp.toDate) {
            const dateObj = data.timestamp.toDate();
            docTimeMs = dateObj.getTime();
            timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          } else {
            const parsedMs = new Date(data.timestamp).getTime();
            if (!isNaN(parsedMs)) {
              docTimeMs = parsedMs;
              timeString = new Date(parsedMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            }
          }
        }

        if (needsCleanup && docTimeMs < startOfToday) {
          docsToDelete.push(docSnapshot.id);
        } else {
          const senderEmail = (data.email || '').toLowerCase();
          const subjectRaw = (data.subject || '').toLowerCase();
          
          // --- NUEVO: DECODIFICADOR SEGURO DEL CUERPO ---
          let decodedBody = data.body || '';
          try {
            // Desencriptamos el texto seguro que enviará Make
            decodedBody = decodeURIComponent(data.body || '');
          } catch(e) {
            decodedBody = data.body || '';
          }
          const bodyRaw = decodedBody.toLowerCase();
          // ---------------------------------------------

          const combinedText = `${subjectRaw} ${senderEmail} ${bodyRaw}`.toLowerCase();
          
          // --- FILTRO DE EXCLUSIÓN QUIRÚRGICO ---
          const isDisneyRelated = combinedText.includes('disney');
          const isLegalAgreement = subjectRaw.includes('acuerdo de suscripción') || bodyRaw.includes('acuerdo de suscripción');
          const isNovedades = senderEmail.includes('novedades@');
          
          if ((isDisneyRelated && isLegalAgreement) || isNovedades) {
            return; 
          }

          // --- DETECCIÓN INTELIGENTE GLOBAL DE SERVICIO ---
          let finalService = (data.service || 'Netflix').trim();

          if (combinedText.includes('netflix')) {
            finalService = 'Netflix';
          } else if (combinedText.includes('disney')) {
            finalService = 'Disney+';
          } else if (combinedText.includes('hbo') || combinedText.includes('max')) {
            finalService = 'HBO';
          } else if (combinedText.includes('microsoft') || senderEmail.includes('accountprotection')) {
            finalService = 'Hotmail';
          } else if (combinedText.includes('redeban')) { 
            finalService = 'Redeban';
          } else {
             finalService = 'Netflix';
          }

          fetchedCodes.push({ 
            id: docSnapshot.id, 
            ...data, 
            service: finalService, 
            time: timeString, 
            _sortTime: docTimeMs
          });
        }
      });

      if (needsCleanup && docsToDelete.length > 0) {
        const processBatches = async () => {
          const batches = [];
          for (let i = 0; i < docsToDelete.length; i += 500) {
            const batch = writeBatch(db);
            docsToDelete.slice(i, i + 500).forEach(id => {
              batch.delete(doc(db, 'received_codes', id));
            });
            batches.push(batch.commit());
          }
          await Promise.all(batches);
        };
        processBatches();
        localStorage.setItem('lastAutoClearDate', todayStr);
      }
      
      fetchedCodes.sort((a, b) => b._sortTime - a._sortTime);
      setCodes(fetchedCodes); 
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated, showNotification]);

  const markAsRead = async (id) => {
    try {
      const docRef = doc(db, 'received_codes', id);
      await updateDoc(docRef, { status: 'read' });
    } catch (error) {}
  };

  const copyToClipboard = (text, id) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      
      showNotification(`Código copiado al portapapeles`, 'success');
      markAsRead(id);

      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      showNotification('Error al copiar el código', 'error');
    }
  };

  const getDisplayEmail = (item) => {
    const sender = (item.email || '').toLowerCase();
    const destinatario = (item.destinatario || '').toLowerCase();
    
    const isGeneric = sender.includes('goplay') || sender.includes('gomakers') || sender.includes('dominioprime');

    if (isGeneric) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
      
      // --- NUEVO: DECODIFICADOR SEGURO DEL CUERPO ---
      let decodedBody = item.body || '';
      try {
        decodedBody = decodeURIComponent(item.body || '');
      } catch(e) {}
      // ---------------------------------------------

      const textToScan = `${item.subject || ''} ${decodedBody} ${item.destinatario || ''} ${item.code || ''}`;
      const matches = textToScan.match(emailRegex);
      if (matches) {
        const realAccount = matches.find(e => {
            const low = e.toLowerCase();
            return !low.includes('goplay') && 
                   !low.includes('gomakers') && 
                   !low.includes('dominioprime') &&
                   !low.includes('@account.netflix.com') &&
                   !low.includes('@netflix.com');
        });
        if (realAccount) return realAccount;
      }
    }

    const isBot = /disney|netflix|hbo|max|microsoft|amazon|prime|redeban/.test(sender);
    if (isBot && item.destinatario) {
        if (!destinatario.includes('gomakers') && !destinatario.includes('goplay') && !destinatario.includes('dominioprime')) {
            return item.destinatario;
        }
    }

    return item.email || 'Sin correo';
  };

  const filteredCodes = useMemo(() => {
    return codes.filter(item => {
      const displayEmail = getDisplayEmail(item).toLowerCase();
      const matchesSearch = displayEmail.includes(searchTerm.toLowerCase()) || 
                           (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.code || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = filterService === 'All' || item.service === filterService;
      const domain = displayEmail.includes('@') ? displayEmail.split('@')[1] : '';
      const matchesDomain = filterDomain === 'All' || domain === filterDomain;

      return matchesSearch && matchesService && matchesDomain;
    });
  }, [codes, searchTerm, filterService, filterDomain]);

  const availableDomains = useMemo(() => {
    const domains = new Set();
    codes.forEach(c => {
      const email = getDisplayEmail(c);
      if(email.includes('@')) domains.add(email.split('@')[1].toLowerCase());
    });
    return ['All', ...Array.from(domains)];
  }, [codes]);

  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const paginatedCodes = filteredCodes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getServiceIcon = (service) => {
    switch (service) {
      case 'Netflix': return <Tv className="w-5 h-5 text-red-600 dark:text-red-500" />;
      case 'Disney+': return <Film className="w-5 h-5 text-blue-600 dark:text-blue-500" />;
      case 'HBO': return <Video className="w-5 h-5 text-purple-600 dark:text-purple-500" />;
      case 'Hotmail': return <Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />;
      case 'Redeban': return <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-500" />;
      default: return <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-6 right-6 p-2.5 rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-slate-700"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-8">
            <div className="text-center mb-8">
              <img src={LOGO_URL} alt="Logo" className="mx-auto mb-6 max-h-24 w-auto object-contain rounded-2xl" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Acceso Restringido</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Usuario</label>
                <input 
                  type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white outline-none"
                  placeholder="Usuario" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
                <input 
                  type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white outline-none"
                  placeholder="••••••••" required
                />
              </div>
              {loginError && <div className="text-red-600 text-sm font-medium text-center">{loginError}</div>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                Ingresar al Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8 font-sans transition-colors duration-200">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Inbox className="text-blue-600 dark:text-blue-400" />
                Interfaz de Códigos GM
              </h1>
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Conectado en vivo
              </span>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-3">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 hover:text-red-600 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 font-medium transition-colors border border-transparent hover:border-red-200">
                <LogOut className="w-4 h-4" /> Salir
              </button>
            </div>
          </header>

          <div className="fixed top-4 right-4 z-50">
            {notification && (
              <div className={`p-4 rounded-lg flex items-center gap-3 shadow-lg ${notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-100 border border-green-200' : 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-100 border border-red-200'}`}>
                {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                <span className="font-bold">{notification.message}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" placeholder="Busca por cuenta o correo..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none"
              />
            </div>

            <select
              value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)}
              className="pl-4 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg outline-none cursor-pointer appearance-none"
            >
              <option value="All">Todos los dominios</option>
              {availableDomains.filter(d => d !== 'All').map(d => <option key={d} value={d}>@{d}</option>)}
            </select>

            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {['All', 'Netflix', 'Disney+', 'HBO', 'Hotmail', 'Redeban'].map(service => (
                <button
                  key={service} onClick={() => setFilterService(service)}
                  className={`px-4 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap ${filterService === service ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                >
                  {service === 'All' ? 'Todos' : service}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                Bandeja de Entrada
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{filteredCodes.length}</span>
              </h2>
              {showClearConfirm ? (
                <div className="flex gap-2">
                  <button onClick={() => handleClearAll()} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md font-bold hover:bg-red-700 transition-colors">Sí, Limpiar BD</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-xs bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors" title="Limpiar todos los códigos">
                  <Trash2 className="w-4 h-4" />
                  Limpiar Todo
                </button>
              )}
            </div>
            
            {filteredCodes.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-lg text-gray-400">No hay códigos registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {paginatedCodes.map((item) => {
                  const displayEmail = getDisplayEmail(item);
                  const isRead = item.status === 'read';
                  const cleanCode = item.code ? item.code.replace(/\s+/g, '') : '';
                  const isRecent = (nowMs - item._sortTime) < (5 * 60 * 1000); 

                  return (
                    <div key={item.id} className={`p-4 sm:p-6 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${item.status === 'new' ? 'bg-blue-50/5 dark:bg-blue-900/5' : 'hover:bg-gray-50 dark:hover:bg-slate-800/80'}`}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-100 dark:bg-slate-900 rounded-xl">
                          {getServiceIcon(item.service)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-white">{item.service}</h3>
                            {item.status === 'new' && isRecent && <span className="bg-fuchsia-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NUEVO</span>}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="truncate max-w-[200px] font-bold text-blue-500 dark:text-blue-400">{displayEmail}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-white font-bold mt-1 uppercase tracking-wider">{item.time}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {item.type === 'link' ? (
                          <a 
                            href={item.url || item.code} target="_blank" rel="noreferrer"
                            onClick={() => markAsRead(item.id)}
                            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none shadow-sm ${isRead ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95'}`}
                          >
                            {isRead ? <CheckCircle2 className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                            {isRead ? 'Enlace Usado' : 'Abrir Enlace'}
                          </a>
                        ) : (
                          <>
                            <div className="bg-gray-100 dark:bg-slate-900/50 px-5 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 font-mono text-xl font-bold text-gray-900 dark:text-white flex-1 sm:flex-none text-center">
                              {cleanCode}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(cleanCode, item.id)}
                              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 min-w-[110px] ${
                                copiedStates[item.id]
                                  ? 'bg-green-500 border border-green-600 text-white'
                                  : item.status === 'read'
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {copiedStates[item.id] ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" /> ¡Copiado!
                                </>
                              ) : item.status === 'read' ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" /> Usado
                                </>
                              ) : (
                                'Copiar'
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">PÁGINA {currentPage} DE {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white dark:bg-slate-800 rounded-lg disabled:opacity-30 border border-gray-200 dark:border-slate-600"><ChevronLeft /></button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white dark:bg-slate-800 rounded-lg disabled:opacity-30 border border-gray-200 dark:border-slate-600"><ChevronRight /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```eof

### Paso 2: El Ajuste en Make.com (Enviar el correo oculto)

Ahora que React está listo para desencriptar, vamos a decirle a Make que envíe el texto seguro:

1. Ve a tu escenario en **Make.com** y abre tu módulo azul **HTTP**.
2. Ubica la línea donde escribiste:
   `"body": { "stringValue": "Cuerpo omitido" }`
3. Borra la frase `Cuerpo omitido` (dejando las comillas).
4. Dentro de las comillas, ve a la pestaña superior que tiene el ícono de una **"A"** (String functions) y haz clic en la función `encodeURL`.
5. Se escribirá `encodeURL ()` en tu recuadro. Haz clic justo en el medio de los paréntesis.
6. Ahora ve a la primera pestaña (la estrellita) y selecciona la variable rosa de tu correo que dice `Text content` (o `Text`).

Visualmente en tu recuadro de Make, esa línea debería verse exactamente así:
`"body": { "stringValue": "{{encodeURL(1.text)}}" }`

**¡Guarda los cambios y haz la prueba final!**
Al hacer esto, Make enviará el texto completo del correo pero convertido en formato seguro de web (ej. `%20Hola%0A...`), el JSON fluirá sin romperse jamás, y tu interfaz React lo traducirá de inmediato para mostrar en pantalla el anhelado `TishBonser8203@hotmail.com`.
