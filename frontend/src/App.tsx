import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Category = { id: number; nombre: string }
type Grave = {
  id: number
  nombrePlanta: string
  epitafio: string
  fechaFallecimiento: string
  fechaPublicacion: string
  autor: string
  categoriaId: number
  causaMuerte: string
  fotoUrl: string
  coronasCount: number
}
type View = 'cementerio' | 'ranking' | 'publicar' | 'perfil' | 'categorias'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const sampleCategories: Category[] = [{ id: 1, nombre: 'Descuido' }, { id: 2, nombre: 'Exceso de cariño' }]
const sampleGraves: Grave[] = [
  { id: 1, nombrePlanta: 'Cactusus Maximus', epitafio: 'Vivió con sed, murió con dignidad.', fechaFallecimiento: '2024-05-14', fechaPublicacion: '2024-05-15', autor: 'Rosa Verde', categoriaId: 1, causaMuerte: 'Exceso de cariño', fotoUrl: '', coronasCount: 12 },
  { id: 2, nombrePlanta: 'Fernanda', epitafio: 'Aquí yace quien nunca recibió suficiente luz.', fechaFallecimiento: '2024-06-02', fechaPublicacion: '2024-06-03', autor: 'Tito Maceta', categoriaId: 2, causaMuerte: 'Falta de sol', fotoUrl: '', coronasCount: 8 },
]

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options })
  if (!response.ok) throw new Error('La API no está disponible')
  return response.json()
}

