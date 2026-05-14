import { useEffect, useMemo, useRef, useState } from "react"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8010"

function formatDate(value) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString("pt-BR")
}

function formatDateTime(value) {
  if (!value) return "-"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString("pt-BR")
}

function formatTime(value) {
  const text = String(value || "").trim()

  if (!text) return "-"

  if (/^\d{4}$/.test(text)) {
    return `${text.slice(0, 2)}:${text.slice(2, 4)}`
  }

  return text
}

function boolText(value) {
  return value ? "Sim" : "Não"
}

function activeDays(row) {
  const days = []

  if (row.is_monday) days.push("SEG")
  if (row.is_tuesday) days.push("TER")
  if (row.is_wednesday) days.push("QUA")
  if (row.is_thursday) days.push("QUI")
  if (row.is_friday) days.push("SEX")
  if (row.is_saturday) days.push("SÁB")
  if (row.is_sunday) days.push("DOM")

  return days.length ? days.join(" ") : "-"
}

export default function App() {
  const fileInputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [status, setStatus] = useState(null)
  const [flights, setFlights] = useState([])
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingFlights, setLoadingFlights] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [limit, setLimit] = useState(50000)

  async function loadStatus() {
    setLoadingStatus(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/api/status`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Erro ao buscar status")
      }

      setStatus(data)
    } catch (err) {
      setError(err.message || "Erro ao buscar status")
    } finally {
      setLoadingStatus(false)
    }
  }

  async function loadFlights() {
    setLoadingFlights(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/api/flights?limit=${limit}`)
      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Erro ao buscar voos")
      }

      setFlights(Array.isArray(data.data) ? data.data : [])
    } catch (err) {
      setError(err.message || "Erro ao buscar voos")
    } finally {
      setLoadingFlights(false)
    }
  }

  async function refreshAll() {
    await Promise.all([loadStatus(), loadFlights()])
  }

  async function handleUpload(event) {
    event.preventDefault()

    if (!file) {
      setError("Selecione um arquivo CSV")
      return
    }

    const formData = new FormData()
    formData.append("file", file)

    setUploading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Erro ao importar CSV")
      }

      setMessage(
        `CSV importado com sucesso. Voos: ${data.totalFlights}. Linhas lidas: ${data.totalLines}. Ignoradas: ${data.totalIgnored}.`
      )

      setFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      await refreshAll()
    } catch (err) {
      setError(err.message || "Erro ao importar CSV")
    } finally {
      setUploading(false)
    }
  }

  const filteredFlights = useMemo(() => {
    const term = search.trim().toUpperCase()

    if (!term) {
      return flights
    }

    return flights.filter((flight) => {
      const haystack = [
        flight.flight_number,
        flight.equipment,
        flight.departure,
        flight.arrival,
        flight.eobt,
        flight.speed,
        flight.flight_level,
        flight.route,
        flight.eet,
        flight.remarks
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase()

      return haystack.includes(term)
    })
  }, [flights, search])

  useEffect(() => {
    refreshAll()
  }, [])

  return (
    <main className="page">
      <section className="header">
        <div>
          <h1>Importador RPL</h1>
          <p>Upload de CSV direto para o Postgres</p>
        </div>

        <button className="secondary-button" type="button" onClick={refreshAll}>
          Atualizar
        </button>
      </section>

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <section className="grid">
        <div className="card">
          <h2>Upload do CSV</h2>

          <form onSubmit={handleUpload} className="upload-form">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />

            <button type="submit" disabled={uploading}>
              {uploading ? "Importando..." : "Importar CSV"}
            </button>
          </form>

          <div className="hint">
            Ao importar, o backend apaga os dados atuais e grava o novo CSV no banco.
          </div>
        </div>

        <div className="card">
          <h2>Status</h2>

          {loadingStatus ? (
            <p>Carregando status...</p>
          ) : (
            <div className="status-list">
              <div>
                <span>Total de voos</span>
                <strong>{status?.totalFlights ?? 0}</strong>
              </div>

              <div>
                <span>Último arquivo</span>
                <strong>{status?.lastImport?.filename || "-"}</strong>
              </div>

              <div>
                <span>Linhas lidas</span>
                <strong>{status?.lastImport?.totalLines ?? "-"}</strong>
              </div>

              <div>
                <span>Linhas ignoradas</span>
                <strong>{status?.lastImport?.totalIgnored ?? "-"}</strong>
              </div>

              <div>
                <span>Importado em</span>
                <strong>{formatDateTime(status?.lastImport?.importedAt)}</strong>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card table-card">
        <div className="table-header">
          <div>
            <h2>Voos importados</h2>
            <p>
              Mostrando {filteredFlights.length} de {flights.length}
            </p>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Buscar voo, origem, destino, rota..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
            >
              <option value={1000}>1.000</option>
              <option value={5000}>5.000</option>
              <option value={10000}>10.000</option>
              <option value={50000}>50.000</option>
            </select>

            <button type="button" onClick={loadFlights}>
              Buscar
            </button>
          </div>
        </div>

        {loadingFlights ? (
          <div className="loading">Carregando voos...</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Voo</th>
                  <th>Equip.</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Dias</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>EOBT</th>
                  <th>Vel.</th>
                  <th>Nível</th>
                  <th>EET</th>
                  <th>Rota</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="empty">
                      Nenhum voo encontrado
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map((flight) => (
                    <tr key={flight.id}>
                      <td className="strong">{flight.flight_number}</td>
                      <td>{flight.equipment || "-"}</td>
                      <td>{formatDate(flight.start_date)}</td>
                      <td>{formatDate(flight.end_date)}</td>
                      <td>{activeDays(flight)}</td>
                      <td>{flight.departure}</td>
                      <td>{flight.arrival}</td>
                      <td>{formatTime(flight.eobt)}</td>
                      <td>{flight.speed || "-"}</td>
                      <td>{flight.flight_level || "-"}</td>
                      <td>{formatTime(flight.eet)}</td>
                      <td className="route-cell">{flight.route || "-"}</td>
                      <td className="remarks-cell">{flight.remarks || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}