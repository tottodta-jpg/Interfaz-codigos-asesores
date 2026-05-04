import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Mail, ShieldAlert, RefreshCw, Search, CheckCircle2, AlertCircle, 
  Tv, Film, ExternalLink, Moon, Sun, ChevronLeft, ChevronRight, 
  Inbox, Video, Trash2, Lock, LogOut, Filter, Copy, Play, 
  User, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, query, onSnapshot, doc, 
  updateDoc, deleteDoc, getDocs, writeBatch 
} from 'firebase/firestore';

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCML0EpHjSK_9VY22_kAlS41qUHAmEl-zk",
  authDomain: "lector-codigos-77e09.firebaseapp.com",
  projectId: "lector-codigos-77e09",
  storageBucket: "lector-codigos-77e09.firebasestorage.app",
  messagingSenderId: "551428025531",
  appId: "1:551428025531:web:3a9ff4d7e8543927e74d9e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- COMPONENTES AUXILIARES ---

const Notification = ({ message, type }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 shadow-2xl animate-bounce-in transition-all border ${
    type === 'success' 
      ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800' 
      : 'bg-rose-50 dark:bg-rose-900/40 text-rose-800 dark:text-rose-100 border-rose-200 dark:border-rose-800'
  }`}>
    {type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <span className="font-semibold">{message}</span>
  </div>
);

// --- APLICACIÓN PRINCIPAL ---

export default function App() {
  const USER_CORRECTO = 'admin';
  const PASS_CORRECTA = 'secreto123';
  const LOGO_URL = 'https://scontent.fbog2-4.fna.fbcdn.net/v/t39.30808-6/674956853_122171454344930844_2921257025913987444_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=13d280&_nc_ohc=PNV-tmLchfQQ7kNvwHvyrZi&_nc_oc=AdooOPRetGIeIqIyWvRsAbQxPPykR8JDGxfYSlzxAE4Oasyxm4z__JrMEECSo8rejzo&_nc_zt=23&_nc_ht=scontent.fbog2-4.fna&_nc_gid=Qh1vCcZ70AWbBfDwNyK-Cw&_nc_ss=7a3a8&oh=00_Af0wdJTptfLUqPo_2aqQSIMC_XmYI3GMCeLDqewQ7DSDjw&oe=69EAF9B0';

  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('authDashboard') === 'true');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [filterDomain, setFilterDomain] = useState('All');
  const [notification, setNotification] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showNotification = useCallback((message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (usernameInput === USER_CORRECTO && passwordInput === PASS_CORRECTA) {
      setIsAuthenticated(true);
      localStorage.setItem('authDashboard', 'true');
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('authDashboard');
  };

  const handleClearAll = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'received_codes'));
      const batch = writeBatch(db);
      snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
      setShowClearConfirm(false);
      showNotification('Base de datos vaciada', 'success');
    } catch (error) {
      showNotification('Error al limpiar', 'error');
    }
    setLoading(false);
  };

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
      let docsToDelete = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        let docTimeMs = Date.now();

        if (data.timestamp?.toDate) {
          docTimeMs = data.timestamp.toDate().getTime();
        } else if (data.timestamp) {
          docTimeMs = new Date(data.timestamp).getTime();
        }

        if (needsCleanup && docTimeMs < startOfToday) {
          docsToDelete.push(docSnap.ref);
        } else {
          let finalService = data.service;
          const senderEmail = (data.email || '').toLowerCase();
          
          if (senderEmail.includes('microsoft') || senderEmail.includes('outlook')) finalService = 'Hotmail';
          if (senderEmail.includes('amazon') || senderEmail.includes('prime')) finalService = 'Prime Video';
          
          fetchedCodes.push({
            id: docSnap.id,
            ...data,
            service: finalService,
            _sortTime: docTimeMs,
            time: new Date(docTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
          });
        }
      });

      if (needsCleanup && docsToDelete.length > 0) {
        const batch = writeBatch(db);
        docsToDelete.forEach(ref => batch.delete(ref));
        batch.commit();
        localStorage.setItem('lastAutoClearDate', todayStr);
      }

      setCodes(fetchedCodes.sort((a, b) => b._sortTime - a._sortTime));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const copyToClipboard = async (text, id, type = 'code') => {
    if (!text) return;
    try {
      const input = document.createElement('textarea');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      
      showNotification(`${type === 'code' ? 'Código' : 'Correo'} copiado`, 'success');
      if (type === 'code') {
        const docRef = doc(db, 'received_codes', id);
        await updateDoc(docRef, { status: 'read' });
      }

      setCopiedStates(prev => ({ ...prev, [`${type}-${id}`]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [`${type}-${id}`]: false })), 2000);
    } catch (err) {
      showNotification('Error al copiar', 'error');
    }
  };

  /**
   * FUNCIÓN DE EXTRACCIÓN AVANZADA: getDisplayEmail
   * 1. Detecta GoPlay y busca correos dentro del asunto (donde GoPlay pone la cuenta).
   * 2. Mantiene la lógica original para Disney (cPanel) y Hotmail.
   */
  const getDisplayEmail = (item) => {
    const sender = (item.email || '').toLowerCase();
    const subject = (item.subject || '');
    const dest = (item.destinatario || '').toLowerCase();

    // EXTRACCIÓN PARA GOPLAY (Caso especial de las capturas)
    if (sender.includes('goplay')) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      
      // Prioridad 1: Buscar correo en el Asunto (Subject)
      const foundInSubject = subject.match(emailRegex);
      if (foundInSubject && foundInSubject.length > 0) return foundInSubject[0];

      // Prioridad 2: Buscar correo en el campo Destinatario (si no es el de reenvío genérico)
      if (dest && !dest.includes('app@goplay') && !dest.includes('gomakers001')) {
          return item.destinatario;
      }
      
      // Prioridad 3: Buscar correo en el cuerpo del mensaje (si existe campo body)
      const foundInBody = (item.body || '').match(emailRegex);
      if (foundInBody && foundInBody.length > 0) return foundInBody[0];
    }

    // LÓGICA PARA BOTs ESTÁNDAR (Netflix, Disney Directo, Hotmail)
    const isBot = /disney|netflix|hbo|max|microsoft|amazon|prime/.test(sender);
    if (isBot && item.destinatario) return item.destinatario;

    return item.email || 'Sin correo';
  };

  const filteredCodes = useMemo(() => {
    return codes.filter(item => {
      const email = getDisplayEmail(item).toLowerCase();
      const matchesSearch = email.includes(searchTerm.toLowerCase()) || 
                           (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesService = filterService === 'All' || item.service === filterService;
      const domain = email.split('@')[1] || '';
      const matchesDomain = filterDomain === 'All' || domain === filterDomain;
      return matchesSearch && matchesService && matchesDomain;
    });
  }, [codes, searchTerm, filterService, filterDomain]);

  const availableDomains = useMemo(() => {
    const domains = new Set(codes.map(c => getDisplayEmail(c).split('@')[1]).filter(Boolean));
    return ['All', ...Array.from(domains)];
  }, [codes]);

  const paginatedCodes = filteredCodes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);

  const getServiceStyles = (service) => {
    switch (service) {
      case 'Netflix': return { icon: <Tv />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' };
      case 'Disney+': return { icon: <Film />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' };
      case 'HBO': return { icon: <Video />, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' };
      case 'Hotmail': return { icon: <Mail />, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' };
      case 'Prime Video': return { icon: <Play />, color: 'text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' };
      default: return { icon: <ShieldAlert />, color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900' };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 border border-slate-200 dark:border-slate-800">
            <div className="text-center mb-10">
              <img src={LOGO_URL} className="w-24 h-24 mx-auto rounded-2xl shadow-lg mb-6 object-cover" alt="Logo" />
              <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Acceso Master</h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Panel de Gestión de Códigos</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <input 
                type="text" placeholder="Usuario" value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              />
              <input 
                type="password" placeholder="Contraseña" value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:text-white focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
              />
              {loginError && <p className="text-rose-500 text-sm font-bold text-center animate-pulse">{loginError}</p>}
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                Entrar al Sistema
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-500 text-slate-900 dark:text-slate-100">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {notification && <Notification {...notification} />}

          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-blue-500/20 shadow-lg">
                <Inbox className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Receptor Maestro</h1>
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Firebase
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:scale-110 transition-transform">
                {isDarkMode ? <Sun /> : <Moon />}
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                <LogOut className="w-5 h-5" /> Salir
              </button>
            </div>
          </header>

          {/* FILTROS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Buscar cuenta o correo..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <select 
                value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-500"
              >
                <option value="All">Todos los dominios</option>
                {availableDomains.filter(d => d !== 'All').map(d => <option key={d} value={d}>@{d}</option>)}
              </select>
            </div>
            <div className="md:col-span-4 flex gap-2 overflow-x-auto">
              {['All', 'Netflix', 'Disney+', 'HBO', 'Hotmail'].map(s => (
                <button 
                  key={s} onClick={() => setFilterService(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${filterService === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                >
                  {s === 'All' ? 'Todos' : s}
                </button>
              ))}
            </div>
          </div>

          {/* LISTADO */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-lg flex items-center gap-2">Bandeja de Entrada <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-lg">{filteredCodes.length}</span></h2>
              
              {showClearConfirm ? (
                <div className="flex gap-2">
                  <button onClick={handleClearAll} className="text-xs bg-rose-600 text-white px-3 py-2 rounded-lg font-bold">Confirmar</button>
                  <button onClick={() => setShowClearConfirm(false)} className="text-xs bg-slate-200 dark:bg-slate-700 px-3 py-2 rounded-lg font-bold">No</button>
                </div>
              ) : (
                <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-2 text-slate-400 hover:text-rose-500 transition-colors text-sm font-bold">
                  <Trash2 className="w-4 h-4" /> Limpiar Todo
                </button>
              )}
            </div>

            {paginatedCodes.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <Mail className="w-16 h-16 mx-auto text-slate-200 dark:text-slate-800" />
                <p className="text-slate-400 font-bold">No hay códigos registrados hoy.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedCodes.map(item => {
                  const styles = getServiceStyles(item.service);
                  const displayEmail = getDisplayEmail(item);
                  const isRead = item.status === 'read';

                  return (
                    <div key={item.id} className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${item.status === 'new' ? 'border-l-4 border-blue-500' : ''}`}>
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl ${styles.bg} ${styles.color}`}>
                          {styles.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 dark:text-white truncate">{item.service}</h3>
                            {item.status === 'new' && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Nuevo</span>}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-500 font-semibold mt-0.5">
                            <span className="truncate max-w-[250px]">{displayEmail}</span>
                            <button 
                              onClick={() => copyToClipboard(displayEmail, item.id, 'email')}
                              className="p-1 hover:text-blue-500 transition-colors shrink-0"
                              title="Copiar Correo"
                            >
                              {copiedStates[`email-${item.id}`] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.time}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {item.type === 'link' ? (
                          <a 
                            href={item.url || item.code} target="_blank" rel="noreferrer"
                            onClick={() => updateDoc(doc(db, 'received_codes', item.id), { status: 'read' })}
                            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 ${isRead ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20'}`}
                          >
                            <ExternalLink className="w-4 h-4" /> {isRead ? 'Enlace Abierto' : 'Abrir Acceso'}
                          </a>
                        ) : (
                          <>
                            <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl font-mono text-xl font-black tracking-widest text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                              {item.code?.replace(/\s+/g, '')}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(item.code, item.id)}
                              className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 min-w-[100px] justify-center ${copiedStates[`code-${item.id}`] ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-600 dark:text-slate-300'}`}
                            >
                              {copiedStates[`code-${item.id}`] ? <Check /> : isRead ? 'Usado' : 'Copiar'}
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
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 bg-white dark:bg-slate-800 rounded-lg disabled:opacity-30 transition-all"><ChevronLeft /></button>
                  <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 bg-white dark:bg-slate-800 rounded-lg disabled:opacity-30 transition-all"><ChevronRight /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
