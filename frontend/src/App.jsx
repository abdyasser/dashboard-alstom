import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Dashboard from './Dashboard'
import { UploadCloud, Loader2, Info, FolderSync } from 'lucide-react'

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [sharedFolder, setSharedFolder] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [usingSharedFolder, setUsingSharedFolder] = useState(false)

  useEffect(() => {
    // Check config on load
    axios.get('/api/config').then(res => {
      if (res.data && res.data.shared_folder) {
        setSharedFolder(res.data.shared_folder)
        handleSync(res.data.shared_folder)
      }
    }).catch(err => console.error("Config load error:", err))
    
    window.onFolderDropped = (path) => {
      setSharedFolder(path);
    };
    
    return () => {
      delete window.onFolderDropped;
    }
  }, [])

  const handleSync = async (folderPath = sharedFolder) => {
    if (!folderPath) return
    setIsSyncing(true)
    try {
      const res = await axios.get('/api/sync')
      if (res.data.items && res.data.items.length > 0) {
        setItems(res.data.items)
        setUsingSharedFolder(true)
      } else {
        alert("Le dossier est vide ou ne contient aucun fichier valide.")
      }
      if (res.data.errors && res.data.errors.length > 0) {
        alert("Certains fichiers ont échoué:\\n" + res.data.errors.join("\\n"))
      }
    } catch (err) {
      console.error(err)
      if (err.response && err.response.data && err.response.data.message) {
        alert(err.response.data.message)
      } else {
        alert("Erreur de synchronisation du dossier réseau.")
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveAndSync = async () => {
    try {
      await axios.post('/api/config', { shared_folder: sharedFolder })
      if (sharedFolder.trim() !== '') {
        handleSync(sharedFolder)
      } else {
        setUsingSharedFolder(false)
        alert("Configuration du dossier effacée.")
      }
    } catch (err) {
      alert("Erreur lors de la sauvegarde de la configuration.")
    }
  }

  const handlePickSharedFolder = async () => {
    if (window.pywebview && window.pywebview.api) {
      try {
        const folder = await window.pywebview.api.select_folder();
        if (folder) {
          setSharedFolder(folder);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      alert("La sélection de dossier native n'est pas disponible dans ce contexte.");
    }
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files.length) return
    
    setLoading(true)
    const formData = new FormData()
    for(let i=0; i<files.length; i++) {
      formData.append('files', files[i])
    }
    
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setItems(res.data.items)
    } catch (err) {
      console.error(err)
      if (err.response && err.response.data && err.response.data.errors) {
        alert(err.response.data.errors.join("\\n"))
        if (err.response.data.items) {
          setItems(err.response.data.items)
        }
      } else {
        alert("Erreur de connexion ou fichier non reconnu.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAppendFiles = async (e) => {
    const files = e.target.files
    if (!files.length) return
    
    const formData = new FormData()
    for(let i=0; i<files.length; i++) {
      formData.append('files', files[i])
    }
    
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      // Append the new items to the existing items
      setItems(prevItems => [...prevItems, ...res.data.items])
    } catch (err) {
      console.error(err)
      if (err.response && err.response.data && err.response.data.errors) {
        alert(err.response.data.errors.join("\\n"))
        if (err.response.data.items && err.response.data.items.length > 0) {
          setItems(prevItems => [...prevItems, ...err.response.data.items])
        }
      } else {
        alert("Erreur de connexion ou fichier non reconnu.")
      }
    }
  }

  const handleRemoveFile = (filename) => {
    setItems(prevItems => prevItems.filter(item => item.source_file !== filename));
  }

  const handleForceRefresh = () => {
    if (usingSharedFolder) {
      handleSync()
    }
  }

  if (items.length > 0) {
    return (
      <Dashboard 
        items={items} 
        onReset={() => setItems([])} 
        onAddFiles={handleAppendFiles} 
        onRemoveFile={handleRemoveFile}
        onRefresh={usingSharedFolder ? handleForceRefresh : null}
        isSyncing={isSyncing}
        sharedFolder={usingSharedFolder ? sharedFolder : null}
      />
    )
  }

  return (
    <div className="upload-screen">
      <div className="alstom-header">
        <h1>ALSTOM</h1>
      </div>
      <div className="upload-container">
        <p>Drag and drop your IMFU files to generate your interactive dashboard.</p>
        
        <div className="upload-box" style={{padding: '3rem'}}>
          {loading || isSyncing ? (
            <div className="loader-box">
              <Loader2 className="spinner" size={48} />
              <p>{isSyncing ? 'Synchronisation du dossier réseau...' : 'Analyzing and structuring data...'}</p>
            </div>
          ) : (
            <>
              <UploadCloud size={64} className="upload-icon" />
              <h3>Glisser ou sélectionner vos fichiers</h3>
              <p className="subtitle">Formats acceptés : .xlsx, .xls, .csv</p>
              <input type="file" multiple accept=".xlsx,.xls,.csv" onChange={handleFileUpload} id="file-upload" />
              <label htmlFor="file-upload" className="btn-primary">Parcourir</label>
            </>
          )}
        </div>

        {!loading && !isSyncing && (
          <div className="upload-box" style={{marginTop: '2rem', padding: '2rem', background: 'rgba(255,255,255,0.4)'}}>
            <FolderSync size={32} style={{color: 'var(--blue-acc)', marginBottom: '1rem'}} />
            <h3 style={{fontSize: '1.2rem', marginBottom: '0.5rem'}}>Dossier Réseau Partagé</h3>
            <p className="subtitle" style={{marginBottom: '1rem', fontSize: '0.9rem'}}>Cliquez sur "Parcourir" pour sélectionner le dossier, ou saisissez-le manuellement.</p>
            
            <div style={{display: 'flex', gap: '10px', width: '100%', maxWidth: '500px'}}>
              <input 
                type="text" 
                value={sharedFolder} 
                onChange={e => setSharedFolder(e.target.value)} 
                placeholder="Ex: /Users/Shared/Equipe_IMFU" 
                style={{flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--white)', outline: 'none'}} 
              />
              <button className="btn-secondary" style={{padding: '0.8rem 1rem', background: '#e2e8f0', color: '#1e293b', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold'}} onClick={handlePickSharedFolder} title="Parcourir les dossiers">📁 Parcourir</button>
              <button className="btn-primary" style={{padding: '0.8rem 1.5rem'}} onClick={handleSaveAndSync}>Connecter</button>
            </div>
          </div>
        )}
        
        <div className="info-box">
          <Info size={20} />
          <span>The intelligent engine automatically detects your IMFU file structure and normalizes the indicators.</span>
        </div>
      </div>
      
      <div style={{textAlign: 'center', marginTop: 'auto', paddingBottom: '20px', color: 'var(--text-light)', fontSize: '0.9rem', opacity: 0.8}}>
        © {new Date().getFullYear()} ALSTOM - Developed by Yasser Abdelmoumen
      </div>
    </div>
  )
}

export default App