function App() {
  const [view, setView] = useState<View>('cementerio')
  const [graves, setGraves] = useState<Grave[]>(sampleGraves)
  const [categories, setCategories] = useState<Category[]>(sampleCategories)
  const [selected, setSelected] = useState<Grave | null>(null)
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([request<Grave[]>('/lapidas'), request<Category[]>('/categorias')])
      .then(([loadedGraves, loadedCategories]) => { setGraves(loadedGraves); setCategories(loadedCategories) })
      .catch(() => setNotice('Modo demostración: inicia el backend para guardar los cambios.'))
  }, [])

  const filteredGraves = useMemo(() => graves.filter((grave) =>
    `${grave.nombrePlanta} ${grave.autor}`.toLowerCase().includes(search.toLowerCase())), [graves, search])

  function openGrave(grave: Grave) { setSelected(grave); setNotice('') }

  async function giveCorona(grave: Grave) {
    const updated = { ...grave, coronasCount: grave.coronasCount + 1 }
    setGraves((items) => items.map((item) => item.id === grave.id ? updated : item))
    setSelected(updated)
    try { await request(`/lapidas/${grave.id}/corona`, { method: 'POST' }) } catch { /* local demo remains usable */ }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>
    const draft: Grave = {
      id: Math.max(0, ...graves.map((item) => item.id)) + 1,
      nombrePlanta: data.nombrePlanta, epitafio: data.epitafio, fechaFallecimiento: data.fechaFallecimiento,
      fechaPublicacion: new Date().toISOString().slice(0, 10), autor: 'Tú', categoriaId: Number(data.categoriaId),
      causaMuerte: data.causaMuerte, fotoUrl: data.fotoUrl || '', coronasCount: 0,
    }
    try {
      const { fotoUrl, ...requiredData } = data
      const payload = {
        ...requiredData,
        categoriaId: Number(data.categoriaId),
        ...(fotoUrl ? { fotoUrl } : {}),
      }
      const created = await request<Grave>('/lapidas', { method: 'POST', body: JSON.stringify(payload) })
      setGraves((items) => [created, ...items])
    } catch { setGraves((items) => [draft, ...items]) }
    setNotice('Tu lápida fue publicada en el cementerio.')
    setView('cementerio')
    event.currentTarget.reset()
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = categoryName.trim()
    if (name.length < 3) { setNotice('La categoría debe tener al menos 3 caracteres.'); return }
    if (editingCategoryId !== null) {
      setCategories((items) => items.map((item) => item.id === editingCategoryId ? { ...item, nombre: name } : item))
      try { await request(`/categorias/${editingCategoryId}`, { method: 'PUT', body: JSON.stringify({ nombre: name }) }) } catch { /* local demo remains usable */ }
      setEditingCategoryId(null)
      setCategoryName('')
      setNotice('Categoría actualizada.')
      return
    }
    const draft = { id: Math.max(0, ...categories.map((item) => item.id)) + 1, nombre: name }
    try {
      const created = await request<Category>('/categorias', { method: 'POST', body: JSON.stringify({ nombre: name }) })
      setCategories((items) => [...items, created])
    } catch { setCategories((items) => [...items, draft]) }
    setCategoryName('')
    setNotice('Categoría agregada.')
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(`¿Eliminar "${category.nombre}"?`)) return
    setCategories((items) => items.filter((item) => item.id !== category.id))
    try { await request(`/categorias/${category.id}`, { method: 'DELETE' }) } catch { /* local demo remains usable */ }
  }

  const categoryLabel = (id: number) => categories.find((item) => item.id === id)?.nombre || 'Sin categoría'

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('cementerio')}><span>✦</span> R.I.PLANTA</button>
        <nav>{(['cementerio', 'ranking', 'publicar', 'perfil', 'categorias'] as View[]).map((item) => (
          <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>
            {item === 'cementerio' ? 'Cementerio' : item === 'ranking' ? 'Rankings' : item === 'publicar' ? '+ Publicar' : item === 'perfil' ? 'Mi perfil' : 'Categorías'}
          </button>
        ))}</nav>
        <span className="user-chip">🌱 jardinero</span>
      </header>

      {notice && <div className="notice">{notice}<button onClick={() => setNotice('')}>×</button></div>}

      <main>
        {view === 'cementerio' && <section>
          <div className="page-heading"><div><p className="eyebrow">JARDÍN MEMORIAL · {graves.length} LÁPIDAS</p><h1>Cementerio de plantas</h1><p className="subtitle">Un pequeño homenaje a quienes dieron todo por nosotros.</p></div><button className="primary" onClick={() => setView('publicar')}>+ Plantar una lápida</button></div>
          <input className="search" placeholder="⌕  Buscar una planta o jardinero..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="grave-grid">{filteredGraves.map((grave) => <GraveCard key={grave.id} grave={grave} category={categoryLabel(grave.categoriaId)} onOpen={() => openGrave(grave)} onCorona={() => giveCorona(grave)} />)}</div>
          {!filteredGraves.length && <div className="empty">No encontramos plantas con ese nombre.</div>}
        </section>}

        {view === 'ranking' && <section><div className="page-heading"><div><p className="eyebrow">LA FAMA ES ETERNA</p><h1>Salón del honor</h1><p className="subtitle">Las plantas más recordadas del cementerio.</p></div></div><div className="ranking-layout"><Ranking title="👑 Más coronadas" items={[...graves].sort((a, b) => b.coronasCount - a.coronasCount)} metric={(item) => `${item.coronasCount} coronas`} /><Ranking title="☠ Asesinos seriales" items={graves} metric={(item) => item.autor} /></div></section>}

        {view === 'publicar' && <section className="form-page"><p className="eyebrow">NUEVO HOMENAJE</p><h1>Publicar una lápida</h1><p className="subtitle">Cuéntanos cómo fue la vida de esa pequeña guerrera.</p><form onSubmit={publish} className="grave-form"><label>Nombre de la planta<input name="nombrePlanta" required maxLength={40} placeholder="Ej. Cactusus Maximus" /></label><label>Fecha de fallecimiento<input type="date" name="fechaFallecimiento" required /></label><label>Categoría<select name="categoriaId" required defaultValue=""><option value="" disabled>Elige una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label><label>Causa de muerte<input name="causaMuerte" required maxLength={80} placeholder="Exceso de agua, olvido..." /></label><label>Foto (opcional)<input type="url" name="fotoUrl" placeholder="https://..." /></label><label className="full">Epitafio<textarea name="epitafio" required maxLength={280} placeholder="Siempre te recordaremos..." /></label><div className="full form-actions"><button type="button" className="secondary" onClick={() => setView('cementerio')}>Cancelar</button><button className="primary">Publicar lápida</button></div></form></section>}

        {view === 'perfil' && <section><div className="profile-hero"><div className="avatar">🌿</div><div><p className="eyebrow">PERFIL DE JARDINERO</p><h1>jardinero</h1><p className="subtitle">Cultivando recuerdos desde 2024.</p></div></div><div className="stats"><div><strong>{graves.filter((grave) => grave.autor === 'Tú').length}</strong><span>plantas asesinadas</span></div><div><strong>{graves.reduce((sum, grave) => sum + grave.coronasCount, 0)}</strong><span>coronas en el jardín</span></div><div><strong>🌱</strong><span>superviviente zombie</span></div></div><h2>Mi cementerio</h2><div className="grave-grid">{graves.filter((grave) => grave.autor === 'Tú').map((grave) => <GraveCard key={grave.id} grave={grave} category={categoryLabel(grave.categoriaId)} onOpen={() => openGrave(grave)} onCorona={() => giveCorona(grave)} />)}{!graves.some((grave) => grave.autor === 'Tú') && <div className="empty">Todavía no has publicado ninguna lápida.</div>}</div></section>}

        {view === 'categorias' && <section className="categories-page"><p className="eyebrow">ADMINISTRACIÓN</p><h1>Categorías</h1><p className="subtitle">Organiza las causas y tipos de muerte del jardín.</p><form className="category-form" onSubmit={addCategory}><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder={editingCategoryId === null ? 'Nueva categoría' : 'Editar categoría'} maxLength={20} /><button className="primary">{editingCategoryId === null ? 'Agregar' : 'Guardar'}</button>{editingCategoryId !== null && <button type="button" className="secondary" onClick={() => { setEditingCategoryId(null); setCategoryName('') }}>Cancelar</button>}</form><div className="category-list">{categories.map((category) => <div className="category-row" key={category.id}><span>🏷️ {category.nombre}</span><span><button onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.nombre) }}>Editar</button><button onClick={() => removeCategory(category)}>Eliminar</button></span></div>)}</div></section>}
      </main>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><article className="detail-modal" onClick={(event) => event.stopPropagation()}><button className="close" onClick={() => setSelected(null)}>×</button><div className="tombstone big">✦<small>R.I.P.</small></div><p className="eyebrow">{categoryLabel(selected.categoriaId)} · {selected.fechaFallecimiento}</p><h2>{selected.nombrePlanta}</h2><p className="epitaph">“{selected.epitafio}”</p><p className="muted">Plantada por <b>{selected.autor}</b> · Causa: {selected.causaMuerte}</p><button className="primary corona-button" onClick={() => giveCorona(selected)}>👑 Dar corona · {selected.coronasCount}</button></article></div>}
    </div>
  )
}

function GraveCard({ grave, category, onOpen, onCorona }: { grave: Grave; category: string; onOpen: () => void; onCorona: () => void }) {
  return <article className="grave-card"><button className="grave-open" onClick={onOpen}><div className="tombstone">✦<small>R.I.P.</small></div><div className="grave-info"><span className="tag">{category}</span><h2>{grave.nombrePlanta}</h2><p>“{grave.epitafio}”</p><span className="muted">{grave.autor} · {grave.fechaFallecimiento}</span></div></button><div className="card-footer"><span>☠ {grave.causaMuerte}</span><button onClick={onCorona}>👑 {grave.coronasCount}</button></div></article>
}

function Ranking({ title, items, metric }: { title: string; items: Grave[]; metric: (item: Grave) => string }) {
  return <div className="ranking-card"><h2>{title}</h2>{items.slice(0, 5).map((item, index) => <div className="rank-row" key={item.id}><strong>0{index + 1}</strong><div><b>{item.nombrePlanta}</b><span>{item.autor}</span></div><em>{metric(item)}</em></div>)}</div>
}

export default App
