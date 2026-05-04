import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Mail, ShieldAlert, RefreshCw, Search, CheckCircle2, AlertCircle, Tv, Film, ExternalLink, Moon, Sun, ChevronLeft, ChevronRight, Inbox, Video, Trash2, Lock, LogOut, Filter } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';

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

  // --------------------------------------------------------
  // 🔐 CONFIGURACIÓN DE ACCESO Y DISEÑO
  // --------------------------------------------------------
  const USER_CORRECTO = 'admin';
  const PASS_CORRECTA = 'secreto123';
  
  // 🖼️ Enlace de tu logo
  const LOGO_URL = 'https://scontent.fbog2-4.fna.fbcdn.net/v/t39.30808-6/674956853_122171454344930844_2921257025913987444_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=13d280&_nc_ohc=PNV-tmLchfQQ7kNvwHvyrZi&_nc_oc=AdooOPRetGIeIqIyWvRsAbQxPPykR8JDGxfYSlzxAE4Oasyxm4z__JrMEECSo8rejzo&_nc_zt=23&_nc_ht=scontent.fbog2-4.fna&_nc_gid=Qh1vCcZ70AWbBfDwNyK-Cw&_nc_ss=7a3a8&oh=00_Af0wdJTptfLUqPo_2aqQSIMC_XmYI3GMCeLDqewQ7DSDjw&oe=69EAF9B0'; 
  // --------------------------------------------------------

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
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showNotification = useCallback((message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- LIMPIEZA MANUAL PROFUNDA (Botón "Limpiar BD") ---
  const handleClearAll = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'received_codes'));
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'received_codes', docSnap.id)));
      await Promise.all(deletePromises);
      
      setShowClearConfirm(false);
      showNotification('Base de datos limpiada completamente', 'success');
    } catch (error) {
      console.error("Error limpiando:", error);
      showNotification('Error al limpiar base de datos', 'error');
    }
    setLoading(false);
  }, [showNotification]);

  // --- LÓGICA DE LIMPIEZA INTELIGENTE RETROACTIVA (Solo borra lo de ayer) ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkAndAutoClear = async () => {
      const now = new Date();
      const todayStr = now.toLocaleDateString();
      const lastClear = localStorage.getItem('lastAutoClearDate');

      // Si es un día nuevo, ejecutamos la limpieza inteligente
      if (lastClear !== todayStr) {
        try {
          const snapshot = await getDocs(collection(db, 'received_codes'));
          
          // Calculamos la hora exacta en la que inició el día de hoy (Medianoche)
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const todayMs = startOfToday.getTime();
          
          const deletePromises = [];
          
          snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            let docTimeMs = Date.now(); // Por defecto asume que es nuevo para protegerlo en caso de error
            
            // Extraemos la fecha del código con precisión
            if (data.timestamp) {
              if (data.timestamp.toDate) {
                docTimeMs = data.timestamp.toDate().getTime();
              } else if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
                const parsedMs = new Date(data.timestamp).getTime();
                if (!isNaN(parsedMs)) docTimeMs = parsedMs;
              }
            }

            // Si la fecha del documento es anterior a la medianoche de hoy, lo marcamos para borrar
            if (docTimeMs < todayMs) {
              deletePromises.push(deleteDoc(doc(db, 'received_codes', docSnap.id)));
            }
          });

          // Si encontró códigos viejos, los borra
          if (deletePromises.length > 0) {
            await Promise.all(deletePromises);
            showNotification(`Mantenimiento matutino: ${deletePromises.length} códigos de días anteriores eliminados.`, 'success');
          }

          // Guardamos que ya se hizo la revisión de hoy
          localStorage.setItem('lastAutoClearDate', todayStr);
        } catch (error) {
          console.error("Error en limpieza automática:", error);
        }
      }
    };

    // 1. Revisa apenas abras la página (ej. llegas a las 8:00 AM)
    checkAndAutoClear();

    // 2. Por si acaso dejas la página abierta en la noche, se queda revisando.
    const intervalId = setInterval(checkAndAutoClear, 60000); 

    return () => clearInterval(intervalId);
  }, [isAuthenticated, showNotification]);

  // CONEXIÓN EN TIEMPO REAL A FIREBASE
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    const q = query(collection(db, 'received_codes'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let fetchedCodes = snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        let timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        let timeValue = Date.now(); 

        if (data.timestamp) {
          if (data.timestamp.toDate) {
            timeValue = data.timestamp.toDate().getTime();
            timeString = data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          } else if (typeof data.timestamp === 'string' || typeof data.timestamp === 'number') {
            timeValue = new Date(data.timestamp).getTime();
            timeString = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }

        // LÓGICA INTELIGENTE PARA DETECTAR Y RENOMBRAR HOTMAIL
        let finalService = data.service;
        const senderEmail = (data.email || '').toLowerCase(); 
        
        if (senderEmail.includes('accountprotection.microsoft.com') || senderEmail.includes('account-security-noreply')) {
          finalService = 'Hotmail';
        }

        return { id: docSnapshot.id, ...data, service: finalService, time: timeString, _sortTime: timeValue };
      });
      
      fetchedCodes.sort((a, b) => b._sortTime - a._sortTime);
      setCodes(fetchedCodes.slice(0, 100)); 
      setLoading(false);
    }, (error) => {
      console.error("Error conectando a Firebase:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterService, filterDomain]);

  const fetchCodes = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showNotification('Sincronización forzada completada', 'success');
    }, 800);
  };

  const markAsRead = async (id) => {
    try {
      const docRef = doc(db, 'received_codes', id);
      await updateDoc(docRef, { status: 'read' });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  const copyToClipboard = (text, id) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      showNotification(`Código copiado al portapapeles`, 'success');
      markAsRead(id);
    } catch (err) {
      showNotification('Error al copiar el código', 'error');
    }
  };

  // --- LÓGICA INTELIGENTE PARA DECIDIR QUÉ CORREO MOSTRAR ---
  const getDisplayEmail = (item) => {
    const sender = (item.email || '').toLowerCase();
    const isDisneyBot = sender.includes('disneyplus.com') || sender.includes('disney.com');
    const isNetflixBot = sender.includes('netflix.com');
    
    if (item.service === 'Hotmail' || isDisneyBot || isNetflixBot) {
      return item.destinatario || item.email || '';
    }
    return item.email || '';
  };

  // --- LÓGICA INTELIGENTE: EXTRAER EL ENLACE CORRECTO (ESPECIAL NETFLIX) ---
  const getDisplayUrl = (item) => {
    let rawData = item.url || item.code || '';
    if (!rawData) return '#';

    const urlRegex = /(https?:\/\/[^\s"'<>]+)/g;
    const urls = rawData.match(urlRegex);

    if (!urls || urls.length === 0) {
      return rawData.replace(/\s+/g, '');
    }

    if (item.service === 'Netflix') {
      let validUrls = urls.filter(url => {
        const lowerUrl = url.toLowerCase();
        return !lowerUrl.includes('help.netflix.com') && 
               !lowerUrl.includes('/support') && 
               !lowerUrl.includes('/privacy') && 
               !lowerUrl.includes('termsofuse') &&
               !(lowerUrl === 'https://www.netflix.com' || lowerUrl === 'https://www.netflix.com/') &&
               !lowerUrl.includes('netflix.com/browse');
      });

      if (validUrls.length === 0) return urls[0];

      validUrls.sort((a, b) => b.length - a.length);
      return validUrls[0];
    }

    return urls[0];
  };

  const availableDomains = useMemo(() => {
    const domains = new Set();
    codes.forEach(c => {
      const targetEmail = getDisplayEmail(c);
      if(targetEmail.includes('@')) {
        domains.add(targetEmail.split('@')[1].toLowerCase());
      }
    });
    return ['All', ...Array.from(domains)];
  }, [codes]);

  const filteredCodes = codes.filter(item => {
    const targetEmail = getDisplayEmail(item);
    const matchesSearch = targetEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = filterService === 'All' || item.service === filterService;
    const itemDomain = targetEmail.includes('@') ? targetEmail.split('@')[1].toLowerCase() : '';
    const matchesDomain = filterDomain === 'All' || itemDomain === filterDomain;

    return matchesSearch && matchesService && matchesDomain;
  });

  const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
  const paginatedCodes = filteredCodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getServiceIcon = (service) => {
    switch (service) {
      case 'Netflix': return <Tv className="w-5 h-5 text-red-600 dark:text-red-500" />;
      case 'Disney+': return <Film className="w-5 h-5 text-blue-600 dark:text-blue-500" />;
      case 'HBO': return <Video className="w-5 h-5 text-purple-600 dark:text-purple-500" />;
      case 'Hotmail': return <Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />;
      default: return <ShieldAlert className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-200">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-6 right-6 p-2.5 rounded-full bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-8 transform transition-all">
            <div className="text-center mb-8">
              {LOGO_URL ? (
                <img 
                  src={LOGO_URL} 
                  alt="Logo Empresa" 
                  className="mx-auto mb-6 max-h-24 w-auto object-contain drop-shadow-md rounded-2xl"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="bg-blue-100 dark:bg-blue-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Acceso Restringido</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Por favor, ingresa tus credenciales para acceder al panel de códigos.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Usuario</label>
                <input 
                  type="text" 
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ingresa tu usuario"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              {loginError && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm font-medium animate-fade-in-down border border-red-100 dark:border-red-800/30">
                  <AlertCircle className="w-4 h-4" />
                  {loginError}
                </div>
              )}
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg active:scale-[0.98] flex justify-center items-center gap-2"
              >
                Ingresar al Panel
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- PANTALLA PRINCIPAL (DASHBOARD) ---
  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8 font-sans transition-colors duration-200">
        <div className="max-w-5xl mx-auto space-y-6">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Inbox className="text-blue-600 dark:text-blue-400" />
                Receptor Maestro de Códigos
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Conectado a Firebase en vivo
                </span>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={fetchCodes}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sincronizar</span>
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-4 py-2.5 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800/50"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </header>

          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
            {notification && (
              <div className={`p-4 rounded-lg flex items-center gap-3 shadow-lg animate-fade-in-down transition-all ${
                notification.type === 'success' ? 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-100 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-100 border border-red-200 dark:border-red-800'
              }`}>
                {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                <span className="font-medium">{notification.message}</span>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row gap-4 transition-colors">
            {/* Buscador */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Busca el correo (ej. juan@hotmail.com)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Selector de Dominios */}
            <div className="relative min-w-[180px]">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer font-medium"
              >
                <option value="All">Todos los correos</option>
                {availableDomains.filter(d => d !== 'All').map(domain => (
                  <option key={domain} value={domain}>@{domain}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <ChevronRight className="w-4 h-4 text-gray-400 transform rotate-90" />
              </div>
            </div>

            {/* Selector de Plataforma */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {['All', 'Netflix', 'Disney+', 'HBO', 'Hotmail'].map(service => (
                <button
                  key={service}
                  onClick={() => setFilterService(service)}
                  className={`whitespace-nowrap px-4 py-2.5 rounded-lg font-medium transition-all ${
                    filterService === service 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {service === 'All' ? 'Todos' : service}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                Bandeja de Entrada
                {codes.some(c => c.status === 'new') && (
                   <span className="flex h-3 w-3 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                   </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                {codes.length > 0 && (
                  showClearConfirm ? (
                    <div className="flex items-center gap-2 animate-fade-in-down">
                      <span className="text-sm text-gray-600 dark:text-gray-300">¿Seguro?</span>
                      <button 
                        onClick={() => handleClearAll()} 
                        className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                      >
                        Sí, limpiar BD
                      </button>
                      <button 
                        onClick={() => setShowClearConfirm(false)} 
                        className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-md font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowClearConfirm(true)} 
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors" 
                      title="Limpiar todos los códigos de la Nube"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Limpiar BD</span>
                    </button>
                  )
                )}
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full">
                  {filteredCodes.length} registros
                </span>
              </div>
            </div>
            
            {filteredCodes.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <Mail className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-lg font-medium">Bandeja Vacía</p>
                <p className="text-sm">Conectado a tu Firebase. Esperando a que Make envíe códigos...</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {paginatedCodes.map((item) => {
                    const cleanCode = item.code ? item.code.replace(/\s+/g, '') : null;
                    const displayEmail = getDisplayEmail(item);

                    return (
                    <div key={item.id} className={`p-4 sm:p-6 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${item.status === 'new' ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/80'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        item.service === 'Netflix' ? 'bg-red-50 dark:bg-red-500/10' : 
                        item.service === 'Disney+' ? 'bg-blue-50 dark:bg-blue-500/10' : 
                        item.service === 'HBO' ? 'bg-purple-50 dark:bg-purple-500/10' : 
                        item.service === 'Hotmail' ? 'bg-cyan-50 dark:bg-cyan-500/10' : 'bg-gray-100 dark:bg-slate-700'
                      }`}>
                        {getServiceIcon(item.service)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-white">{item.service}</h3>
                          {item.status === 'new' && (
                            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Nuevo</span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{displayEmail}</p>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400 dark:text-gray-500">{item.time}</p>
                          {item.type === 'link' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                              Enlace de acceso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {item.type === 'link' ? (
                        <a 
                          href={getDisplayUrl(item)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => markAsRead(item.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir Enlace
                        </a>
                      ) : (
                        <>
                          <div className="bg-gray-100 dark:bg-slate-900/50 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 font-mono text-xl font-bold tracking-widest text-gray-800 dark:text-gray-100 flex-1 sm:flex-none text-center">
                            {cleanCode}
                          </div>
                          <button 
                            onClick={() => copyToClipboard(cleanCode, item.id)}
                            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow active:scale-95 hover:bg-gray-50 dark:hover:bg-slate-700"
                          >
                            Copiar
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                  )})}
                </div>
                
              {totalPages > 1 && (
                <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-slate-800/50">
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Mostrando {Math.min(currentPage * itemsPerPage, filteredCodes.length)} de {filteredCodes.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium px-2">
                      Página {currentPage}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
