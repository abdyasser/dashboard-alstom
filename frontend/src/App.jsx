import React, { useState } from 'react'
import axios from 'axios'
import Dashboard from './Dashboard'
import { UploadCloud, Loader2, Info } from 'lucide-react'

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

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

  if (items.length > 0) {
    return <Dashboard items={items} onReset={() => setItems([])} onAddFiles={handleAppendFiles} onRemoveFile={handleRemoveFile} />
  }

  return (
    <div className="upload-screen">
      <div className="alstom-header">
        <h1>ALSTOM</h1>
      </div>
      <div className="upload-container">
        <p>Drag and drop your IMFU files to generate your interactive dashboard.</p>
        
        <div className="upload-box">
          {loading ? (
            <div className="loader-box">
              <Loader2 className="spinner" size={48} />
              <p>Analyzing and structuring data...</p>
            </div>
          ) : (
            <>
              <UploadCloud size={64} className="upload-icon" />
              <h3>Select your Excel files</h3>
              <p className="subtitle">Accepted formats: .xlsx</p>
              <input type="file" multiple accept=".xlsx" onChange={handleFileUpload} id="file-upload" />
              <label htmlFor="file-upload" className="btn-primary">Browse files</label>
            </>
          )}
        </div>
        
        <div className="info-box">
          <Info size={20} />
          <span>The intelligent engine automatically detects your IMFU file structure and normalizes the indicators.</span>
        </div>
      </div>
    </div>
  )
}

export default App
