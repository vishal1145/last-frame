import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Legal from './components/Legal.jsx'
import './styles.css'

document.documentElement.classList.add('js')
// terms.html and privacy.html set data-page; every other page is the landing page
const { page } = document.body.dataset
createRoot(document.getElementById('root')).render(page ? <Legal page={page} /> : <App />)
